import copy
import hashlib
import json
import shutil
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from pathlib import Path
from unittest.mock import patch

import numpy as np
from engine import Engine
from model import FEATURES, load_active, predict, vector
from server import make_server
from train import synthetic

ARTIFACTS = Path(__file__).resolve().parents[1]/"artifacts"


def request(rid="one", identity="alice", device="device-a"):
    return {"requestId":rid,"identityKey":hashlib.sha256(identity.encode()).hexdigest(),
        "deviceKey":hashlib.sha256(device.encode()).hexdigest(),
        "telemetry":{"deviceUnknown":0,"locationRisk":0,"sessionSeconds":220,
                     "failedLogins24h":0,"ipChanged":0}}


class SystemTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.engine = Engine(ARTIFACTS, self.temp.name)

    def test_trained_artifact_and_schema(self):
        bundle = self.engine.bundle
        self.assertTrue(bundle["demo"])
        self.assertGreater(bundle["bootstrap_report"]["held_out_test"]["recall"],.8)
        self.assertEqual(bundle["features"],FEATURES)

    def test_idempotency_and_history(self):
        first = self.engine.score(request())
        self.assertEqual(first,self.engine.score(request()))
        self.engine.score(request("two"))
        with self.engine.db() as db:
            rows = db.execute("SELECT features FROM predictions ORDER BY created").fetchall()
        self.assertEqual(len(rows),2)
        self.assertEqual(json.loads(rows[0][0])[2],0)
        self.assertEqual(json.loads(rows[1][0])[2],1)
        self.assertEqual(json.loads(rows[0][0])[3],1)
        with self.assertRaises(ValueError):
            self.engine.score(request(identity="bob"))

    def test_device_sharing_counts_current_identity_once(self):
        self.engine.score(request("one","alice"))
        self.engine.score(request("two","bob"))
        self.engine.score(request("three","bob"))
        with self.engine.db() as db:
            row = db.execute("SELECT features FROM predictions WHERE id='three'").fetchone()
        self.assertEqual(json.loads(row[0])[3],2)

    def test_missing_telemetry_is_review_not_normal(self):
        r = request()
        del r["deviceKey"]
        r["telemetry"] = {}
        result = self.engine.score(r)
        self.assertEqual(result["recommendation"],"MANUAL_REVIEW")
        self.assertIn("INSUFFICIENT_TELEMETRY",result["reasons"])

    def test_invalid_features_rejected(self):
        for value in [float("nan"),float("inf"),True,1.5,-4,3]:
            with self.subTest(value=value),self.assertRaises(ValueError):
                vector({"deviceUnknown":value})
        r = request()
        r["telemetry"]["identityApplications24h"] = 0
        with self.assertRaises(ValueError):
            self.engine.score(r)

    def test_feedback_is_verified_immutable_and_persistent(self):
        self.engine.score(request())
        f = {"requestId":"one","label":0,"reviewer":"analyst-1",
             "evidence":"investigation-123","source":"analyst_verified"}
        self.assertEqual(self.engine.feedback(f)["status"],"recorded")
        self.assertEqual(self.engine.feedback(f)["status"],"already_recorded")
        with self.assertRaises(ValueError):
            self.engine.feedback(dict(f,label=1))
        with self.assertRaises(ValueError):
            self.engine.feedback(dict(f,source="model_prediction"))
        again = Engine(ARTIFACTS,self.temp.name)
        self.assertEqual(again.status()["feedback"],1)
        self.assertEqual(again.retrain()["status"],"waiting_for_feedback")

    def test_no_learning_from_unlabelled_predictions(self):
        version = self.engine.bundle["version"]
        self.engine.score(request())
        self.engine.retrain()
        self.assertEqual(self.engine.bundle["version"],version)

    def test_artifact_tamper_detected(self):
        dest = Path(self.temp.name)/"artifacts"
        shutil.copytree(ARTIFACTS,dest)
        meta = json.loads((dest/"active.json").read_text())
        (dest/(meta["version"]+".joblib")).write_bytes(b"bad")
        with self.assertRaises(ValueError):
            load_active(dest)

    def test_drift_on_shifted_population(self):
        with self.engine.db() as db:
            for i in range(220):
                db.execute("INSERT INTO predictions VALUES(?,?,?,?,?,?,?)",
                    (str(i),i,"a"*64,None,"hash",json.dumps([1,2,100,100,1,100,1]),"{}"))
        self.assertEqual(self.engine.drift()["status"],"drift_detected")

    def test_http_auth_validation_and_scoring(self):
        score_token,admin_token = "s"*32,"a"*32
        server = make_server(self.engine,score_token,admin_token,port=0)
        thread = threading.Thread(target=server.serve_forever,daemon=True)
        thread.start()
        self.addCleanup(server.server_close)
        self.addCleanup(server.shutdown)
        url = "http://127.0.0.1:"+str(server.server_port)
        def call(path,body,token):
            req = urllib.request.Request(url+path,json.dumps(body).encode(),
                {"Content-Type":"application/json","Authorization":"Bearer "+token})
            return json.load(urllib.request.urlopen(req,timeout=5))
        with self.assertRaises(urllib.error.HTTPError) as exc:
            call("/v1/score",request(),"bad")
        self.assertEqual(exc.exception.code,401)
        result = call("/v1/score",request(),score_token)
        self.assertEqual(result["requestId"],"one")
        with self.assertRaises(urllib.error.HTTPError) as exc:
            call("/v1/feedback",{},score_token)
        self.assertEqual(exc.exception.code,401)
        with self.assertRaises(urllib.error.HTTPError) as exc:
            call("/v1/score",{"requestId":"invalid"},score_token)
        self.assertEqual(exc.exception.code,400)


if __name__ == "__main__":
    unittest.main()
