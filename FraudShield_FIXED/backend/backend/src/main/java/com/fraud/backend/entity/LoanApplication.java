package com.fraud.backend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;

@Entity
@Table(name = "loan_applications")
public class LoanApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private AppUser user;

    @Column(name = "user_id", insertable = false, updatable = false)
    private Long userId;

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

    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.READ_ONLY)
    private String deviceKnown;

    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.READ_ONLY)
    private String locationRisk;

    private String city;

    private String state;

    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.READ_ONLY)
    private String applicantIp;

    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.READ_ONLY)
    private String deviceRisk;

    @NotBlank(message = "Loan Purpose is required")
    private String loanPurpose;

    @NotBlank(message = "National ID Type is required")
    private String nationalIdType;

    @NotBlank(message = "National ID Number is required")
    private String nationalIdNumber;

    private String idDocumentName;

    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.READ_ONLY)
    private Boolean identityVerified;

    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.READ_ONLY)
    private Boolean mobileVerified;

    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.READ_ONLY)
    private String aadhaarLast4;

    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.READ_ONLY)
    private String maskedAadhaar;

    private Double riskScore;

    // Keep the legacy rule score separately so the dashboard can show that ML is actually used.
    private Double ruleRiskScore;

    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.READ_ONLY)
    @Column(columnDefinition = "TEXT")
    private String mlAssessment;

    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.READ_ONLY)
    @Column(columnDefinition = "TEXT")
    private String mlFeatureVector;

    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.READ_ONLY)
    @Column(columnDefinition = "TEXT")
    private String modelExplanation;

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

    private String actualOutcome = "UNKNOWN";

    private String reviewedBy;

    private java.time.LocalDateTime reviewedAt;

    @org.hibernate.annotations.CreationTimestamp
    @Column(updatable = false)
    private java.time.LocalDateTime createdAt;

    @org.hibernate.annotations.UpdateTimestamp
    private java.time.LocalDateTime updatedAt;

    public LoanApplication() {
    }

    public Long getId() {
        return id;
    }

    public AppUser getUser() {
        return user;
    }

    public void setUser(AppUser user) {
        this.user = user;
    }

    public Long getUserId() {
        return userId;
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

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getState() {
        return state;
    }

    public void setState(String state) {
        this.state = state;
    }

    public String getApplicantIp() {
        return applicantIp;
    }

    public void setApplicantIp(String applicantIp) {
        this.applicantIp = applicantIp;
    }

    public String getDeviceRisk() {
        return deviceRisk;
    }

    public void setDeviceRisk(String deviceRisk) {
        this.deviceRisk = deviceRisk;
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
    public Boolean getIdentityVerified() { return identityVerified; }
    public void setIdentityVerified(Boolean identityVerified) { this.identityVerified = identityVerified; }

    public Boolean getMobileVerified() { return mobileVerified; }
    public void setMobileVerified(Boolean mobileVerified) { this.mobileVerified = mobileVerified; }

    public String getAadhaarLast4() { return aadhaarLast4; }
    public void setAadhaarLast4(String aadhaarLast4) { this.aadhaarLast4 = aadhaarLast4; }

    public String getMaskedAadhaar() { return maskedAadhaar; }
    public void setMaskedAadhaar(String maskedAadhaar) { this.maskedAadhaar = maskedAadhaar; }

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

    public String getMlFeatureVector() { return mlFeatureVector; }
    public void setMlFeatureVector(String mlFeatureVector) { this.mlFeatureVector = mlFeatureVector; }

    public String getModelExplanation() { return modelExplanation; }
    public void setModelExplanation(String modelExplanation) { this.modelExplanation = modelExplanation; }

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

    public String getActualOutcome() { return actualOutcome; }
    public void setActualOutcome(String actualOutcome) { this.actualOutcome = actualOutcome; }

    public String getReviewedBy() { return reviewedBy; }
    public void setReviewedBy(String reviewedBy) { this.reviewedBy = reviewedBy; }

    public java.time.LocalDateTime getReviewedAt() { return reviewedAt; }
    public void setReviewedAt(java.time.LocalDateTime reviewedAt) { this.reviewedAt = reviewedAt; }

    public java.time.LocalDateTime getCreatedAt() { return createdAt; }

    public java.time.LocalDateTime getUpdatedAt() { return updatedAt; }
}
