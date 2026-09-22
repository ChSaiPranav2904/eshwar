"""Private demo HTTP service. Bind to loopback; put behind TLS for remote use."""
import hmac
import json
import logging
import os
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from engine import Engine

LOG = logging.getLogger("fraudshield")


def make_server(engine, score_token, admin_token, host="127.0.0.1", port=8001):
    if min(len(score_token),len(admin_token)) < 24 or score_token == admin_token:
        raise ValueError("Set different ML_SCORE_TOKEN and ML_ADMIN_TOKEN, each >=24 characters")

    class Handler(BaseHTTPRequestHandler):
        def setup(self):
            super().setup()
            self.connection.settimeout(10)

        def log_message(self, *_):
            pass  # No request payloads or tokens in access logs.

        def respond(self, code, obj):
            body = json.dumps(obj,allow_nan=False).encode()
            self.send_response(code)
            self.send_header("Content-Type","application/json")
            self.send_header("Content-Length",str(len(body)))
            self.send_header("Cache-Control","no-store")
            self.end_headers()
            self.wfile.write(body)

        def authorized(self, admin=False):
            value = self.headers.get("Authorization","")
            key = admin_token if admin else score_token
            return hmac.compare_digest(value,"Bearer " + key)

        def do_GET(self):
            if self.path == "/health":
                self.respond(200,{"status":"ok"})
            elif self.path == "/v1/status":
                if not self.authorized(True):
                    self.respond(401,{"error":"Unauthorized"})
                else:
                    self.respond(200,engine.status())
            else:
                self.respond(404,{"error":"Not found"})

        def do_POST(self):
            if self.path not in {"/v1/score","/v1/feedback","/v1/retrain"}:
                return self.respond(404,{"error":"Not found"})
            if not self.authorized(self.path != "/v1/score"):
                return self.respond(401,{"error":"Unauthorized"})
            try:
                size = int(self.headers.get("Content-Length","0"))
                if not 0 < size <= 16384:
                    return self.respond(413,{"error":"Body must be 1-16384 bytes"})
                if self.headers.get("Content-Type","").split(";")[0] != "application/json":
                    return self.respond(415,{"error":"Use application/json"})
                request = json.loads(self.rfile.read(size),
                    parse_constant=lambda v: (_ for _ in ()).throw(ValueError("Non-finite JSON")))
                if self.path == "/v1/score":
                    result = engine.score(request)
                elif self.path == "/v1/feedback":
                    result = engine.feedback(request)
                else:
                    if request != {}:
                        raise ValueError("Retrain body must be an empty object")
                    threading.Thread(target=safe_retrain,args=(engine,),daemon=True).start()
                    return self.respond(202,{"status":"scheduled","poll":"/v1/status"})
                self.respond(200,result)
            except (ValueError,TypeError,KeyError) as exc:
                self.respond(400,{"error":str(exc)})
            except Exception:
                LOG.exception("Request failed")
                self.respond(503,{"error":"Scoring service unavailable; route to manual review"})

    return ThreadingHTTPServer((host,port),Handler)


def safe_retrain(engine):
    try:
        result = engine.retrain()
        LOG.info("Retraining status: %s",result["status"])
    except Exception:
        LOG.exception("Candidate training failed; active model retained")


def learning_worker(engine, stop, seconds):
    last_count = -1
    while not stop.wait(seconds):
        with engine.db() as db:
            count = db.execute("SELECT count(*) FROM feedback").fetchone()[0]
        if count != last_count:
            safe_retrain(engine)
            last_count = count


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    engine = Engine(os.getenv("ML_ARTIFACTS","artifacts"),os.getenv("ML_STATE","state"))

    # Local demo defaults make the project run out-of-the-box. Override these with environment
    # variables before any non-local/deployed use.
    score_token = os.getenv("ML_SCORE_TOKEN", "fraudshield-demo-score-token-2026-local")
    admin_token = os.getenv("ML_ADMIN_TOKEN", "fraudshield-demo-admin-token-2026-local")
    server = make_server(engine, score_token, admin_token,
        os.getenv("ML_HOST","127.0.0.1"),int(os.getenv("ML_PORT","8001")))
    stop = threading.Event()
    interval = int(os.getenv("ML_RETRAIN_SECONDS","300"))
    if interval > 0:
        threading.Thread(target=learning_worker,args=(engine,stop,interval),daemon=True).start()
    try:
        LOG.info("FraudShield ML listening on %s:%s",*server.server_address)
        server.serve_forever()
    finally:
        stop.set()
        server.server_close()
