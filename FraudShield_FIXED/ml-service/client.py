"""Example trusted operator client; secrets stay in environment variables."""
import argparse
import json
import os
import urllib.request
from pathlib import Path

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("action",choices=["score","feedback","retrain","status"])
    parser.add_argument("--json",help="Path to JSON input for score or feedback")
    args = parser.parse_args()
    token_name = "ML_SCORE_TOKEN" if args.action == "score" else "ML_ADMIN_TOKEN"
    token = os.getenv(token_name, "fraudshield-demo-score-token-2026-local" if token_name == "ML_SCORE_TOKEN" else "fraudshield-demo-admin-token-2026-local")
    url = os.getenv("ML_URL","http://127.0.0.1:8001") + "/v1/" + args.action
    if args.action in {"score","feedback"} and not args.json:
        parser.error("--json is required for score and feedback")
    data = None if args.action == "status" else (
        Path(args.json).read_bytes() if args.json else b"{}")
    request = urllib.request.Request(url,data,
        {"Content-Type":"application/json","Authorization":"Bearer "+token})
    with urllib.request.urlopen(request,timeout=10) as response:
        print(json.dumps(json.load(response),indent=2))
