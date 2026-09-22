# FraudShield adaptive fraud model

> **Fixed-project note (September 2026):** In `FraudShield_FIXED`, the Spring integration is already applied and improved. Do **not** apply the old `integration.patch`. Running `python server.py` locally uses matching demo-only tokens by default; override them with environment variables for any non-local use. The default Spring mode is `hybrid`, so the trained ML probability affects the final score instead of staying in shadow mode.

Built for `ChSaiPranav2904/FraudShield_AI`, base commit
`e0d35bfe81a871572c2c547b55f618b9da2e700d` (Spring Boot 3.5.6 / Java 17).

## What is actually delivered

- A **trained** histogram gradient-boosting classifier, calibrated on a separate partition.
- Isolation Forest trained on legitimate examples, to identify unusual behaviour for review.
- A private scoring HTTP API with persistent, idempotent predictions and immutable verified feedback.
- Server-computed application velocity and shared-device identity counts, using pseudonymous keys.
- Automatic checks for new feedback every five minutes and gated batch retraining.
- Drift monitoring, model versions, checksum verification and atomic activation.
- A Spring adapter called by the existing loan-submission flow. ML results are persisted in
  `mlAssessment` and `mlRequestId` and returned in existing loan API responses.
- Tests, a reproducible new-pattern learning demonstration, evaluation reports, Dockerfile and client CLI.

**The supplied weights are trained on synthetic data, not real lending records.**
No labelled dataset exists in the source repository. This is a working demonstration of the
learning mechanism, not a validated fraud product. No deployment or GitHub push was performed.

## Quick start: Python service

Use Python **3.12**, matching the tested environment. From `ml-service`:

```bash
python -m venv .venv
# Windows PowerShell:
.venv/Scripts/Activate.ps1
# Linux/macOS instead: source .venv/bin/activate
python -m pip install -r requirements.txt
```

Set three different secrets. Keep the scoring token and identity secret consistent between
the Python service and Spring process. Only trusted analysts/operators receive the admin token.
For example, in PowerShell:

```powershell
$env:ML_SCORE_TOKEN = python -c "import secrets; print(secrets.token_hex(32))"
$env:ML_ADMIN_TOKEN = python -c "import secrets; print(secrets.token_hex(32))"
$env:ML_IDENTITY_SECRET = python -c "import secrets; print(secrets.token_hex(32))"
$env:OMP_NUM_THREADS = "1"
$env:OPENBLAS_NUM_THREADS = "1"
python server.py
```

For bash, use `export ML_SCORE_TOKEN=...`, `export ML_ADMIN_TOKEN=...`, and
`export ML_IDENTITY_SECRET=...` with different locally generated secrets, then `python server.py`.
Do not put these secrets in a browser, repository, or shared screenshot.

The pretrained artifact is already included. **You do not need to train before starting.**
Health check: `http://127.0.0.1:8001/health`.

In another terminal with the same environment variables, demonstrate scoring and feedback:

```bash
python client.py score --json example-score.json
python client.py feedback --json example-feedback.json
python client.py status
python client.py retrain
```

The sample keys and feedback are explicitly fictitious. Use a new `requestId` for a new event;
repeating the same request is a retry, not another application. A retraining request with one
feedback item correctly waits for sufficient feedback. It does not pretend to learn from one row.

## Connect the existing project

The accompanying `integration.patch` changes the actual existing controller/entity/config and
adds `FraudModelClient.java` plus three Java tests. Apply it at the repository root:

```bash
git apply --check integration.patch
git apply integration.patch
```

Copy this `ml-service` directory into that root if it is not there already. Start Python as above.
Start the existing PostgreSQL, Ollama and Spring application as required by the original project.
In the Spring terminal set `ML_SCORE_TOKEN` and `ML_IDENTITY_SECRET` to the same values used above.
Then from `backend/backend`:

```bash
# Linux/macOS:
bash mvnw spring-boot:run
# Windows:
mvnw.cmd spring-boot:run
```

The existing frontend can submit applications without a changed request schema. Inspect the
`POST /loan` response or authenticated `GET /loan` response for `mlAssessment` and `mlRequestId`.
The existing dashboard has not been redesigned and does not render a new ML panel.

| `ML_MODE` | Behaviour |
|---|---|
| `shadow` (default) | Run and persist ML assessment, keep existing rule-based decision. Outages are recorded. |
| `review` | Escalate ML alerts, insufficient telemetry, demo-model results and outages to manual review. Never auto-reject from ML. Existing credit rules still apply otherwise. |
| `off` | Disable ML calls; clear inbound ML fields. |

`NO_FRAUD_ALERT` means no alert from this model, **not loan approval**. Fraud probability is
stored separately from the old credit/rule score; they are not arbitrarily averaged.
The adapter uses connection/read timeouts and validates the returned request ID and probability.
The original repository uses Hibernate `ddl-auto=update`, which adds the two entity columns in
development. For controlled databases, apply an approved migration first:

```sql
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS ml_assessment TEXT;
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS ml_request_id VARCHAR(255);
```

## Important integration finding: telemetry collection is still needed

The current `LoanForm.jsx` hardcodes `deviceKnown: "YES"` and `locationRisk: "LOW"`.
Those are not measured behavioural observations. The adapter deliberately ignores both.
It sends an HMAC of normalized national-ID type/number and allows the service to count earlier
applications. No name, raw ID, income, age or credit score is sent to the ML service.

Consequently, the unchanged form currently produces `INSUFFICIENT_TELEMETRY` and a manual-review
recommendation. This is visible in shadow mode. To use the richer model on real traffic, connect
trusted backend session/authentication/device instrumentation to the adapter's `telemetry` map
and pass a server-derived HMAC `deviceKey`. Do not copy browser-provided trust flags into it.
National IDs remain self-reported in the original app; HMAC does not verify identity ownership.

| Feature | Range / meaning | Trusted source |
|---|---|---|
| `deviceUnknown` | 0 known, 1 unfamiliar, null unknown | Server device/session history |
| `locationRisk` | 0 low, 1 medium, 2 high, null unknown | Documented location-risk service; assess bias before use |
| `identityApplications24h` | Prior applications before current event | Computed transactionally by Python; cannot be supplied by callers |
| `deviceIdentities24h` | Distinct identities including current one on device | Computed by Python when `deviceKey` exists |
| `sessionSeconds` | 0–86400 elapsed seconds, null missing | Server session start/end events |
| `failedLogins24h` | Prior failed logins, null missing | Authentication logs |
| `ipChanged` | 0 no, 1 yes, null missing | Server session history |

Missing fields become `-1`, and four or more missing features force review. New applicants,
travellers and shared-device households must be represented in real validation data.
No model can discover fraud patterns that leave no signal in the measured features.

## How the learning cycle works

1. Store the exact feature snapshot, prediction and model version at application time.
2. An authenticated analyst confirms `label=1` (fraud) or `label=0` (legitimate), with an evidence
   reference. Loan rejection, missed payments and the model's own output are never automatic labels.
3. Every 300 seconds, if the feedback count changed, check for at least 200 labels newer than the
   active model's watermark. `ML_RETRAIN_SECONDS=0` disables this worker. Manual retraining also exists.
4. Hash-partition identities: 25% are permanently audit-only; the rest are split by identity into
   training/calibration/threshold selection. Fresh audits use one latest event per identity.
   Minimum positive/negative class counts apply; 200 labels alone do not guarantee eligibility.
5. Mix recent verified feedback with bounded original replay data, retrain classifier and novelty
   model, recalibrate, and select a review threshold subject to a 3% tuning false-positive budget.
6. Compare candidate and champion on fresh audit identities and a fixed historical anchor.
   Require FPR/recall/calibration checks and measurable improvement. Save failed candidates for
   inspection; atomically activate only candidates that pass all checks.

This is **feedback-driven batch learning**, not unsupervised automatic truth discovery.
Unlabelled traffic can trigger drift alerts but never retrains the classifier. Analyst review
must include representative samples of unflagged applications; otherwise feedback selection
bias can invalidate prevalence, calibration and false-positive estimates. The demo uses enriched
feedback to exercise adaptation and does not claim production prevalence.

The gate includes a fresh FPR <=3%, Wilson upper bound <=10%, FPR degradation <=0.5 percentage
points, no fresh recall drop, historical recall drop <=2 percentage points, and Brier degradation
<=0.01. These are explicit prototype tolerances, not universal lending policy. A model can still
degrade slightly within the tolerances. Inspect every report and choose business-appropriate gates.
Repeated reuse of the historical anchor can overfit model selection; replace it with rolling,
independent, temporally mature audits for production. Evaluate delayed labels and customer/device
group leakage in the actual dataset, including linked identities on shared devices.

## Evaluation that was actually run

Initial data: **20,000 synthetic examples**, 12,000 train / 3,000 calibration / 2,000 threshold
selection / 3,000 untouched test. See `artifacts/evaluation.json`.

| Untouched synthetic test metric | Result |
|---|---:|
| Fraud recall | 93.51% (216 / 231) |
| Review precision | 74.74% |
| Legitimate false-positive review rate | 2.64% (73 / 2,769) |
| FPR Wilson upper 95% bound | 3.30% |
| Average precision | 0.9360 |

The tuning target does not guarantee a test or future FPR cap. The report also includes the
classifier's ordinary 0.5 threshold: it has **lower** FPR (0.51%) but lower recall (88.74%).
The selected policy spends more review capacity to catch more fraud; it is not a universal
improvement over every threshold. There is no measured real-data comparison with the original rules.

The separate new-pattern simulation used 1,661 simulated verified outcomes and 415 audit cases:

| Synthetic new-pattern audit | Before learning | After learning |
|---|---:|---:|
| Fraud recall | 84.21% (96 / 114) | 94.74% (108 / 114) |
| Legitimate false positives | 7 / 301 (2.33%) | 6 / 301 (1.99%) |
| Review precision | 93.20% | 94.74% |

All configured promotion checks passed in this simulation. The one-case false-positive difference
is small and does not establish a statistically reliable reduction. The original-pattern anchor
recall fell from 92.36% to 90.97%, within the configured 2-point tolerance; that trade-off is reported.
The packaged active model remains the bootstrap model; the simulation activates its candidate only
inside its isolated output directory.

Reproduce the simulation (about one minute on a small CPU):

```bash
python demo_learning.py --output state/my-new-learning-demo
python -m unittest discover -s tests -v
```

Use a fresh output directory each time. `reports/simulation-report.json` contains the saved run.
11 Python tests passed, including live local HTTP/auth tests and a rejected-candidate test verifying
audit identities never enter fitting and a bad candidate cannot replace the active model.
The real simulation exercises successful fitting, evaluation, activation and persistence.

Java tests are included, but **could not be executed here** because Maven Central DNS/dependency
downloads were unavailable. A full Spring/PostgreSQL/Ollama/frontend end-to-end run and Docker build
were not performed. Run the included adapter tests in a network-enabled environment:

```bash
cd ../backend/backend
bash mvnw -Dtest=FraudModelClientTests test
```

## Train with real data

Use a CSV with `entityId,eventTime,label` and all seven feature columns above. Empty values mean
missing. `eventTime` must be an ISO timestamp with a timezone. All features must be computed using
only events before the prediction; labels must be independently confirmed outcomes. The bootstrap
loader requires >=2,000 rows, one event per entity, and enough fraud/legitimate examples per split.
For multiple events per customer/device, implement audited temporal group splitting rather than
inventing a different entity ID for every row.

```bash
python train.py --csv verified_lending_outcomes.csv --output artifacts-real
```

The command refuses to overwrite an active model. It sorts real rows by event time, fits,
calibrates, tunes, and reports on the newest untouched test partition. Set `ML_ARTIFACTS` to the
new directory and use a separate `ML_STATE` for a fresh real-data evaluation environment.
Do not carry synthetic demonstration feedback into a real training lifecycle. The CSV route
sets `demoModel=false` based on declared provenance; this is not an independent certification.
Inspect the real-data results before using review mode. Real fraud data acquisition and telemetry
instrumentation are the remaining requirements for a useful deployed fraud detector.

## API and operation

| Endpoint | Token | Purpose |
|---|---|---|
| `GET /health` | None | Process health |
| `POST /v1/score` | Score token | Private backend scoring; returns probability, novelty score, reasons, version |
| `POST /v1/feedback` | Admin token | Immutable confirmed label tied to stored prediction |
| `POST /v1/retrain` with `{}` | Admin token | Queue background candidate evaluation; poll status |
| `GET /v1/status` | Admin token | Counts, model version, latest training report, drift |

The anomaly score is **not a probability**. Reason codes explain routing, not causal attributions
or SHAP explanations. The old generative-AI review endpoint is unchanged and does not explain
the model's feature contributions.

Run one service process per state/model directory: SQLite provides local durability and the
process manages a single active model. This standard-library server is for private prototypes;
production needs a bounded application server, TLS/private networking, durable backups, monitoring,
rate limits, analyst identity/audit controls and secret management. Keep tokens out of public browsers.
Model joblib files can execute code when loaded: load only trusted artifacts. Checksums detect
accidental changes, not a malicious party who can edit both model and manifest.

Container option from this directory:

```bash
docker build -t fraudshield-ml .
docker run --rm -p 127.0.0.1:8001:8001 -e ML_SCORE_TOKEN -e ML_ADMIN_TOKEN \
  -v fraudshield-state:/app/state -v fraudshield-models:/app/artifacts fraudshield-ml
```

To roll back, stop the service, use a previously trusted/validated version present in the same
artifact directory, then restart:

```bash
python -c "from model import activate; activate('artifacts','bootstrap-a930e8f0719f')"
```

Changing the HMAC secret resets identity history. Plan secret rotation and data retention for real
records. Feedback corrections intentionally require an audited data-repair workflow rather than
silently relabelling an existing training example.

References: [scikit-learn probability calibration](https://scikit-learn.org/stable/modules/calibration.html),
[novelty/outlier detection](https://scikit-learn.org/stable/modules/outlier_detection.html).
