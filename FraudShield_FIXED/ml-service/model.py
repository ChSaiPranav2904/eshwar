"""Shared feature contract, calibrated classifier and review policy. No PII features."""
import hashlib
import json
import math
import os
from pathlib import Path

import joblib
import numpy as np
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import HistGradientBoostingClassifier, IsolationForest
from sklearn.frozen import FrozenEstimator
from sklearn.metrics import average_precision_score, brier_score_loss, confusion_matrix

FEATURES = ["deviceUnknown", "locationRisk", "identityApplications24h",
            "deviceIdentities24h", "sessionSeconds", "failedLogins24h", "ipChanged"]
LIMITS = [(0, 1), (0, 2), (0, 10000), (0, 10000), (0, 86400), (0, 10000), (0, 1)]
SCHEMA = "fraud-behaviour-v1"
TARGET_FPR = 0.03


def vector(data):
    """Missing telemetry is -1, never a fabricated observation of normal behaviour."""
    if not isinstance(data, dict) or set(data) - set(FEATURES):
        raise ValueError("features must contain only supported feature names")
    values = []
    for name, (lo, hi) in zip(FEATURES, LIMITS):
        v = data.get(name)
        if v is None or v == -1:
            values.append(-1.0)
        elif isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) or not lo <= v <= hi:
            raise ValueError("invalid feature: " + name)
        elif name != "sessionSeconds" and v != int(v):
            raise ValueError("integer required: " + name)
        else:
            values.append(float(v))
    return np.asarray(values, dtype=float)


def enough(y, minimum=10):
    return len(y) > 0 and np.sum(y == 0) >= minimum and np.sum(y == 1) >= minimum


def fit_model(train_x, train_y, cal_x, cal_y, tune_x, tune_y, seed=42):
    for labels in (train_y, cal_y, tune_y):
        if not enough(labels):
            raise ValueError("Every training/calibration/tuning partition needs >=10 of each label")
    classifier = HistGradientBoostingClassifier(max_iter=110, max_leaf_nodes=15,
        l2_regularization=4, learning_rate=0.07, random_state=seed)
    classifier.fit(train_x, train_y)
    calibrated = CalibratedClassifierCV(FrozenEstimator(classifier), method="sigmoid")
    calibrated.fit(cal_x, cal_y)
    novelty = IsolationForest(n_estimators=120, max_samples=512, random_state=seed, n_jobs=1)
    novelty.fit(train_x[train_y == 0])
    p = calibrated.predict_proba(tune_x)[:, 1]
    a = -novelty.score_samples(tune_x)
    # Reserve a small normal-review budget for anomalies. These are NOT fraud probabilities.
    anomaly_threshold = float(np.quantile(a[tune_y == 0], 0.995, method="higher"))
    best = None
    for threshold in np.r_[np.unique(p), 1.000001]:
        flagged = (p >= threshold) | (a > anomaly_threshold) | (np.sum(tune_x == -1, axis=1) >= 4)
        fpr = float(flagged[tune_y == 0].mean())
        recall = float(flagged[tune_y == 1].mean())
        rank = (recall, -fpr, float(threshold))
        if fpr <= TARGET_FPR and (best is None or rank > best[0]):
            best = (rank, float(threshold))
    if best is None:
        raise ValueError("Cannot meet validation review budget")
    return {"classifier": calibrated, "novelty": novelty, "threshold": best[1],
            "anomaly_threshold": anomaly_threshold, "schema": SCHEMA,
            "features": FEATURES, "reference": train_x[:2000].copy(), "demo": True}


def signals(bundle, x):
    p = bundle["classifier"].predict_proba(x)[:, 1]
    a = -bundle["novelty"].score_samples(x)
    return p, a, ((p >= bundle["threshold"]) | (a > bundle["anomaly_threshold"])
                  | (np.sum(x == -1, axis=1) >= 4))


def metrics(bundle, x, y):
    p, _, flagged = signals(bundle, x)
    tn, fp, fn, tp = confusion_matrix(y, flagged, labels=[0, 1]).ravel()
    n = int(tn + fp)
    rate = float(fp / max(n, 1))
    # Wilson upper 95% bound exposes uncertainty instead of promising an FPR cap.
    z = 1.96
    upper = (rate + z*z/(2*max(n, 1)) + z*np.sqrt(rate*(1-rate)/max(n, 1)
             + z*z/(4*max(n, 1)**2))) / (1+z*z/max(n, 1))
    return {"rows": len(y), "tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp),
            "false_positive_rate": rate, "fpr_upper_95": float(upper),
            "precision": float(tp/max(tp+fp, 1)), "recall": float(tp/max(tp+fn, 1)),
            "average_precision": float(average_precision_score(y, p)),
            "brier_score": float(brier_score_loss(y, p)), "review_rate": float(flagged.mean())}


def predict(bundle, x):
    p, a, flag = signals(bundle, np.asarray([x]))
    reasons = []
    if p[0] >= bundle["threshold"]:
        reasons.append("CLASSIFIER_REVIEW_THRESHOLD")
    if a[0] > bundle["anomaly_threshold"]:
        reasons.append("UNUSUAL_BEHAVIOUR_REVIEW")
    if np.sum(x == -1) >= 4:
        reasons.append("INSUFFICIENT_TELEMETRY")
    review = bool(flag[0] or "INSUFFICIENT_TELEMETRY" in reasons)
    return {"fraudProbability": round(float(p[0]), 6),
            "anomalyScore": round(float(a[0]), 6),
            "recommendation": "MANUAL_REVIEW" if review else "NO_FRAUD_ALERT",
            "reasons": reasons, "modelVersion": bundle["version"],
            "demoModel": bundle["demo"], "schemaVersion": SCHEMA}


def save_bundle(bundle, folder):
    folder = Path(folder)
    folder.mkdir(parents=True, exist_ok=True)
    dest = folder / (bundle["version"] + ".joblib")
    temp = dest.with_suffix(".tmp")
    joblib.dump(bundle, temp, compress=3)
    os.replace(temp, dest)
    return dest


def activate(folder, version):
    folder = Path(folder)
    path = folder / (version + ".joblib")
    checksum = hashlib.sha256(path.read_bytes()).hexdigest()
    temp = folder / "active.tmp"
    temp.write_text(json.dumps({"version": version, "sha256": checksum}))
    os.replace(temp, folder / "active.json")


def load_active(folder):
    folder = Path(folder)
    meta = json.loads((folder / "active.json").read_text())
    if not isinstance(meta["version"], str) or not all(c.isalnum() or c in "-_" for c in meta["version"]):
        raise ValueError("Invalid model version")
    path = folder / (meta["version"] + ".joblib")
    if hashlib.sha256(path.read_bytes()).hexdigest() != meta["sha256"]:
        raise ValueError("Model checksum mismatch")
    bundle = joblib.load(path)  # Only load trusted, locally generated artifacts.
    if bundle["schema"] != SCHEMA or bundle["features"] != FEATURES:
        raise ValueError("Incompatible model schema")
    return bundle
