"""Reproducible bootstrap: python train.py --demo (or --csv verified.csv)."""
import argparse
import csv
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from model import FEATURES, TARGET_FPR, activate, fit_model, metrics, save_bundle, vector


def synthetic(n=20000, seed=42, novel=False):
    """Invented populations; never a proxy for evidence about real lending fraud."""
    rng = np.random.default_rng(seed)
    y = (rng.random(n) < 0.07).astype(int)
    x = np.column_stack([rng.binomial(1, .22, n), rng.choice(3, n, p=[.8,.16,.04]),
        rng.poisson(.4, n), 1+rng.poisson(.15,n), rng.lognormal(5.2,.7,n),
        rng.poisson(.25,n), rng.binomial(1,.12,n)]).astype(float)
    for i in np.flatnonzero(y):
        pattern = rng.integers(3)
        if novel:
            # New pattern: familiar device, low velocity, short session with IP change.
            x[i] = [0, 0, rng.poisson(.4), 1, rng.uniform(1,12), 0, 1]
        elif pattern == 0:
            x[i, [0,2,3]] = [rng.binomial(1,.85), rng.poisson(5), 2+rng.poisson(4)]
        elif pattern == 1:
            x[i, [0,5,6]] = [rng.binomial(1,.8), 2+rng.poisson(4), rng.binomial(1,.8)]
        else:
            x[i, [1,2,4]] = [rng.choice([1,2]), 1+rng.poisson(3), rng.lognormal(3,.7)]
    # Legitimate travellers/shared households and noisy labels prevent trivial separation.
    travellers = (y == 0) & (rng.random(n) < .05)
    x[travellers,0] = 1
    x[travellers,6] = 1
    x[travellers,1] = 2
    noisy = rng.random(n) < .003
    y[noisy] = 1-y[noisy]
    x[rng.random(x.shape) < .07] = -1
    return x, y


def read_csv(path):
    """Require pre-event features, confirmed labels, disjoint identities, temporal order."""
    with open(path, newline="") as f:
        rows = list(csv.DictReader(f))
    if len(rows) < 2000:
        raise ValueError("Provide >=2000 resolved examples; small/one-class splits will also fail")
    seen, x, y, times = set(), [], [], []
    for row in rows:
        entity = row["entityId"]
        if not entity or entity in seen:
            raise ValueError("Use one event per entity for leakage-safe bootstrap evaluation")
        seen.add(entity)
        if row["label"] not in ("0", "1"):
            raise ValueError("Labels must be confirmed 0/1; rejection or default is not fraud")
        timestamp = datetime.fromisoformat(row["eventTime"].replace("Z", "+00:00"))
        if timestamp.tzinfo is None:
            raise ValueError("eventTime requires a timezone")
        times.append(timestamp)
        x.append(vector({f: float(row[f]) if row.get(f) not in (None, "") else None for f in FEATURES}))
        y.append(int(row["label"]))
    order = sorted(range(len(rows)), key=lambda i: times[i])
    return np.asarray(x)[order], np.asarray(y)[order]


def bootstrap(folder, x, y, demo, source_hash):
    # Temporal partitions for real CSV; synthetic rows have independent identities.
    n = len(y)
    a,b,c = int(n*.6), int(n*.75), int(n*.85)
    bundle = fit_model(x[:a], y[:a], x[a:b], y[a:b], x[b:c], y[b:c])
    bundle.update(version="bootstrap-" + source_hash[:12], demo=demo,
                  source_sha256=source_hash, feedback_watermark=0)
    result = metrics(bundle, x[c:], y[c:])
    baseline = dict(bundle, threshold=.5, anomaly_threshold=float("inf"))
    report = {"data": "SYNTHETIC DEMONSTRATION ONLY" if demo else "USER PROVIDED LABELLED CSV",
        "source_sha256": source_hash, "features": FEATURES, "rows": n,
        "split": {"train": a, "calibration": b-a, "threshold_tuning": c-b, "test": n-c},
        "review_fpr_target_on_tuning": TARGET_FPR, "review_threshold": bundle["threshold"],
        "anomaly_threshold": bundle["anomaly_threshold"], "held_out_test": result,
        "classifier_at_default_0_5": metrics(baseline, x[c:], y[c:]),
        "limitations": ["Synthetic results do not establish real-world performance." if demo else
            "CSV label provenance must be independently audited.",
            "Anomalies are review signals, not confirmed fraud.",
            "FPR target is selected on tuning data, not a guarantee on future traffic.",
            "No automatic rejection or loan approval; fraud alert is separate from credit assessment."]}
    bundle["bootstrap_report"] = report
    folder = Path(folder)
    folder.mkdir(parents=True, exist_ok=True)
    save_bundle(bundle, folder)
    # Replay data remain separate from the permanent promotion anchor.
    np.savez_compressed(folder / "replay.npz", x=x[:b], y=y[:b])
    np.savez_compressed(folder / "anchor.npz", x=x[b:c], y=y[b:c])
    (folder / "evaluation.json").write_text(json.dumps(report, indent=2))
    activate(folder, bundle["version"])
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--demo", action="store_true")
    group.add_argument("--csv")
    parser.add_argument("--output", default="artifacts")
    args = parser.parse_args()
    if (Path(args.output)/"active.json").exists():
        parser.error("Output already contains an active model; choose a new output directory")
    if args.demo:
        x,y = synthetic()
        digest = hashlib.sha256(x.tobytes()+y.tobytes()).hexdigest()
    else:
        x,y = read_csv(args.csv)
        digest = hashlib.sha256(Path(args.csv).read_bytes()).hexdigest()
    print(json.dumps(bootstrap(args.output,x,y,args.demo,digest),indent=2))
