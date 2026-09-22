"""Offline simulated confirmed outcomes: exercises real retraining without touching active state."""
import argparse
import hashlib
import json
import shutil
import time
from pathlib import Path

import numpy as np
from engine import Engine
from model import predict
from train import synthetic


def run(destination):
    dest = Path(destination)
    dest.mkdir(parents=True,exist_ok=False)
    shutil.copytree("artifacts",dest/"artifacts")
    engine = Engine(dest/"artifacts",dest/"state")
    x,y = synthetic(6000,seed=912,novel=True)
    # Deliberately enriched feedback population: not an estimate of production prevalence.
    positive = np.flatnonzero(y==1)
    negative = np.flatnonzero(y==0)[:1200]
    ids = np.r_[positive,negative]
    np.random.default_rng(11).shuffle(ids)
    with engine.db() as db:
        for seq,i in enumerate(ids):
            identity = hashlib.sha256(("simulated-person-"+str(i)).encode()).hexdigest()
            rid = "simulated-"+str(i)
            result = predict(engine.bundle,x[i])
            db.execute("INSERT INTO predictions VALUES(?,?,?,?,?,?,?)",
                (rid,time.time()+seq,identity,None,"offline-simulation",json.dumps(x[i].tolist()),json.dumps(result)))
            db.execute("INSERT INTO feedback(id,label,reviewer,evidence,source,created) VALUES(?,?,?,?,?,?)",
                (rid,int(y[i]),"SIMULATOR","SYNTHETIC_LABEL_NOT_REAL","analyst_verified",time.time()+seq))
    report = engine.retrain()
    report["simulation_only"] = True
    report["feedback_population"] = "Enriched synthetic new-pattern cases; not production prevalence"
    (dest/"simulation-report.json").write_text(json.dumps(report,indent=2))
    print(json.dumps(report,indent=2))
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output",default="state/learning-demo")
    args = parser.parse_args()
    run(args.output)
