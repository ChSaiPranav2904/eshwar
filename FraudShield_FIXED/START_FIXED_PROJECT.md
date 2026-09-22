# FraudShield fixed ML integration

This copy fixes the issue where the loan controller always used only the hard-coded rule score.

## What changed

1. `POST /loan` now calls `FraudModelClient` before saving.
2. The trained Python model result is persisted (`mlFraudProbability`, `mlRecommendation`, `modelVersion`, `mlAssessment`).
3. The old rule score is persisted separately as `ruleRiskScore`.
4. Default `ML_MODE` is now `hybrid`, so ML materially affects the final `riskScore` and decision.
5. Demo-model output no longer automatically forces every application to `MANUAL_REVIEW`.
6. The Spring adapter sends enough behavioural context for the existing model to score instead of always returning `INSUFFICIENT_TELEMETRY`.
7. If the ML service is down, the application explicitly records `RULE_FALLBACK_ML_UNAVAILABLE` instead of silently pretending ML ran.

## Run it (Windows)

### Terminal 1 - ML service

```powershell
cd ml-service
python -m pip install -r requirements.txt
python server.py
```

Verify: open `http://127.0.0.1:8001/health` and expect `{"status":"ok"}`.

### Terminal 2 - Spring backend

```powershell
cd backend\backend
.\mvnw.cmd spring-boot:run
```

If port `8087` is already in use:

```powershell
cd backend\backend
$env:SERVER_PORT="8091"
.\mvnw.cmd spring-boot:run
```

The default backend profile uses an embedded H2 demo database so local startup does not fail on a missing or mismatched PostgreSQL password.

To run against PostgreSQL, create the database and pass your real local credentials:

```powershell
cd backend\backend
$env:DB_URL="jdbc:postgresql://localhost:5432/fraudshields"
$env:DB_USERNAME="postgres"
$env:DB_PASSWORD="<your-postgres-password>"
.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=postgres
```

Look for a line like this after submitting a loan:

```text
[FraudShield ML] request=... probability=0.0128 recommendation=NO_FRAUD_ALERT model=bootstrap-a930e8f0719f
```

### Terminal 3 - Frontend

```powershell
cd frontend
npm install
npm run dev
```

## How to verify the model is really being used

Submit a new application, then inspect the `POST /loan` response or the dashboard. A successful ML call has:

- `ruleRiskScore`: score from legacy hand-written rules
- `mlFraudProbability`: probability from the trained model (0 to 1)
- `mlRecommendation`: `NO_FRAUD_ALERT` or `MANUAL_REVIEW`
- `modelVersion`: e.g. `bootstrap-a930e8f0719f`
- `riskScore`: final hybrid score
- `decisionSource`: `HYBRID_RULES+ML`

If `decisionSource` says `RULE_FALLBACK_ML_UNAVAILABLE`, read the Spring console. The ML service was not reachable or the token/configuration did not match.

## Important demo note

The supplied model is trained on synthetic behavioural data. This is appropriate for demonstrating the architecture, adaptive feedback/retraining, model versioning and anomaly detection, but it is not a validated real-world lending fraud model.
