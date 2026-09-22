package com.fraud.backend.service;

import com.fraud.backend.entity.LoanApplication;
import com.fraud.backend.repository.LoanApplicationRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class LoanApplicationService {

    private final LoanApplicationRepository repository;
    private final ChatClient chatClient;
    private final FraudModelClient fraudModelClient;

    public LoanApplicationService(
            LoanApplicationRepository repository,
            ChatClient.Builder chatClientBuilder,
            FraudModelClient fraudModelClient
    ) {
        this.repository = repository;
        this.chatClient = chatClientBuilder.build();
        this.fraudModelClient = fraudModelClient;
    }

    public LoanApplication createApplication(LoanApplication application, HttpServletRequest servletRequest) {
        String clientIp = servletRequest.getHeader("X-Forwarded-For");
        if (clientIp == null || clientIp.isBlank()) {
            clientIp = servletRequest.getRemoteAddr();
        } else {
            clientIp = clientIp.split(",")[0].trim();
        }
        application.setApplicantIp(clientIp);

        String userAgent = servletRequest.getHeader("User-Agent");
        if (userAgent == null || userAgent.isBlank() || userAgent.length() < 10) {
            application.setDeviceKnown("NO");
        } else {
            application.setDeviceKnown("YES");
        }

        String locationRiskLevel = "LOW";
        String city = application.getCity();
        String state = application.getState();

        if (city == null || city.isBlank() || state == null || state.isBlank()) {
            locationRiskLevel = "HIGH";
        } else if (clientIp.startsWith("127.") || clientIp.equals("0:0:0:0:0:0:0:1") || clientIp.equals("::1")) {
            locationRiskLevel = "LOW";
        } else {
            locationRiskLevel = "MEDIUM";
        }
        application.setLocationRisk(locationRiskLevel);

        double risk = 0;

        if (application.getCreditScore() != null) {
            if (application.getCreditScore() < 550) risk += 35;
            else if (application.getCreditScore() < 650) risk += 20;
            else if (application.getCreditScore() < 750) risk += 10;
            else risk += 2;
        }

        if (application.getExistingLoans() != null) {
            risk += application.getExistingLoans() * 5;
        }

        if (application.getAnnualIncome() != null && application.getLoanAmount() != null && application.getAnnualIncome() > 0) {
            double ratio = application.getLoanAmount() / application.getAnnualIncome();
            if (ratio > 1.0) risk += 30;
            else if (ratio > 0.5) risk += 15;
            else if (ratio > 0.3) risk += 8;
        }

        if ("STUDENT".equalsIgnoreCase(application.getEmploymentType())) risk += 10;
        if ("SELF_EMPLOYED".equalsIgnoreCase(application.getEmploymentType())) risk += 5;

        if (application.getNationalIdNumber() != null) {
            if (application.getNationalIdNumber().length() < 8) risk += 20;
            if (application.getNationalIdNumber().contains("1234")) risk += 15;
        }

        if ("NO".equalsIgnoreCase(application.getDeviceKnown())) risk += 15;

        if ("HIGH".equalsIgnoreCase(application.getLocationRisk())) risk += 15;
        else if ("MEDIUM".equalsIgnoreCase(application.getLocationRisk())) risk += 8;

        if (application.getAge() != null) {
            if (application.getAge() < 21) risk += 10;
            if (application.getAge() > 65) risk += 8;
        }

        risk = Math.min(risk, 100);

        application.setRuleRiskScore(risk);
        application.setRiskScore(risk);
        application.setDecisionSource("RULES_PENDING_ML");

        if (risk >= 70) {
            application.setDecision("REJECTED");
            application.setStatus("HIGH_RISK");
        } else if (risk >= 40) {
            application.setDecision("MANUAL_REVIEW");
            application.setStatus("MEDIUM_RISK");
        } else {
            application.setDecision("APPROVED");
            application.setStatus("LOW_RISK");
        }

        fraudModelClient.assess(application, servletRequest);

        return repository.save(application);
    }

    public List<LoanApplication> getAllApplications() {
        return repository.findAll();
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
Device Known: %s
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
                app.getDeviceKnown(), app.getLocationRisk(),
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
}
