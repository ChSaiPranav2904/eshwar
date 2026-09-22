package com.fraud.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fraud.backend.entity.LoanApplication;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

/**
 * Calls the Python ML scoring service and applies the FraudShield fraud-risk policy.
 *
 * ── Architecture ────────────────────────────────────────────────────────────
 *
 * PRIMARY ENGINE — HistGradientBoostingClassifier (via CalibratedClassifierCV):
 *   Trained on labelled fraud/legitimate cases. Produces a calibrated fraud
 *   probability (0-1). Sigmoid calibration makes this probability meaningful
 *   and usable as a direct input to the risk formula.
 *   Weight in final score: 0.55 (configurable via fraud.weight.ml).
 *
 * ANOMALY DETECTOR — IsolationForest:
 *   Trained only on legitimate traffic. Detects behavioural patterns that are
 *   unusual or novel — potential new fraud vectors the classifier has not yet seen.
 *   Returns an anomaly score (higher = more anomalous). Used by model.py to flag
 *   UNUSUAL_BEHAVIOUR_REVIEW independently of fraud probability.
 *
 * CALIBRATION — CalibratedClassifierCV (sigmoid method):
 *   Wraps the frozen HistGradientBoosting classifier. Ensures that a predicted
 *   probability of 0.30 genuinely means ~30% of such cases are fraudulent,
 *   reducing overconfident predictions and false positives.
 *
 * SUPPORTING SIGNALS (sub-scores, NOT credit signals):
 *   identityRiskScore  — Aadhaar/OTP verification failures
 *   deviceRiskScore    — Unknown/shared device signals
 *   velocityRiskScore  — Application and identity velocity (from ML engine counts)
 *   locationRiskScore  — Geographic/IP risk
 *   These four together carry 0.45 of the final weight.
 *
 * WHAT IS NOT FRAUD:
 *   Credit score, annual income, loan amount, existing loans, employment type,
 *   and age are credit-worthiness variables. They are NOT sent to the ML model
 *   and NOT included in the fraud score. Evaluated separately by the lending team.
 *
 * ── Retraining ──────────────────────────────────────────────────────────────
 *   Feedback-driven controlled periodic retraining (not continuous online learning).
 *   Human-confirmed outcomes (0=legitimate, 1=fraud) accumulate in the ML service.
 *   A new candidate model is promoted only if it passes strict evaluation gates:
 *   FPR cap, recall non-regression, anchor set checks, and Brier score non-regression.
 *
 * ── Fallback ────────────────────────────────────────────────────────────────
 *   If the ML service is unavailable, the application is routed to MANUAL_REVIEW
 *   with decisionSource = RULE_FALLBACK_ML_UNAVAILABLE. The application is never
 *   crashed or silently given a fabricated ML score.
 */
@Service
public class FraudModelClient {

    private final ObjectMapper mapper;
    private final HttpClient http;
    private final String baseUrl;
    private final String token;
    private final String identitySecret;
    private final String mode;

    // ── Fraud scoring weights (sum must equal 1.0) ───────────────────────────
    // ML model is the primary driver.
    private final double weightMl;
    private final double weightIdentity;
    private final double weightDevice;
    private final double weightVelocity;
    private final double weightLocation;

    // ── Decision thresholds (applied to finalFraudRiskScore out of 100) ──────
    private final double lowMax;
    private final double reviewMax;

    public FraudModelClient(
            ObjectMapper mapper,
            @Value("${fraud.ml.url:http://127.0.0.1:8001}") String baseUrl,
            @Value("${fraud.ml.token:fraudshield-demo-score-token-2026-local}") String token,
            @Value("${fraud.ml.identity-secret:fraudshield-demo-identity-secret-2026-local}") String identitySecret,
            @Value("${fraud.ml.mode:hybrid}") String mode,
            @Value("${fraud.weight.ml:0.55}") double weightMl,
            @Value("${fraud.weight.identity:0.15}") double weightIdentity,
            @Value("${fraud.weight.device:0.10}") double weightDevice,
            @Value("${fraud.weight.velocity:0.10}") double weightVelocity,
            @Value("${fraud.weight.location:0.10}") double weightLocation,
            @Value("${fraud.decision.low-max:30}") double lowMax,
            @Value("${fraud.decision.review-max:65}") double reviewMax
    ) {
        this.mapper = mapper;
        this.baseUrl = baseUrl.replaceAll("/+$", "");
        this.token = token;
        this.identitySecret = identitySecret;
        this.mode = mode.toLowerCase(Locale.ROOT);
        this.weightMl = weightMl;
        this.weightIdentity = weightIdentity;
        this.weightDevice = weightDevice;
        this.weightVelocity = weightVelocity;
        this.weightLocation = weightLocation;
        this.lowMax = lowMax;
        this.reviewMax = reviewMax;
        this.http = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(2))
                .build();

        if (!java.util.Set.of("off", "shadow", "hybrid").contains(this.mode)) {
            throw new IllegalArgumentException("fraud.ml.mode must be off, shadow or hybrid");
        }
    }

    /**
     * Calls the Python ML service, captures fraud probability + anomaly score,
     * applies the fraud-risk policy, and updates the application entity in-place.
     *
     * The ML model is the primary driver of the final fraud decision.
     * Sub-scores (identity, device, velocity, location) are supporting signals only.
     *
     * @param application  The loan application being assessed (mutated in-place)
     * @param servletRequest The HTTP request for device/IP signals
     */
    public void assess(LoanApplication application, HttpServletRequest servletRequest) {
        application.setMlAssessment(null);
        application.setMlRequestId(null);
        application.setMlFraudProbability(null);
        application.setMlRecommendation(null);
        application.setModelVersion(null);
        application.setAnomalyScore(null);

        if ("off".equals(mode)) {
            application.setDecisionSource("RULES_ML_OFF");
            applyFraudPolicyFromSubScoresOnly(application);
            return;
        }

        String requestId = UUID.randomUUID().toString();
        application.setMlRequestId(requestId);

        try {
            if (token.length() < 24 || identitySecret.length() < 32) {
                throw new IllegalStateException("ML credentials are not configured");
            }

            String nationalIdType = safe(application.getNationalIdType()).toUpperCase(Locale.ROOT);
            String userStableId = application.getUser() == null
                    ? safe(application.getUserId())
                    : safe(application.getUser().getId());
            String nationalIdNumber = userStableId + ":" + safe(application.getAadhaarLast4());

            String identityKey = hmac(nationalIdType + ":" + nationalIdNumber);

            // Use the same non-invasive browser device id that DeviceRiskService uses.
            // Scope trusted demo devices to the user so repeated localhost test accounts
            // do not poison good loans.
            String browserDeviceId = safe(servletRequest.getHeader("X-Device-Id"));
            if (browserDeviceId.isBlank()) {
                browserDeviceId = safe(servletRequest.getRemoteAddr()) + "|" + safe(servletRequest.getHeader("User-Agent"));
            }
            String deviceMaterial = "YES".equalsIgnoreCase(application.getDeviceKnown())
                    ? userStableId + ":" + browserDeviceId
                    : browserDeviceId;
            String deviceKey = hmac("DEVICE:" + deviceMaterial);

            // ── Behavioral telemetry sent to the ML model ────────────────────
            // ONLY fraud/behavioral signals are included. Credit signals (income,
            // credit score, loan amount, employment type) are intentionally omitted.
            // The ML model's FEATURES list never included them; they are credit signals.
            Map<String, Object> telemetry = new LinkedHashMap<>();
            telemetry.put("deviceUnknown", "NO".equalsIgnoreCase(application.getDeviceKnown()) ? 1 : 0);
            telemetry.put("locationRisk", locationRiskInt(application.getLocationRisk()));
            // sessionSeconds, failedLogins24h, ipChanged are -1 (missing) at loan submission time.
            // The ML model handles -1 as "missing telemetry" — never fabricates normal behaviour.
            telemetry.put("sessionSeconds", -1);
            telemetry.put("failedLogins24h", -1);
            telemetry.put("ipChanged", -1);

            // Store what was actually sent to the model (for admin transparency / audit).
            // NOTE: identityApplications24h and deviceIdentities24h are computed server-side
            // by the ML engine from its prediction history — they are not sent from here.
            Map<String, Object> featureVector = new LinkedHashMap<>();
            featureVector.put("identityVerified", Boolean.TRUE.equals(application.getIdentityVerified()) ? 1 : 0);
            featureVector.put("mobileVerified", Boolean.TRUE.equals(application.getMobileVerified()) ? 1 : 0);
            featureVector.put("deviceRisk", safe(application.getDeviceRisk()));
            featureVector.put("locationRisk", safe(application.getLocationRisk()));
            featureVector.put("modelTelemetry", telemetry);
            // Credit fields stored for admin credit assessment display ONLY — not used in fraud scoring.
            featureVector.put("_creditAssessment_creditScore", application.getCreditScore());
            featureVector.put("_creditAssessment_annualIncome", application.getAnnualIncome());
            featureVector.put("_creditAssessment_loanAmount", application.getLoanAmount());
            featureVector.put("_creditAssessment_existingLoans", application.getExistingLoans());
            featureVector.put("_creditAssessment_employmentType", safe(application.getEmploymentType()));
            application.setMlFeatureVector(mapper.writeValueAsString(featureVector));

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("requestId", requestId);
            body.put("identityKey", identityKey);
            body.put("deviceKey", deviceKey);
            body.put("telemetry", telemetry);

            HttpRequest request = HttpRequest.newBuilder(URI.create(baseUrl + "/v1/score"))
                    .timeout(Duration.ofSeconds(4))
                    .header("Authorization", "Bearer " + token)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)))
                    .build();

            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw new IllegalStateException("ML service returned HTTP " + response.statusCode());
            }

            JsonNode result = mapper.readTree(response.body());
            String recommendation = result.path("recommendation").asText();
            double probability = result.path("fraudProbability").asDouble(Double.NaN);
            double anomalyScore = result.path("anomalyScore").asDouble(Double.NaN);
            String modelVersion = result.path("modelVersion").asText();

            // Validate ML response integrity
            if (!requestId.equals(result.path("requestId").asText())
                    || !java.util.Set.of("MANUAL_REVIEW", "NO_FRAUD_ALERT").contains(recommendation)
                    || !Double.isFinite(probability)
                    || probability < 0 || probability > 1
                    || modelVersion.isBlank()) {
                throw new IllegalStateException("Invalid ML response");
            }

            application.setMlAssessment(response.body());
            application.setMlFraudProbability(probability);
            application.setMlRecommendation(recommendation);
            application.setModelVersion(modelVersion);
            application.setModelExplanation("Model explanation unavailable");

            // Capture anomalyScore from IsolationForest (may be NaN if missing)
            if (Double.isFinite(anomalyScore)) {
                application.setAnomalyScore(Math.round(anomalyScore * 1_000_000.0) / 1_000_000.0);
            }

            // Extract ML risk factor reasons from the model response
            List<String> mlReasons = new ArrayList<>();
            JsonNode reasonsNode = result.path("reasons");
            if (reasonsNode.isArray()) {
                for (JsonNode r : reasonsNode) {
                    mlReasons.add(r.asText());
                }
            }

            System.out.printf("""
================ FRAUDSHIELD ML ENGINE ================
Application ID  : %s
Model Version   : %s
ML Fraud Prob   : %.4f (%.1f%%)
Anomaly Score   : %s
ML Reasons      : %s
ML Recommendation: %s
IdentityRiskScore: %.1f
DeviceRiskScore  : %.1f
VelocityRiskScore: %.1f
LocationRiskScore: %.1f
Decision Mode   : %s
=======================================================
""",
                    application.getId() == null ? "PENDING" : application.getId(),
                    modelVersion,
                    probability, probability * 100.0,
                    Double.isFinite(anomalyScore) ? String.format("%.6f", anomalyScore) : "N/A",
                    mlReasons,
                    recommendation,
                    application.getIdentityRiskScore() == null ? 0.0 : application.getIdentityRiskScore(),
                    application.getDeviceRiskScore() == null ? 0.0 : application.getDeviceRiskScore(),
                    application.getVelocityRiskScore() == null ? 0.0 : application.getVelocityRiskScore(),
                    application.getLocationRiskScore() == null ? 0.0 : application.getLocationRiskScore(),
                    mode.toUpperCase());

            if ("shadow".equals(mode)) {
                // Shadow mode: ML data stored but does not affect the decision
                application.setDecisionSource("RULES+ML_SHADOW");
                applyFraudPolicyFromSubScoresOnly(application);
                return;
            }

            // ── Apply final fraud policy driven by the ML model ───────────────
            applyFraudPolicyWithML(application, probability, recommendation, mlReasons);

        } catch (Exception ex) {
            if (ex instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }

            // ── Fallback: ML unavailable → route to MANUAL_REVIEW ───────────
            // Never crash the loan application or pretend ML was used.
            application.setMlAssessment("{\"recommendation\":\"ML_UNAVAILABLE\",\"reasons\":[\"" +
                    escapeJson(ex.getClass().getSimpleName() + ": " + safe(ex.getMessage())) +
                    "\"],\"modelVersion\":null}");
            application.setMlRecommendation("ML_UNAVAILABLE");
            application.setDecisionSource("RULE_FALLBACK_ML_UNAVAILABLE");

            // Route to manual review — never auto-approve or auto-reject without ML
            application.setFraudDecision("MANUAL_REVIEW");
            application.setDecision("MANUAL_REVIEW");
            application.setStatus("UNDER_FRAUD_REVIEW");

            // finalFraudRiskScore from sub-scores only (ML was unavailable)
            double subScoreOnly = computeSubScoreContribution(application);
            application.setFinalFraudRiskScore(Math.round(subScoreOnly * 100.0) / 100.0);
            application.setRiskScore(application.getFinalFraudRiskScore());

            addRiskFactor(application, "ML_SERVICE_UNAVAILABLE");

            System.err.println("[FraudShield ML] unavailable — routed to MANUAL_REVIEW: " + ex.getMessage());
            // Do NOT throw — application submission must succeed even without ML
        }
    }

    /**
     * Applies the final fraud-risk policy when the ML model is available.
     *
     * The ML-calibrated fraud probability carries the highest weight (0.55).
     * The IsolationForest anomaly recommendation is factored in through the
     * mlRecommendation field (MANUAL_REVIEW forces at least MANUAL_REVIEW decision).
     *
     * Final formula:
     *   finalFraudRiskScore =
     *     (weightMl * mlFraudProbability * 100)
     *   + (weightIdentity * identityRiskScore)
     *   + (weightDevice   * deviceRiskScore)
     *   + (weightVelocity * velocityRiskScore)
     *   + (weightLocation * locationRiskScore)
     *
     * Anti-false-positive rule:
     *   If device is unknown BUT identity AND mobile are both verified AND
     *   ML probability is low (<0.15), then device risk contribution is halved.
     *   A single unknown device signal must not produce HIGH_RISK on its own.
     */
    private void applyFraudPolicyWithML(LoanApplication application, double probability,
                                        String recommendation, List<String> mlReasons) {
        double identityRisk = application.getIdentityRiskScore() == null ? 0.0 : application.getIdentityRiskScore();
        double deviceRisk   = application.getDeviceRiskScore()   == null ? 0.0 : application.getDeviceRiskScore();
        double velocityRisk = application.getVelocityRiskScore() == null ? 0.0 : application.getVelocityRiskScore();
        double locationRisk = application.getLocationRiskScore() == null ? 0.0 : application.getLocationRiskScore();

        // Anti-false-positive: halve device risk if identity+mobile are verified and ML is confident it is clean
        if (deviceRisk > 0
                && Boolean.TRUE.equals(application.getIdentityVerified())
                && Boolean.TRUE.equals(application.getMobileVerified())
                && probability < 0.15) {
            deviceRisk = deviceRisk / 2.0;
        }

        // The ML model (HistGradientBoosting + CalibratedClassifierCV) is the primary driver.
        double mlContribution       = weightMl       * probability * 100.0;
        double identityContribution = weightIdentity * identityRisk;
        double deviceContribution   = weightDevice   * deviceRisk;
        double velocityContribution = weightVelocity * velocityRisk;
        double locationContribution = weightLocation * locationRisk;

        double finalRisk = mlContribution + identityContribution + deviceContribution
                         + velocityContribution + locationContribution;
        finalRisk = Math.max(0.0, Math.min(100.0, finalRisk));
        finalRisk = Math.round(finalRisk * 100.0) / 100.0;

        application.setFinalFraudRiskScore(finalRisk);
        application.setRiskScore(finalRisk);         // keep legacy field in sync
        application.setRuleRiskScore(finalRisk);     // keep legacy field in sync

        // Collect fraud risk factor codes from both ML and sub-scores
        List<String> factors = new ArrayList<>(mlReasons);
        if (application.getIdentityRiskScore() != null && application.getIdentityRiskScore() > 0) {
            if (!Boolean.TRUE.equals(application.getIdentityVerified())) factors.add("IDENTITY_VERIFICATION_FAILED");
            if (!Boolean.TRUE.equals(application.getMobileVerified()))  factors.add("MOBILE_VERIFICATION_FAILED");
        }
        if ("NO".equalsIgnoreCase(application.getDeviceKnown())) factors.add("UNKNOWN_DEVICE");
        if (velocityRisk > 0) factors.add("HIGH_APPLICATION_VELOCITY");
        if ("HIGH".equalsIgnoreCase(application.getLocationRisk())) factors.add("HIGH_RISK_LOCATION");
        else if ("MEDIUM".equalsIgnoreCase(application.getLocationRisk())) factors.add("MEDIUM_RISK_LOCATION");
        storeRiskFactors(application, factors);

        // Determine fraud decision
        // ML recommendation can override: MANUAL_REVIEW from model forces at least MANUAL_REVIEW
        String fraudDecision;
        String status;
        if (finalRisk <= lowMax && !"MANUAL_REVIEW".equals(recommendation)) {
            fraudDecision = "LOW_RISK";
            status = "CLEARED_FOR_CREDIT_PROCESSING";
        } else if (finalRisk <= reviewMax || "MANUAL_REVIEW".equals(recommendation)) {
            fraudDecision = "MANUAL_REVIEW";
            status = "UNDER_FRAUD_REVIEW";
        } else {
            fraudDecision = "HIGH_RISK";
            status = "HELD_FOR_INVESTIGATION";
        }

        application.setFraudDecision(fraudDecision);
        application.setDecision(fraudDecision);        // keep legacy field
        application.setStatus(status);
        application.setDecisionSource("ML_FRAUD_ENGINE+RULES");

        System.out.printf("""
── Fraud Policy Decision ─────────────────────────
  ML contribution     : %.2f  (%.1f%% × w=%.2f)
  Identity contribution: %.2f (identityRisk=%.1f × w=%.2f)
  Device contribution  : %.2f (deviceRisk=%.1f × w=%.2f)
  Velocity contribution: %.2f (velocityRisk=%.1f × w=%.2f)
  Location contribution: %.2f (locationRisk=%.1f × w=%.2f)
  ─────────────────────────────────────────────────
  finalFraudRiskScore  : %.2f / 100
  fraudDecision        : %s
  status               : %s
  decisionSource       : ML_FRAUD_ENGINE+RULES
──────────────────────────────────────────────────
""",
                mlContribution,       probability * 100.0, weightMl,
                identityContribution, identityRisk,        weightIdentity,
                deviceContribution,   deviceRisk,          weightDevice,
                velocityContribution, velocityRisk,        weightVelocity,
                locationContribution, locationRisk,        weightLocation,
                finalRisk, fraudDecision, status);
    }

    /**
     * Used when ML is in shadow mode or off — computes the sub-score contribution
     * without the ML probability component.
     */
    private void applyFraudPolicyFromSubScoresOnly(LoanApplication application) {
        double subScore = computeSubScoreContribution(application);
        subScore = Math.max(0.0, Math.min(100.0, subScore));
        subScore = Math.round(subScore * 100.0) / 100.0;
        application.setFinalFraudRiskScore(subScore);
        application.setRiskScore(subScore);
        application.setRuleRiskScore(subScore);

        String fraudDecision;
        String status;
        if (subScore <= lowMax) {
            fraudDecision = "LOW_RISK";
            status = "CLEARED_FOR_CREDIT_PROCESSING";
        } else if (subScore <= reviewMax) {
            fraudDecision = "MANUAL_REVIEW";
            status = "UNDER_FRAUD_REVIEW";
        } else {
            fraudDecision = "HIGH_RISK";
            status = "HELD_FOR_INVESTIGATION";
        }

        application.setFraudDecision(fraudDecision);
        application.setDecision(fraudDecision);
        application.setStatus(status);
    }

    /**
     * Computes the sub-score contribution (without ML).
     * Used for shadow mode and fallback.
     */
    private double computeSubScoreContribution(LoanApplication application) {
        double identityRisk = application.getIdentityRiskScore() == null ? 0.0 : application.getIdentityRiskScore();
        double deviceRisk   = application.getDeviceRiskScore()   == null ? 0.0 : application.getDeviceRiskScore();
        double velocityRisk = application.getVelocityRiskScore() == null ? 0.0 : application.getVelocityRiskScore();
        double locationRisk = application.getLocationRiskScore() == null ? 0.0 : application.getLocationRiskScore();
        return (weightIdentity * identityRisk) + (weightDevice * deviceRisk)
             + (weightVelocity * velocityRisk) + (weightLocation * locationRisk);
    }

    // ─── Risk Factor Helpers ──────────────────────────────────────────────────

    private void addRiskFactor(LoanApplication application, String factor) {
        List<String> factors = new ArrayList<>();
        factors.add(factor);
        storeRiskFactors(application, factors);
    }

    private void storeRiskFactors(LoanApplication application, List<String> factors) {
        try {
            // De-duplicate while preserving order
            List<String> unique = new ArrayList<>();
            for (String f : factors) {
                if (!unique.contains(f)) unique.add(f);
            }
            application.setFraudRiskFactors(mapper.writeValueAsString(unique));
        } catch (Exception ignored) {
            application.setFraudRiskFactors("[\"UNKNOWN\"]");
        }
    }

    // ─── Utilities ────────────────────────────────────────────────────────────

    private String hmac(String value) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(identitySecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
    }

    private static int locationRiskInt(String value) {
        if ("HIGH".equalsIgnoreCase(value))   return 2;
        if ("MEDIUM".equalsIgnoreCase(value)) return 1;
        return 0;
    }

    private static String safe(String value) {
        return value == null ? "" : value;
    }

    private static String safe(Long value) {
        return value == null ? "" : value.toString();
    }

    private static String escapeJson(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
