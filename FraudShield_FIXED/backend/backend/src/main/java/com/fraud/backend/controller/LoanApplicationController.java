package com.fraud.backend.controller;

import com.fraud.backend.entity.LoanApplication;
import com.fraud.backend.repository.LoanApplicationRepository;
import com.fraud.backend.service.FraudModelClient;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/loan")
@CrossOrigin(origins = "http://localhost:5174")
public class LoanApplicationController {

    private final LoanApplicationRepository repository;
    private final ChatClient chatClient;
    private final FraudModelClient fraudModelClient;

    public LoanApplicationController(
            LoanApplicationRepository repository,
            ChatClient.Builder chatClientBuilder,
            FraudModelClient fraudModelClient
    ) {
        this.repository = repository;
        this.chatClient = chatClientBuilder.build();
        this.fraudModelClient = fraudModelClient;
    }

    @PostMapping
public LoanApplication createApplication(
        @Valid @RequestBody LoanApplication application,
        HttpServletRequest servletRequest
) {if (application.getNationalIdType() == null ||
    application.getNationalIdType().isBlank()) {

    throw new RuntimeException(
        "National ID Type is required"
    );
}

if (application.getNationalIdNumber() == null ||
    application.getNationalIdNumber().isBlank()) {

    throw new RuntimeException(
        "National ID Number is required"
    );
}

    // REQUIRED FIELD VALIDATION

    if (application.getFullName() == null ||
        application.getFullName().trim().isEmpty()) {
        throw new RuntimeException("Full Name is required");
    }

    if (application.getEmail() == null ||
        application.getEmail().trim().isEmpty()) {
        throw new RuntimeException("Email is required");
    }

    if (application.getAge() == null) {
        throw new RuntimeException("Age is required");
    }

    if (application.getAnnualIncome() == null) {
        throw new RuntimeException("Annual Income is required");
    }

    if (application.getLoanAmount() == null) {
        throw new RuntimeException("Loan Amount is required");
    }

    if (application.getCreditScore() == null) {
        throw new RuntimeException("Credit Score is required");
    }

    if (application.getExistingLoans() == null) {
        throw new RuntimeException("Existing Loans is required");
    }

    if (application.getEmploymentType() == null ||
        application.getEmploymentType().trim().isEmpty()) {
        throw new RuntimeException("Employment Type is required");
    }

    if (application.getLoanPurpose() == null ||
        application.getLoanPurpose().trim().isEmpty()) {
        throw new RuntimeException("Loan Purpose is required");
    }

    double risk = 0;

        // Credit Score
        if (application.getCreditScore() != null) {

            if (application.getCreditScore() < 550)
                risk += 35;
            else if (application.getCreditScore() < 650)
                risk += 20;
            else if (application.getCreditScore() < 750)
                risk += 10;
            else
                risk += 2;
        }

        // Existing Loans
        if (application.getExistingLoans() != null) {
            risk += application.getExistingLoans() * 5;
        }

        // Income vs Loan Amount
        if (application.getAnnualIncome() != null &&
                application.getLoanAmount() != null &&
                application.getAnnualIncome() > 0) {

            double ratio =
                    application.getLoanAmount()
                            / application.getAnnualIncome();

            if (ratio > 1.0)
                risk += 30;
            else if (ratio > 0.5)
                risk += 15;
            else if (ratio > 0.3)
                risk += 8;
        }

        // Employment
if ("STUDENT".equalsIgnoreCase(application.getEmploymentType()))
    risk += 10;

if ("SELF_EMPLOYED".equalsIgnoreCase(application.getEmploymentType()))
    risk += 5;

// National ID Verification

if (application.getNationalIdNumber() != null) {

    if (application.getNationalIdNumber().length() < 8)
        risk += 20;

    if (application.getNationalIdNumber().contains("1234"))
        risk += 15;
}

// Device Trust
if ("NO".equalsIgnoreCase(application.getDeviceKnown()))
    risk += 15;

        // Location Risk
        if ("HIGH".equalsIgnoreCase(application.getLocationRisk()))
            risk += 15;
        else if ("MEDIUM".equalsIgnoreCase(application.getLocationRisk()))
            risk += 8;

        // Age Risk
        if (application.getAge() != null) {

            if (application.getAge() < 21)
                risk += 10;

            if (application.getAge() > 65)
                risk += 8;
        }

        risk = Math.min(risk, 100);

        application.setRuleRiskScore(risk);
        application.setRiskScore(risk);
        application.setDecisionSource("RULES_PENDING_ML");

        if (risk >= 70) {
            application.setDecision("REJECTED");
            application.setStatus("HIGH_RISK");
        }
        else if (risk >= 40) {
            application.setDecision("MANUAL_REVIEW");
            application.setStatus("MEDIUM_RISK");
        }
        else {
            application.setDecision("APPROVED");
            application.setStatus("LOW_RISK");
        }

        // IMPORTANT: the trained Python model is called before persistence. In hybrid mode it
        // materially changes the final risk/decision; in shadow mode it only records the result.
        fraudModelClient.assess(application, servletRequest);

        LoanApplication saved = repository.save(application);

System.out.println("SAVED ID = " + saved.getId());

return saved;
    }

    @GetMapping
    public List<LoanApplication> getAllApplications() {
        return repository.findAll();
    }

    @GetMapping("/ai-review/{id}")
    public String reviewLoan(@PathVariable Long id) {

        LoanApplication app =
                repository.findById(id)
                        .orElseThrow();

        String prompt = """
You are a senior banking risk analyst.

Analyze this loan application.

Applicant Name: %s
Age: %d
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
"""
        .formatted(
                app.getFullName(),
                app.getAge(),
                app.getAnnualIncome(),
                app.getLoanAmount(),
                app.getCreditScore(),
                app.getEmploymentType(),
                app.getExistingLoans(),
                app.getDeviceKnown(),
                app.getLocationRisk(),
                app.getRuleRiskScore() == null ? app.getRiskScore() : app.getRuleRiskScore(),
                app.getMlFraudProbability() == null ? "N/A" : String.format("%.2f%%", app.getMlFraudProbability() * 100),
                app.getMlRecommendation() == null ? "N/A" : app.getMlRecommendation(),
                app.getModelVersion() == null ? "N/A" : app.getModelVersion(),
                app.getRiskScore(),
                app.getDecisionSource(),
                app.getDecision()
        );

        return chatClient
                .prompt(prompt)
                .call()
                .content();
    }
}