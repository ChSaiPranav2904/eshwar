"""Gate failure and identity separation tests, in addition to the real offline learning demo."""
import hashlib
import json
import shutil
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import numpy as np
from engine import Engine


class LearningGateTests(unittest.TestCase):
    def test_bad_candidate_is_retained_as_candidate_only_and_audit_is_disjoint(self):
        with tempfile.TemporaryDirectory() as temp:
            artifacts = Path(temp)/"artifacts"
            shutil.copytree(Path(__file__).resolve().parents[1]/"artifacts",artifacts)
            engine = Engine(artifacts,Path(temp)/"state")
            original = engine.bundle["version"]
            with engine.db() as db:
                for i in range(2000):
                    identity = hashlib.sha256(str(i).encode()).hexdigest()
                    # Marker outside real training ranges detects accidental audit leakage.
                    features = [0,0,0,1,900000+i,0,0]
                    db.execute("INSERT INTO predictions VALUES(?,?,?,?,?,?,?)",
                        (str(i),i,identity,None,"fixture",json.dumps(features),"{}"))
                    db.execute("INSERT INTO feedback(id,label,reviewer,evidence,source,created) VALUES(?,?,?,?,?,?)",
                        (str(i),i%2,"test","test","analyst_verified",i))
            def fake_fit(*args):
                for x in (args[0],args[2],args[4]):
                    for marker in x[:,4]:
                        if marker >= 900000:
                            ident = hashlib.sha256(str(int(marker-900000)).encode()).hexdigest()
                            self.assertNotEqual(int(ident,16)%4,0)
                return dict(engine.bundle)
            calls = 0
            def fake_metrics(*args):
                nonlocal calls
                calls += 1
                bad = calls in (2,4)
                return {"false_positive_rate":.8 if bad else .01,"fpr_upper_95":.85 if bad else .02,
                        "recall":.3 if bad else .9,"brier_score":.5 if bad else .05,
                        "average_precision":.2 if bad else .9}
            with patch("engine.fit_model",side_effect=fake_fit),patch("engine.metrics",side_effect=fake_metrics):
                report = engine.retrain()
            self.assertEqual(report["status"],"rejected")
            self.assertEqual(engine.bundle["version"],original)
            self.assertEqual(json.loads((artifacts/"active.json").read_text())["version"],original)
            self.assertFalse(report["checks"]["fresh_fpr_cap"])


if __name__ == "__main__":
    unittest.main()
