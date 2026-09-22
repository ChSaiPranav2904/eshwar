package com.fraud.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fraud.backend.entity.AppUser;
import com.fraud.backend.entity.IdentityVerification;
import com.fraud.backend.entity.LoanApplication;
import com.fraud.backend.repository.IdentityVerificationRepository;
import com.fraud.backend.repository.LoanApplicationRepository;
import jakarta.servlet.http.HttpServletRequest;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Orchestrates the fraud detection pipeline for loan applications.
 *
 * ── Fraud vs. Credit Separation ──────────────────────────────────────────────
 *
 * FRAUD RISK (answered by this service + FraudModelClient + ML):
 *   "Is this applicant's behaviour suspicious or potentially fraudulent?"
 *   Signals: Aadhaar/OTP verification, device fingerprint, location/IP,
 *            application velocity, behavioral anomalies, ML model output.
 *
 * CREDIT ASSESSMENT (answered separately by the lending team):
 *   "Is this applicant financially eligible for a loan?"
 *   Signals: Credit score, annual income, loan amount, existing loans,
 *            employment type, loan-to-income ratio.
 *
 * These two concepts are intentionally kept separate. A low fraud risk score
 * means "No significant fraud indicators detected — continue normal lending
 * process." It does NOT mean "Loan is approved."
 *
 * ── Pipeline ─────────────────────────────────────────────────────────────────
 *   Loan submission
 *   → Identity/OTP verification check
 *   → Device fingerprint + location risk assessment
 *   → Fraud behavioral signal scoring (identity/device/velocity/location)
 *   → Python ML service (HistGradientBoosting + IsolationForest)
 *   → Final fraud-risk policy (FraudModelClient)
 *   → Fraud decision: LOW_RISK | MANUAL_REVIEW | HIGH_RISK
 *
 * ── Actions ──────────────────────────────────────────────────────────────────
 *   LOW_RISK    → CLEARED_FOR_CREDIT_PROCESSING (continue normal lending)
 *   MANUAL_REVIEW → UNDER_FRAUD_REVIEW (step-up verification / analyst review)
 *   HIGH_RISK   → HELD_FOR_INVESTIGATION (fraud investigation)
 *
 * ── Retraining ───────────────────────────────────────────────────────────────
 *   Feedback-driven controlled periodic retraining (NOT continuous online learning).
 *   Human analysts confirm outcomes → ML service accumulates labelled feedback →
 *   periodic retraining → gated promotion only if evaluation checks pass.
 *
 * ── Mistral / Ollama ─────────────────────────────────────────────────────────
 *   Mistral is used ONLY to summarise the fraud analysis in natural language.
 *   It does NOT calculate the fraud score or make any fraud decisions.
 *   The trained Python classifier is solely responsible for fraud probability.
 */
@Service
@Transactional
public class LoanApplicationService {

    private final LoanApplicationRepository repository;
    private final IdentityVerificationRepository identityRepository;
    private final CurrentUserService currentUserService;
    private final DeviceRiskService deviceRiskService;
    private final ChatClient chatClient;
    private final FraudModelClient fraudModelClient;
    private final ObjectMapper mapper;

    public LoanApplicationService(
            LoanApplicationRepository repository,
            IdentityVerificationRepository identityRepository,
            CurrentUserService currentUserService,
            DeviceRiskService deviceRiskService,
            ChatClient.Builder chatClientBuilder,
            FraudModelClient fraudModelClient,
            ObjectMapper mapper
    ) {
        this.repository = repository;
        this.identityRepository = identityRepository;
        this.currentUserService = currentUserService;
        this.deviceRiskService = deviceRiskService;
        this.chatClient = chatClientBuilder.build();
        this.fraudModelClient = fraudModelClient;
        this.mapper = mapper;
    }

    public LoanApplication createApplication(LoanApplication application, HttpServletRequest servletRequest) {
        AppUser user = currentUserService.requireUser();
        IdentityVerification identity = identityRepository.findByUser(user)
                .filter(IdentityVerification::isIdentityVerified)
                .orElseThrow(() -> new IllegalStateException("IDENTITY_VERIFICATION_REQUIRED"));

        // ── Step 1: Bind application to user and identity ─────────────────────
        application.setUser(user);
        application.setEmail(user.getEmail());
        if (application.getFullName() == null || application.getFullName().isBlank()) {
            application.setFullName(identity.getVerifiedName());
        }
        application.setIdentityVerified(identity.isIdentityVerified());
        application.setMobileVerified(identity.isMobileVerified());
        application.setAadhaarLast4(identity.getAadhaarLast4());
        application.setMaskedAadhaar(AadhaarVerificationService.maskAadhaar(identity.getAadhaarLast4()));
        application.setNationalIdType("AADHAAR");
        application.setNationalIdNumber("XXXX XXXX " + identity.getAadhaarLast4());
        application.setApplicantIp(resolveClientIp(servletRequest));

        // ── Step 2: Device fingerprint + location risk ────────────────────────
        Map<String, String> device = deviceRiskService.assess(user, servletRequest.getHeader("X-Device-Id"));
        application.setDeviceKnown(device.get("deviceKnown"));
        application.setDeviceRisk(device.get("deviceRisk"));
        application.setLocationRisk(resolveLocationRisk(application, application.getApplicantIp()));

        // ── Step 3: Compute behavioral fraud signal sub-scores ────────────────
        // IMPORTANT: Only fraud/identity/behavioral signals are used here.
        // Credit score, income, loan amount, employment type, and age are
        // credit-worthiness signals and are intentionally excluded from fraud scoring.
        computeFraudSignalScores(application);

        // ── Step 4: Set initial state before ML call ──────────────────────────
        application.setDecisionSource("FRAUD_SIGNALS_PENDING_ML");
        application.setDecision("MANUAL_REVIEW");
        application.setFraudDecision("MANUAL_REVIEW");
        application.setStatus("UNDER_FRAUD_REVIEW");

        // ── Step 5: Call ML service (primary fraud decision driver) ───────────
        // FraudModelClient sends behavioral telemetry to the Python service.
        // The HistGradientBoosting classifier produces calibrated fraud probability.
        // The IsolationForest detects novel anomalies.
        // FraudModelClient applies the weighted formula and sets finalFraudRiskScore,
        // fraudDecision, status, and decisionSource on the application object.
        fraudModelClient.assess(application, servletRequest);

        LoanApplication saved = repository.save(application);
        logFinalDecision(saved);
        return saved;
    }

    public List<LoanApplication> getAllApplications() {
        return repository.findAll();
    }

    public List<LoanApplication> getMyApplications() {
        return repository.findByUserOrderByCreatedAtDesc(currentUserService.requireUser());
    }

    public LoanApplication getMyApplication(Long id) {
        AppUser user = currentUserService.requireUser();
        LoanApplication application = repository.findById(id).orElseThrow();
        if (application.getUser() == null || !application.getUser().getId().equals(user.getId())) {
            throw new NoSuchElementException("Application not found");
        }
        return application;
    }

    public LoanApplication getAdminApplication(Long id) {
        return repository.findById(id).orElseThrow();
    }

    public Map<String, Object> dashboardSummary() {
        List<LoanApplication> applications = repository.findAll();
        long low    = applications.stream().filter(a -> "LOW_RISK".equals(a.getFraudDecision() != null
                                                            ? a.getFraudDecision() : a.getDecision())).count();
        long review = applications.stream().filter(a -> "MANUAL_REVIEW".equals(a.getFraudDecision() != null
                                                            ? a.getFraudDecision() : a.getDecision())).count();
        long high   = applications.stream().filter(a -> "HIGH_RISK".equals(a.getFraudDecision() != null
                                                            ? a.getFraudDecision() : a.getDecision())).count();
        long cleared = applications.stream().filter(a -> "CLEARED_FOR_CREDIT_PROCESSING".equals(a.getStatus())).count();
        long held    = applications.stream().filter(a -> "HELD_FOR_INVESTIGATION".equals(a.getStatus())).count();
        return Map.of(
                "totalApplications", applications.size(),
                "lowRisk",    low,
                "manualReview", review,
                "highRisk",   high,
                "clearedForCreditProcessing", cleared,
                "heldForInvestigation", held
        );
    }

    /**
     * Returns a structured fraud analysis for the admin dashboard.
     *
     * The response is divided into clearly labelled sections:
     *   fraudAssessment    — ML model output + final fraud score
     *   identitySignals    — Aadhaar/OTP verification status
     *   behavioralSignals  — device, location, velocity signals
     *   fraudRiskFactors   — human-readable risk factor codes
     *   creditAssessment   — credit data (labeled as NOT a fraud indicator)
     *   pipeline           — what was sent to the ML model (for transparency)
     */
    public Map<String, Object> fraudAnalysis(Long id) {
        LoanApplication app = getAdminApplication(id);

        // ── Fraud Assessment ─────────────────────────────────────────────────
        Map<String, Object> fraudAssessment = new LinkedHashMap<>();
        fraudAssessment.put("mlFraudProbability", app.getMlFraudProbability());
        fraudAssessment.put("mlFraudProbabilityPct",
                app.getMlFraudProbability() != null
                    ? String.format("%.2f%%", app.getMlFraudProbability() * 100) : "N/A");
        fraudAssessment.put("anomalyScore", app.getAnomalyScore());
        fraudAssessment.put("mlRecommendation", app.getMlRecommendation());
        fraudAssessment.put("identityRiskScore", app.getIdentityRiskScore());
        fraudAssessment.put("deviceRiskScore", app.getDeviceRiskScore());
        fraudAssessment.put("velocityRiskScore", app.getVelocityRiskScore());
        fraudAssessment.put("locationRiskScore", app.getLocationRiskScore());
        fraudAssessment.put("finalFraudRiskScore", app.getFinalFraudRiskScore());
        fraudAssessment.put("fraudDecision", app.getFraudDecision() != null ? app.getFraudDecision() : app.getDecision());
        fraudAssessment.put("decisionSource", app.getDecisionSource());
        fraudAssessment.put("modelVersion", app.getModelVersion());
        fraudAssessment.put("status", app.getStatus());

        // ── Identity Signals ─────────────────────────────────────────────────
        Map<String, Object> identitySignals = new LinkedHashMap<>();
        identitySignals.put("aadhaarVerified", Boolean.TRUE.equals(app.getIdentityVerified()));
        identitySignals.put("mobileOtpVerified", Boolean.TRUE.equals(app.getMobileVerified()));
        identitySignals.put("maskedAadhaar", app.getMaskedAadhaar());

        // ── Behavioral Signals ───────────────────────────────────────────────
        Map<String, Object> behavioralSignals = new LinkedHashMap<>();
        behavioralSignals.put("deviceKnown", app.getDeviceKnown());
        behavioralSignals.put("deviceRisk", app.getDeviceRisk());
        behavioralSignals.put("locationRisk", app.getLocationRisk());
        behavioralSignals.put("applicantIp", app.getApplicantIp());
        behavioralSignals.put("city", app.getCity());
        behavioralSignals.put("state", app.getState());
        behavioralSignals.put("note_velocity",
            "identityApplications24h and deviceIdentities24h are computed by the ML engine from its internal prediction history.");
        behavioralSignals.put("note_session",
            "sessionSeconds, failedLogins24h, ipChanged are sent as -1 (missing) at loan submission — real-time browser telemetry requires instrumentation.");

        // ── ML Input Pipeline (for admin transparency) ───────────────────────
        Map<String, Object> pipeline = new LinkedHashMap<>();
        pipeline.put("Aadhaar / ID verified", "identityVerified = " + (Boolean.TRUE.equals(app.getIdentityVerified()) ? 1 : 0));
        pipeline.put("Mobile OTP verified",   "mobileVerified = "   + (Boolean.TRUE.equals(app.getMobileVerified()) ? 1 : 0));
        pipeline.put("Device signal",         "deviceKnown = " + app.getDeviceKnown() + ", deviceRisk = " + app.getDeviceRisk());
        pipeline.put("Location signal",       "locationRisk = " + app.getLocationRisk());
        pipeline.put("ML feature vector",     app.getMlFeatureVector());
        pipeline.put("ML model version",      app.getModelVersion());
        pipeline.put("ML fraud probability",  app.getMlFraudProbability());
        pipeline.put("Anomaly score",         app.getAnomalyScore());

        // ── Credit Assessment (separate from fraud) ──────────────────────────
        double loanToIncome = -1.0;
        if (app.getAnnualIncome() != null && app.getAnnualIncome() > 0 && app.getLoanAmount() != null) {
            loanToIncome = Math.round((app.getLoanAmount() / app.getAnnualIncome()) * 10000.0) / 100.0; // as percentage
        }
        Map<String, Object> creditAssessment = new LinkedHashMap<>();
        creditAssessment.put("creditScore", app.getCreditScore());
        creditAssessment.put("annualIncome", app.getAnnualIncome());
        creditAssessment.put("loanAmount", app.getLoanAmount());
        creditAssessment.put("loanToIncomeRatioPct", loanToIncome >= 0 ? loanToIncome + "%" : "N/A");
        creditAssessment.put("employmentType", app.getEmploymentType());
        creditAssessment.put("existingLoans", app.getExistingLoans());
        creditAssessment.put("loanPurpose", app.getLoanPurpose());
        creditAssessment.put("IMPORTANT",
            "Credit data is NOT a fraud indicator. These values are evaluated separately by the lending team. " +
            "A low fraud risk score means 'No significant fraud indicators detected — continue normal lending process.' " +
            "It does NOT mean 'Loan is approved.'");

        return Map.of(
                "application",      app,
                "fraudAssessment",  fraudAssessment,
                "identitySignals",  identitySignals,
                "behavioralSignals", behavioralSignals,
                "fraudRiskFactors", app.getFraudRiskFactors() != null ? app.getFraudRiskFactors() : "[]",
                "creditAssessment", creditAssessment,
                "pipeline",         pipeline,
                "modelExplanation", app.getModelExplanation() == null ? "Model explanation unavailable" : app.getModelExplanation()
        );
    }

    /**
     * Generates a Mistral AI natural-language fraud analysis summary.
     *
     * IMPORTANT: Mistral does NOT calculate the fraud score.
     * It summarises the already-calculated fraud assessment and explains risk factors
     * in analyst-friendly language. The trained Python ML classifier is solely
     * responsible for fraud probability.
     */
    public String reviewLoan(Long id) {
        LoanApplication app = repository.findById(id).orElseThrow();
        String prompt = """
You are a senior fraud analyst at a digital lending institution.

The fraud detection system has already processed this application using:
- A calibrated HistGradientBoosting ML classifier (primary fraud probability)
- An IsolationForest anomaly detector (novel pattern detection)
- Behavioral sub-scores (identity, device, velocity, location signals)

Your task is to provide a clear, analyst-friendly FRAUD ASSESSMENT SUMMARY.
Do NOT calculate a fraud score yourself — use only the data provided below.
Do NOT recommend loan approval or rejection — that is a separate credit decision.

═══════════════════════════════════════════════
FRAUD ASSESSMENT DATA
═══════════════════════════════════════════════
Application ID         : %s
Applicant Name         : %s
City / State           : %s / %s
Applicant IP           : %s

── Identity Signals ──────────────────────────
Aadhaar / ID Verified  : %s
Mobile OTP Verified    : %s
Masked Aadhaar         : %s

── Behavioral / Device Signals ───────────────
Device Known           : %s
Device Risk            : %s
Location Risk          : %s

── ML Model Output ───────────────────────────
ML Fraud Probability   : %s
Anomaly Score          : %s
ML Recommendation      : %s
Model Version          : %s

── Fraud Sub-Scores (0–100) ─────────────────
Identity Risk Score    : %s
Device Risk Score      : %s
Velocity Risk Score    : %s
Location Risk Score    : %s

── Final Fraud Assessment ────────────────────
Final Fraud Risk Score : %s / 100
Fraud Decision         : %s
Decision Source        : %s
Application Status     : %s

── Fraud Risk Factors ────────────────────────
%s

═══════════════════════════════════════════════
CREDIT ASSESSMENT (Separate — NOT part of fraud decision)
═══════════════════════════════════════════════
Credit Score           : %s
Annual Income          : ₹%s
Loan Amount            : ₹%s
Employment Type        : %s
Existing Loans         : %s

NOTE: Credit data above is for context only.
Low fraud risk ≠ loan approved. Credit assessment is done separately.
═══════════════════════════════════════════════

Please provide:

1. **Fraud Risk Summary** — What does the fraud risk score mean for this application?
2. **Key Fraud Signals** — Which signals contributed most to the fraud decision?
3. **Identity Assessment** — Is the identity verification adequate?
4. **Behavioral Assessment** — Are there any suspicious behavioral patterns?
5. **Anomaly Analysis** — Does the IsolationForest anomaly score suggest anything unusual?
6. **Analyst Recommendation** — What should the fraud analyst do next?
   (Options: clear for credit processing / step-up verification / escalate for investigation)

Keep the response professional, concise, and easy to understand.
Do NOT suggest a loan approval or rejection.
""".formatted(
                "FS-2026-" + String.format("%05d", app.getId()),
                app.getFullName(),
                app.getCity() != null ? app.getCity() : "N/A",
                app.getState() != null ? app.getState() : "N/A",
                app.getApplicantIp() != null ? app.getApplicantIp() : "N/A",
                // Identity
                Boolean.TRUE.equals(app.getIdentityVerified()) ? "YES ✓" : "NO ✗",
                Boolean.TRUE.equals(app.getMobileVerified()) ? "YES ✓" : "NO ✗",
                app.getMaskedAadhaar() != null ? app.getMaskedAadhaar() : "N/A",
                // Behavioral
                app.getDeviceKnown(), app.getDeviceRisk(), app.getLocationRisk(),
                // ML output
                app.getMlFraudProbability() == null ? "N/A" : String.format("%.4f (%.2f%%)", app.getMlFraudProbability(), app.getMlFraudProbability() * 100),
                app.getAnomalyScore() == null ? "N/A" : String.format("%.6f", app.getAnomalyScore()),
                app.getMlRecommendation() == null ? "N/A" : app.getMlRecommendation(),
                app.getModelVersion() == null ? "N/A" : app.getModelVersion(),
                // Sub-scores
                app.getIdentityRiskScore() == null ? "N/A" : String.format("%.1f", app.getIdentityRiskScore()),
                app.getDeviceRiskScore() == null ? "N/A" : String.format("%.1f", app.getDeviceRiskScore()),
                app.getVelocityRiskScore() == null ? "N/A" : String.format("%.1f", app.getVelocityRiskScore()),
                app.getLocationRiskScore() == null ? "N/A" : String.format("%.1f", app.getLocationRiskScore()),
                // Final decision
                app.getFinalFraudRiskScore() == null ? "N/A" : String.format("%.2f", app.getFinalFraudRiskScore()),
                app.getFraudDecision() != null ? app.getFraudDecision() : app.getDecision(),
                app.getDecisionSource(),
                app.getStatus(),
                // Risk factors
                app.getFraudRiskFactors() != null ? app.getFraudRiskFactors() : "None detected",
                // Credit (separate section)
                app.getCreditScore(),
                app.getAnnualIncome() != null ? String.format("%.0f", app.getAnnualIncome()) : "N/A",
                app.getLoanAmount() != null ? String.format("%.0f", app.getLoanAmount()) : "N/A",
                app.getEmploymentType(),
                app.getExistingLoans()
        );

        try {
            return chatClient.prompt(prompt).call().content();
        } catch (Exception e) {
            return "AI service is currently unavailable. Please try again later. Error: " + e.getMessage();
        }
    }

    // ─── Private Helpers ──────────────────────────────────────────────────────

    /**
     * Computes behavioral fraud signal sub-scores from identity, device, and location signals.
     *
     * FRAUD signals used:
     *   - identityRiskScore : Aadhaar verification + OTP verification status
     *   - deviceRiskScore   : Unknown device (reduced if identity+mobile both verified)
     *   - velocityRiskScore : Will be enriched by ML engine counts (identityApplications24h / deviceIdentities24h)
     *   - locationRiskScore : Geographic / IP risk level
     *
     * CREDIT signals intentionally excluded (evaluated separately):
     *   Credit score, annual income, loan amount, existing loans,
     *   employment type, loan-to-income ratio, age.
     */
    private static void computeFraudSignalScores(LoanApplication application) {
        // ── Identity Risk (0-100) ─────────────────────────────────────────────
        double identityRisk = 0.0;
        if (!Boolean.TRUE.equals(application.getIdentityVerified())) identityRisk += 60.0; // Aadhaar unverified
        if (!Boolean.TRUE.equals(application.getMobileVerified()))   identityRisk += 40.0; // OTP unverified
        // identityRisk capped at 100
        identityRisk = Math.min(identityRisk, 100.0);
        application.setIdentityRiskScore(identityRisk);

        // ── Device Risk (0-100) ───────────────────────────────────────────────
        double deviceRisk = 0.0;
        if ("NO".equalsIgnoreCase(application.getDeviceKnown())) {
            deviceRisk = 60.0; // Unknown device
        }
        // Note: anti-false-positive halving (when identity+mobile verified + low ML prob)
        // is applied in FraudModelClient.applyFraudPolicyWithML() after ML result is known.
        application.setDeviceRiskScore(deviceRisk);

        // ── Velocity Risk (0-100) ─────────────────────────────────────────────
        // Primary velocity signals (identityApplications24h, deviceIdentities24h) are
        // computed by the ML engine server-side from its prediction history and fed
        // directly into the ML model's feature vector. They influence ML fraud probability.
        // Rule-based velocity risk starts at 0 here — the ML model carries this signal.
        application.setVelocityRiskScore(0.0);

        // ── Location Risk (0-100) ─────────────────────────────────────────────
        double locationRisk = 0.0;
        String loc = application.getLocationRisk();
        if ("HIGH".equalsIgnoreCase(loc))        locationRisk = 80.0;
        else if ("MEDIUM".equalsIgnoreCase(loc)) locationRisk = 40.0;
        else if ("UNKNOWN".equalsIgnoreCase(loc)) locationRisk = 20.0;
        application.setLocationRiskScore(locationRisk);
    }

    private static String resolveClientIp(HttpServletRequest request) {
        String clientIp = request.getHeader("X-Forwarded-For");
        if (clientIp == null || clientIp.isBlank()) {
            clientIp = request.getRemoteAddr();
        } else {
            clientIp = clientIp.split(",")[0].trim();
        }
        return clientIp == null || clientIp.isBlank() ? "LOCAL_DEVELOPMENT" : clientIp;
    }

    private static String resolveLocationRisk(LoanApplication application, String clientIp) {
        if (application.getCity() == null || application.getCity().isBlank()
                || application.getState() == null || application.getState().isBlank()) {
            return "UNKNOWN";
        }
        if (clientIp.startsWith("127.") || clientIp.equals("0:0:0:0:0:0:0:1") || clientIp.equals("::1")) {
            return "LOW";
        }
        return "MEDIUM";
    }

    private void logFinalDecision(LoanApplication app) {
        try {
            System.out.printf(
                "═══ FraudShield Final Decision ══════════════════════════════════%n" +
                "  Application ID     : %s%n" +
                "  Fraud Decision     : %s%n" +
                "  Final Fraud Score  : %s / 100%n" +
                "  ML Fraud Prob      : %s%n" +
                "  Anomaly Score      : %s%n" +
                "  Identity Risk      : %s%n" +
                "  Device Risk        : %s%n" +
                "  Velocity Risk      : %s%n" +
                "  Location Risk      : %s%n" +
                "  Decision Source    : %s%n" +
                "  Status             : %s%n" +
                "  Risk Factors       : %s%n" +
                "═══════════════════════════════════════════════════════════════%n",
                app.getId(),
                app.getFraudDecision() != null ? app.getFraudDecision() : app.getDecision(),
                app.getFinalFraudRiskScore(),
                app.getMlFraudProbability() == null ? "N/A" : String.format("%.4f", app.getMlFraudProbability()),
                app.getAnomalyScore() == null ? "N/A" : String.format("%.6f", app.getAnomalyScore()),
                app.getIdentityRiskScore(),
                app.getDeviceRiskScore(),
                app.getVelocityRiskScore(),
                app.getLocationRiskScore(),
                app.getDecisionSource(),
                app.getStatus(),
                app.getFraudRiskFactors()
            );
        } catch (Exception ignored) {
            System.out.printf("Final fraud decision for application %s: %s%n", app.getId(), app.getFraudDecision());
        }
    }
}
