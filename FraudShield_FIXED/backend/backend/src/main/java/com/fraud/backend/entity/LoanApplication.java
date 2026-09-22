package com.fraud.backend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;

@Entity
@Table(name = "loan_applications")
public class LoanApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Full Name is required")
private String fullName;

    @NotBlank(message = "Email is required")
@Email(message = "Enter a valid email")
private String email;

    private String phone;

    private String panNumber;

   @NotNull(message = "Age is required")
@Min(value = 18, message = "Age must be at least 18")
private Integer age;

    @NotNull(message = "Annual Income is required")
@Positive(message = "Income must be positive")
private Double annualIncome;

    @NotNull(message = "Loan Amount is required")
@Positive(message = "Loan Amount must be positive")
private Double loanAmount;
    @NotNull(message = "Credit Score is required")
@Min(value = 300)
@Max(value = 900)
private Integer creditScore;

    @NotNull(message = "Existing Loans is required")
@Min(value = 0)
private Integer existingLoans;

    @NotBlank(message = "Employment Type is required")
private String employmentType;

    private String deviceKnown;

    private String locationRisk;

    @NotBlank(message = "Loan Purpose is required")
private String loanPurpose;
private String nationalIdType;

private String nationalIdNumber;

private String idDocumentName;
    private Double riskScore;

    // Keep the legacy rule score separately so the dashboard can show that ML is actually used.
    private Double ruleRiskScore;

    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.READ_ONLY)
    @Column(columnDefinition = "TEXT")
    private String mlAssessment;

    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.READ_ONLY)
    private String mlRequestId;

    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.READ_ONLY)
    private Double mlFraudProbability;

    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.READ_ONLY)
    private String mlRecommendation;

    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.READ_ONLY)
    private String modelVersion;

    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.READ_ONLY)
    private String decisionSource;

    private String decision;

    private String status;

    public LoanApplication() {
    }

    public Long getId() {
        return id;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getPanNumber() {
        return panNumber;
    }

    public void setPanNumber(String panNumber) {
        this.panNumber = panNumber;
    }

    public Integer getAge() {
        return age;
    }

    public void setAge(Integer age) {
        this.age = age;
    }

    public Double getAnnualIncome() {
        return annualIncome;
    }

    public void setAnnualIncome(Double annualIncome) {
        this.annualIncome = annualIncome;
    }

    public Double getLoanAmount() {
        return loanAmount;
    }

    public void setLoanAmount(Double loanAmount) {
        this.loanAmount = loanAmount;
    }

    public Integer getCreditScore() {
        return creditScore;
    }

    public void setCreditScore(Integer creditScore) {
        this.creditScore = creditScore;
    }

    public Integer getExistingLoans() {
        return existingLoans;
    }

    public void setExistingLoans(Integer existingLoans) {
        this.existingLoans = existingLoans;
    }

    public String getEmploymentType() {
        return employmentType;
    }

    public void setEmploymentType(String employmentType) {
        this.employmentType = employmentType;
    }

    public String getDeviceKnown() {
        return deviceKnown;
    }

    public void setDeviceKnown(String deviceKnown) {
        this.deviceKnown = deviceKnown;
    }

    public String getLocationRisk() {
        return locationRisk;
    }

    public void setLocationRisk(String locationRisk) {
        this.locationRisk = locationRisk;
    }

    public String getLoanPurpose() {
        return loanPurpose;
    }

    public void setLoanPurpose(String loanPurpose) {
        this.loanPurpose = loanPurpose;
    }
public String getNationalIdType() {
    return nationalIdType;
}

public void setNationalIdType(String nationalIdType) {
    this.nationalIdType = nationalIdType;
}

public String getNationalIdNumber() {
    return nationalIdNumber;
}

public void setNationalIdNumber(String nationalIdNumber) {
    this.nationalIdNumber = nationalIdNumber;
}

public String getIdDocumentName() {
    return idDocumentName;
}

public void setIdDocumentName(String idDocumentName) {
    this.idDocumentName = idDocumentName;
}
    public Double getRiskScore() {
        return riskScore;
    }

    public void setRiskScore(Double riskScore) {
        this.riskScore = riskScore;
    }

    public Double getRuleRiskScore() { return ruleRiskScore; }
    public void setRuleRiskScore(Double ruleRiskScore) { this.ruleRiskScore = ruleRiskScore; }

    public String getMlAssessment() { return mlAssessment; }
    public void setMlAssessment(String mlAssessment) { this.mlAssessment = mlAssessment; }

    public String getMlRequestId() { return mlRequestId; }
    public void setMlRequestId(String mlRequestId) { this.mlRequestId = mlRequestId; }

    public Double getMlFraudProbability() { return mlFraudProbability; }
    public void setMlFraudProbability(Double mlFraudProbability) { this.mlFraudProbability = mlFraudProbability; }

    public String getMlRecommendation() { return mlRecommendation; }
    public void setMlRecommendation(String mlRecommendation) { this.mlRecommendation = mlRecommendation; }

    public String getModelVersion() { return modelVersion; }
    public void setModelVersion(String modelVersion) { this.modelVersion = modelVersion; }

    public String getDecisionSource() { return decisionSource; }
    public void setDecisionSource(String decisionSource) { this.decisionSource = decisionSource; }

    public String getDecision() {
        return decision;
    }

    public void setDecision(String decision) {
        this.decision = decision;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}