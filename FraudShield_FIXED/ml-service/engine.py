"""Persistent predictions, human-confirmed feedback, drift and gated batch learning."""
import hashlib
import json
import re
import sqlite3
import threading
import time
import uuid
from contextlib import contextmanager
from pathlib import Path

import numpy as np
from scipy.stats import ks_2samp
from sklearn.model_selection import train_test_split
from model import (FEATURES, enough, fit_model, load_active, metrics, predict,
                   save_bundle, activate, vector)


class Engine:
    def __init__(self, artifacts="artifacts", state="state"):
        self.artifacts = Path(artifacts)
        self.state = Path(state)
        self.state.mkdir(parents=True, exist_ok=True)
        self.db_path = self.state / "events.sqlite3"
        self.lock = threading.RLock()
        self.train_lock = threading.Lock()
        self.bundle = load_active(self.artifacts)
        with self.db() as db:
            db.executescript('''
                PRAGMA journal_mode=WAL;
                CREATE TABLE IF NOT EXISTS predictions (
                    id TEXT PRIMARY KEY, created REAL NOT NULL, identity_key TEXT NOT NULL,
                    device_key TEXT, request_hash TEXT NOT NULL, features TEXT NOT NULL,
                    result TEXT NOT NULL);
                CREATE INDEX IF NOT EXISTS history_identity ON predictions(identity_key,created);
                CREATE INDEX IF NOT EXISTS history_device ON predictions(device_key,created);
                CREATE TABLE IF NOT EXISTS feedback (
                    seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT UNIQUE NOT NULL,
                    label INTEGER NOT NULL CHECK(label IN (0,1)), reviewer TEXT NOT NULL,
                    evidence TEXT NOT NULL, source TEXT NOT NULL, created REAL NOT NULL,
                    FOREIGN KEY(id) REFERENCES predictions(id));
                CREATE TABLE IF NOT EXISTS training_runs (
                    version TEXT PRIMARY KEY, created REAL NOT NULL, report TEXT NOT NULL);
            ''')

    @contextmanager
    def db(self):
        db = sqlite3.connect(self.db_path, timeout=30)
        db.execute("PRAGMA foreign_keys=ON")
        db.row_factory = sqlite3.Row
        try:
            with db:
                yield db
        finally:
            db.close()

    @staticmethod
    def key(value, name):
        if not isinstance(value, str) or not re.fullmatch(r"[a-f0-9]{64}", value):
            raise ValueError(name + " must be a server-generated HMAC SHA-256 hex token")
        return value

    def score(self, request):
        if not isinstance(request, dict) or set(request)-{"requestId","identityKey","deviceKey","telemetry"}:
            raise ValueError("Unknown scoring fields")
        rid = request.get("requestId")
        if not isinstance(rid,str) or not re.fullmatch(r"[A-Za-z0-9_-]{1,100}",rid):
            raise ValueError("requestId must be 1-100 letters, digits, underscores or hyphens")
        identity = self.key(request.get("identityKey"), "identityKey")
        device = request.get("deviceKey")
        if device is not None:
            self.key(device,"deviceKey")
        telemetry = request.get("telemetry", {})
        allowed = {"deviceUnknown","locationRisk","sessionSeconds","failedLogins24h","ipChanged"}
        if not isinstance(telemetry,dict) or set(telemetry)-allowed:
            raise ValueError("Only trusted telemetry fields may be submitted")
        vector(telemetry)
        digest = hashlib.sha256(json.dumps(request,sort_keys=True).encode()).hexdigest()
        # One transaction makes retries idempotent and history counts race-safe.
        with self.lock, self.db() as db:
            db.execute("BEGIN IMMEDIATE")
            old = db.execute("SELECT * FROM predictions WHERE id=?",(rid,)).fetchone()
            if old:
                if old["request_hash"] != digest:
                    raise ValueError("requestId already used for another payload")
                return json.loads(old["result"])
            now = time.time()
            count = db.execute("SELECT count(*) FROM predictions WHERE identity_key=? AND created>?",
                               (identity,now-86400)).fetchone()[0]
            distinct = None
            if device:
                distinct = db.execute('''SELECT count(DISTINCT identity_key) FROM predictions
                    WHERE device_key=? AND created>? AND identity_key<>?''',
                    (device,now-86400,identity)).fetchone()[0]+1
            features = dict(telemetry, identityApplications24h=min(count,10000),
                            deviceIdentities24h=min(distinct,10000) if distinct is not None else None)
            x = vector(features)
            result = dict(predict(self.bundle,x),requestId=rid)
            db.execute("INSERT INTO predictions VALUES (?,?,?,?,?,?,?)",
                (rid,now,identity,device,digest,json.dumps(x.tolist()),json.dumps(result)))
            return result

    def feedback(self, request):
        required = {"requestId","label","reviewer","evidence","source"}
        if not isinstance(request,dict) or set(request) != required:
            raise ValueError("Required feedback fields: " + ", ".join(sorted(required)))
        if type(request["label"]) is not int or request["label"] not in (0,1):
            raise ValueError("label must be integer 0 (confirmed legitimate) or 1 (confirmed fraud)")
        if request["source"] not in {"analyst_verified","confirmed_investigation"}:
            raise ValueError("Only verified outcomes may train the model")
        for key in ("requestId","reviewer","evidence"):
            if not isinstance(request[key],str) or not 1 <= len(request[key].strip()) <= 500:
                raise ValueError("Invalid feedback " + key)
        with self.db() as db:
            if not db.execute("SELECT 1 FROM predictions WHERE id=?",(request["requestId"],)).fetchone():
                raise ValueError("Unknown prediction")
            old = db.execute("SELECT * FROM feedback WHERE id=?",(request["requestId"],)).fetchone()
            if old:
                if any(old[k] != request[k] for k in ("label","reviewer","evidence","source")):
                    raise ValueError("Feedback is immutable; conflicting correction needs audited data repair")
                return {"status":"already_recorded"}
            db.execute("INSERT INTO feedback(id,label,reviewer,evidence,source,created) VALUES(?,?,?,?,?,?)",
                tuple(request[k] for k in ("requestId","label","reviewer","evidence","source"))+(time.time(),))
        return {"status":"recorded"}

    def drift(self):
        with self.db() as db:
            rows = db.execute("SELECT features FROM predictions ORDER BY created DESC LIMIT 500").fetchall()
        if len(rows) < 200:
            return {"status":"insufficient_traffic","observations":len(rows)}
        current = np.array([json.loads(r[0]) for r in rows])
        with self.lock:
            reference = self.bundle["reference"]
        shifted = []
        for i,name in enumerate(FEATURES):
            stat = ks_2samp(reference[:,i],current[:,i])
            if stat.statistic > .15 and stat.pvalue < .01/len(FEATURES):
                shifted.append(name)
        return {"status":"drift_detected" if shifted else "stable", "features":shifted,
                "observations":len(rows),"action":"Collect and verify outcomes; drift does not prove fraud"}

    def retrain(self):
        if not self.train_lock.acquire(blocking=False):
            return {"status":"already_running"}
        try:
            return self._retrain()
        finally:
            self.train_lock.release()

    def _retrain(self):
        with self.lock:
            champion = self.bundle
        with self.db() as db:
            rows = db.execute('''SELECT f.*,p.features,p.identity_key FROM feedback f
                JOIN predictions p ON p.id=f.id ORDER BY f.seq''').fetchall()
        fresh = [r for r in rows if r["seq"] > champion.get("feedback_watermark",0)]
        if len(fresh) < 200:
            return {"status":"waiting_for_feedback","new_labels":len(fresh),"required":200}
        # Stable identity split: audit identities can NEVER enter fitting/calibration/tuning.
        fit_rows = [r for r in rows if int(r["identity_key"],16)%4 != 0]
        audit_rows = list({r["identity_key"]:r for r in fresh if int(r["identity_key"],16)%4 == 0}.values())
        def arrays(items):
            return np.array([json.loads(r["features"]) for r in items]), np.array([r["label"] for r in items])
        fx,fy = arrays(fit_rows)
        ax,ay = arrays(audit_rows)
        if not enough(fy,20) or not enough(ay,10):
            return {"status":"insufficient_label_diversity","fit":len(fy),"fresh_audit":len(ay)}
        # Split feedback by identity before row materialization to avoid identity leakage.
        groups = sorted({r["identity_key"] for r in fit_rows})
        rng = np.random.default_rng(42)
        rng.shuffle(groups)
        group_sets = [set(groups[:int(.6*len(groups))]),
                      set(groups[int(.6*len(groups)):int(.8*len(groups))]),
                      set(groups[int(.8*len(groups)):])]
        splits = [arrays([r for r in fit_rows if r["identity_key"] in g]) for g in group_sets]
        if any(not enough(y,5) for _,y in splits):
            return {"status":"insufficient_group_diversity"}
        replay = np.load(self.artifacts/"replay.npz")
        rx,ry = replay["x"],replay["y"]
        # Bound replay size so recent verified feedback can influence learned patterns.
        idx = rng.choice(len(ry),min(len(ry),max(1000,4*len(fy))),replace=False)
        tr,rest = train_test_split(idx,test_size=.4,stratify=ry[idx],random_state=42)
        ca,tu = train_test_split(rest,test_size=.5,stratify=ry[rest],random_state=42)
        combined = [(np.vstack([rx[ids],sx]),np.r_[ry[ids],sy])
                    for ids,(sx,sy) in zip((tr,ca,tu),splits)]
        candidate = fit_model(*[v for pair in combined for v in pair])
        version = "feedback-" + uuid.uuid4().hex[:12]
        candidate.update(version=version,demo=champion["demo"],feedback_watermark=max(r["seq"] for r in rows))
        anchor = np.load(self.artifacts/"anchor.npz")
        old = metrics(champion,ax,ay)
        new = metrics(candidate,ax,ay)
        old_anchor = metrics(champion,anchor["x"],anchor["y"])
        new_anchor = metrics(candidate,anchor["x"],anchor["y"])
        checks = {
            "fresh_fpr_cap": new["false_positive_rate"] <= .03,
            "fresh_fpr_uncertainty": new["fpr_upper_95"] <= .10,
            "fresh_fpr_nonregression": new["false_positive_rate"] <= old["false_positive_rate"]+.005,
            "fresh_recall_nonregression": new["recall"] >= old["recall"],
            "anchor_fpr": new_anchor["false_positive_rate"] <= max(.03,old_anchor["false_positive_rate"]),
            "anchor_recall": new_anchor["recall"] >= old_anchor["recall"]-.02,
            "brier_nonregression": new["brier_score"] <= old["brier_score"]+.01,
            "useful_improvement": (new["recall"] > old["recall"]+.01 or
                new["false_positive_rate"] < old["false_positive_rate"]-.002 or
                new["average_precision"] > old["average_precision"]+.01)}
        report = {"version":version,"status":"promoted" if all(checks.values()) else "rejected",
            "checks":checks,"champion":old,"candidate":new,
            "champion_anchor":old_anchor,"candidate_anchor":new_anchor,
            "fresh_audit_rows":len(ay),"fit_rows":len(fy),"demoModel":candidate["demo"]}
        candidate["promotion_report"] = report
        save_bundle(candidate,self.artifacts)
        if all(checks.values()):
            with self.lock:
                activate(self.artifacts,version)
                self.bundle = candidate
        with self.db() as db:
            db.execute("INSERT INTO training_runs VALUES(?,?,?)",(version,time.time(),json.dumps(report)))
        (self.artifacts/(version+"-report.json")).write_text(json.dumps(report,indent=2))
        return report

    def status(self):
        with self.db() as db:
            counts = {name:db.execute("SELECT count(*) FROM " + name).fetchone()[0]
                      for name in ("predictions","feedback","training_runs")}
            latest = db.execute("SELECT report FROM training_runs ORDER BY created DESC LIMIT 1").fetchone()
        with self.lock:
            return dict(counts,modelVersion=self.bundle["version"],demoModel=self.bundle["demo"],
                        lastTrainingRun=json.loads(latest[0]) if latest else None,drift=self.drift())
