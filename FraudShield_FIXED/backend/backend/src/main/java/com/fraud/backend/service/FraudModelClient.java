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
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class FraudModelClient {

    private final ObjectMapper mapper;
    private final HttpClient http;
    private final String baseUrl;
    private final String token;
    private final String identitySecret;
    private final String mode;

    public FraudModelClient(
            ObjectMapper mapper,
            @Value("${fraud.ml.url:http://127.0.0.1:8001}") String baseUrl,
            @Value("${fraud.ml.token:fraudshield-demo-score-token-2026-local}") String token,
            @Value("${fraud.ml.identity-secret:fraudshield-demo-identity-secret-2026-local}") String identitySecret,
            @Value("${fraud.ml.mode:hybrid}") String mode
    ) {
        this.mapper = mapper;
        this.baseUrl = baseUrl.replaceAll("/+$", "");
        this.token = token;
        this.identitySecret = identitySecret;
        this.mode = mode.toLowerCase(Locale.ROOT);
        this.http = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(2))
                .build();

        if (!java.util.Set.of("off", "shadow", "hybrid").contains(this.mode)) {
            throw new IllegalArgumentException("fraud.ml.mode must be off, shadow or hybrid");
        }
    }

    public void assess(LoanApplication application, HttpServletRequest servletRequest) {
        application.setMlAssessment(null);
        application.setMlRequestId(null);
        application.setMlFraudProbability(null);
        application.setMlRecommendation(null);
        application.setModelVersion(null);

        if ("off".equals(mode)) {
            application.setDecisionSource("RULES_ML_OFF");
            return;
        }

        String requestId = UUID.randomUUID().toString();
        application.setMlRequestId(requestId);

        try {
            if (token.length() < 24 || identitySecret.length() < 32) {
                throw new IllegalStateException("ML credentials are not configured");
            }

            String nationalIdType = safe(application.getNationalIdType()).toUpperCase(Locale.ROOT);
            String nationalIdNumber = safe(application.getNationalIdNumber())
                    .replaceAll("\\s+", "")
                    .toUpperCase(Locale.ROOT);

            String identityKey = hmac(nationalIdType + ":" + nationalIdNumber);

            // Demo device fingerprint. It is generated on the backend so the ML service receives
            // a stable pseudonymous key instead of raw IP/User-Agent values.
            String deviceMaterial = safe(servletRequest.getRemoteAddr()) + "|" +
                    safe(servletRequest.getHeader("User-Agent"));
            String deviceKey = hmac("DEVICE:" + deviceMaterial);

            Map<String, Object> telemetry = new LinkedHashMap<>();
            telemetry.put("deviceUnknown", "NO".equalsIgnoreCase(application.getDeviceKnown()) ? 1 : 0);
            telemetry.put("locationRisk", locationRisk(application.getLocationRisk()));

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
            String modelVersion = result.path("modelVersion").asText();

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

            System.out.printf("[FraudShield ML] request=%s probability=%.4f recommendation=%s model=%s%n",
                    requestId, probability, recommendation, modelVersion);

            if ("shadow".equals(mode)) {
                application.setDecisionSource("RULES+ML_SHADOW");
                return;
            }

            applyHybridDecision(application, probability, recommendation);

        } catch (Exception ex) {
            if (ex instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }

            application.setMlAssessment("{\"recommendation\":\"ML_UNAVAILABLE\",\"reasons\":[\"" +
                    escapeJson(ex.getClass().getSimpleName() + ": " + safe(ex.getMessage())) +
                    "\"],\"modelVersion\":null}");
            application.setMlRecommendation("ML_UNAVAILABLE");
            application.setDecisionSource("RULE_FALLBACK_ML_UNAVAILABLE");

            System.err.println("[FraudShield ML] unavailable: " + ex.getMessage());
        }
    }

    private void applyHybridDecision(LoanApplication application, double probability, String recommendation) {
        double ruleRisk = application.getRuleRiskScore() != null
                ? application.getRuleRiskScore()
                : (application.getRiskScore() == null ? 0.0 : application.getRiskScore());
        double mlRisk = probability * 100.0;

        // Hybrid score: preserve the existing credit/rule signal while allowing the trained
        // fraud model to materially affect the final risk shown by the application.
        double finalRisk = Math.round((0.55 * ruleRisk + 0.45 * mlRisk) * 100.0) / 100.0;
        finalRisk = Math.max(0.0, Math.min(100.0, finalRisk));
        application.setRiskScore(finalRisk);

        if (finalRisk >= 70) {
            application.setDecision("REJECTED");
            application.setStatus("HIGH_RISK");
        } else if (finalRisk >= 40 || "MANUAL_REVIEW".equals(recommendation)) {
            application.setDecision("MANUAL_REVIEW");
            application.setStatus("MEDIUM_RISK");
        } else {
            application.setDecision("APPROVED");
            application.setStatus("LOW_RISK");
        }
        application.setDecisionSource("HYBRID_RULES+ML");
    }

    private String hmac(String value) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(identitySecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
    }

    private static int locationRisk(String value) {
        if ("HIGH".equalsIgnoreCase(value)) return 2;
        if ("MEDIUM".equalsIgnoreCase(value)) return 1;
        return 0;
    }

    private static String safe(String value) {
        return value == null ? "" : value;
    }

    private static String escapeJson(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
