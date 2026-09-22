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

        Map<String, String> device = deviceRiskService.assess(user, servletRequest.getHeader("X-Device-Id"));
        application.setDeviceKnown(device.get("deviceKnown"));
        application.setDeviceRisk(device.get("deviceRisk"));
        application.setLocationRisk(resolveLocationRisk(application, application.getApplicantIp()));

        double ruleRisk = calculateRuleRisk(application);
        application.setRuleRiskScore(ruleRisk);
        application.setRiskScore(ruleRisk);
        application.setDecisionSource("RULES_PENDING_ML");
        application.setDecision(preliminaryDecision(ruleRisk));
        application.setStatus("UNDER_REVIEW");

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
        long low = applications.stream().filter(a -> "LOW_RISK".equals(a.getDecision())).count();
        long review = applications.stream().filter(a -> "MANUAL_REVIEW".equals(a.getDecision())).count();
        long high = applications.stream().filter(a -> "HIGH_RISK".equals(a.getDecision())).count();
        long approved = applications.stream().filter(a -> "APPROVED".equals(a.getStatus())).count();
        long rejected = applications.stream().filter(a -> "REJECTED".equals(a.getStatus())).count();
        return Map.of(
                "totalApplications", applications.size(),
                "lowRisk", low,
                "manualReview", review,
                "highRisk", high,
                "approved", approved,
                "rejected", rejected
        );
    }

    public Map<String, Object> fraudAnalysis(Long id) {
        LoanApplication app = getAdminApplication(id);
        Map<String, Object> pipeline = new LinkedHashMap<>();
        pipeline.put("Aadhaar / ID verified", "identityVerified = " + (Boolean.TRUE.equals(app.getIdentityVerified()) ? 1 : 0));
        pipeline.put("Mobile OTP verified", "mobileVerified = " + (Boolean.TRUE.equals(app.getMobileVerified()) ? 1 : 0));
        pipeline.put("Unknown device", "deviceRisk = " + app.getDeviceRisk());
        pipeline.put("Location anomaly", "locationRisk = " + app.getLocationRisk());
        pipeline.put("Financial/application features", app.getMlFeatureVector());
        pipeline.put("Fraud ML Model", "modelVersion = " + app.getModelVersion());
        pipeline.put("Fraud Probability", app.getMlFraudProbability());

        return Map.of(
                "application", app,
                "pipeline", pipeline,
                "modelExplanation", app.getModelExplanation() == null ? "Model explanation unavailable" : app.getModelExplanation()
        );
    }

    public String reviewLoan(Long id) {
        LoanApplication app = repository.findById(id).orElseThrow();
        String prompt = """
You are a senior banking risk analyst.

Analyze this loan application.

Applicant Name: %s
Age: %d
City: %s
State: %s
Applicant IP: %s
Annual Income: %.2f
Loan Amount: %.2f
Credit Score: %d
Employment Type: %s
Existing Loans: %d
Identity Verified: %s
Mobile Verified: %s
Device Known: %s
Device Risk: %s
Location Risk: %s
Rule Risk Score: %.2f
ML Fraud Probability: %s
ML Recommendation: %s
Model Version: %s
Final Risk Score: %.2f
Decision Source: %s
Decision: %s

Provide:

1. Overall Risk Assessment
2. Key Positive Factors
3. Key Risk Factors
4. Fraud Indicators (if any)
5. Final Recommendation

Keep the response professional and easy to understand.
""".formatted(
                app.getFullName(), app.getAge(),
                app.getCity() != null ? app.getCity() : "N/A",
                app.getState() != null ? app.getState() : "N/A",
                app.getApplicantIp() != null ? app.getApplicantIp() : "N/A",
                app.getAnnualIncome(), app.getLoanAmount(),
                app.getCreditScore(), app.getEmploymentType(), app.getExistingLoans(),
                app.getIdentityVerified(), app.getMobileVerified(),
                app.getDeviceKnown(), app.getDeviceRisk(), app.getLocationRisk(),
                app.getRuleRiskScore() == null ? app.getRiskScore() : app.getRuleRiskScore(),
                app.getMlFraudProbability() == null ? "N/A" : String.format("%.2f%%", app.getMlFraudProbability() * 100),
                app.getMlRecommendation() == null ? "N/A" : app.getMlRecommendation(),
                app.getModelVersion() == null ? "N/A" : app.getModelVersion(),
                app.getRiskScore(), app.getDecisionSource(), app.getDecision()
        );

        try {
            return chatClient.prompt(prompt).call().content();
        } catch (Exception e) {
            return "AI service is currently unavailable. Please try again later. Error: " + e.getMessage();
        }
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

    private static double calculateRuleRisk(LoanApplication application) {
        double risk = 0;
        if (application.getCreditScore() != null) {
            if (application.getCreditScore() < 550) risk += 35;
            else if (application.getCreditScore() < 650) risk += 20;
            else if (application.getCreditScore() < 750) risk += 10;
            else risk += 2;
        }
        if (application.getExistingLoans() != null) {
            risk += Math.min(application.getExistingLoans() * 5.0, 25.0);
        }
        if (application.getAnnualIncome() != null && application.getLoanAmount() != null && application.getAnnualIncome() > 0) {
            double ratio = application.getLoanAmount() / application.getAnnualIncome();
            if (ratio > 1.0) risk += 30;
            else if (ratio > 0.5) risk += 15;
            else if (ratio > 0.3) risk += 8;
        }
        if ("STUDENT".equalsIgnoreCase(application.getEmploymentType())) risk += 10;
        if ("SELF_EMPLOYED".equalsIgnoreCase(application.getEmploymentType())) risk += 5;
        if ("NO".equalsIgnoreCase(application.getDeviceKnown())) risk += 15;
        if ("HIGH".equalsIgnoreCase(application.getLocationRisk())) risk += 15;
        else if ("MEDIUM".equalsIgnoreCase(application.getLocationRisk())) risk += 8;
        if (application.getAge() != null) {
            if (application.getAge() < 21) risk += 10;
            if (application.getAge() > 65) risk += 8;
        }
        if (!Boolean.TRUE.equals(application.getIdentityVerified())) risk += 25;
        if (!Boolean.TRUE.equals(application.getMobileVerified())) risk += 15;
        return Math.min(risk, 100);
    }

    private static String preliminaryDecision(double risk) {
        if (risk <= 30) return "LOW_RISK";
        if (risk <= 60) return "MANUAL_REVIEW";
        return "HIGH_RISK";
    }

    private void logFinalDecision(LoanApplication app) {
        try {
            System.out.printf("Final stored feature vector for application %s: %s%n",
                    app.getId(), mapper.writeValueAsString(Map.of(
                            "mlFraudProbability", app.getMlFraudProbability(),
                            "ruleBasedScore", app.getRuleRiskScore(),
                            "finalRiskScore", app.getRiskScore(),
                            "decision", app.getDecision(),
                            "featureVector", app.getMlFeatureVector()
                    )));
        } catch (Exception ignored) {
            System.out.printf("Final decision for application %s: %s%n", app.getId(), app.getDecision());
        }
    }
}
