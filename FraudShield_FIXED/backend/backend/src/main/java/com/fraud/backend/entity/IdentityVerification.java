package com.fraud.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "identity_verifications")
public class IdentityVerification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private AppUser user;

    @Column(name = "verification_method")
    private String verificationMethod;

    @Column(name = "verified_name")
    private String verifiedName;

    @Column(name = "verified_dob")
    private String verifiedDob;

    @Column(name = "verified_gender")
    private String verifiedGender;

    @Column(name = "verified_address", columnDefinition = "TEXT")
    private String verifiedAddress;

    @Column(name = "aadhaar_last4")
    private String aadhaarLast4;

    @Column(name = "aadhaar_verified", nullable = false)
    private boolean aadhaarVerified;

    @Column(name = "mobile_number_masked")
    private String mobileNumberMasked;

    @Column(name = "mobile_verified", nullable = false)
    private boolean mobileVerified;

    @Column(name = "identity_verified", nullable = false)
    private boolean identityVerified;

    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    @org.hibernate.annotations.CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @org.hibernate.annotations.UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public Long getId() {
        return id;
    }

    public AppUser getUser() {
        return user;
    }

    public void setUser(AppUser user) {
        this.user = user;
    }

    public String getVerificationMethod() {
        return verificationMethod;
    }

    public void setVerificationMethod(String verificationMethod) {
        this.verificationMethod = verificationMethod;
    }

    public String getVerifiedName() {
        return verifiedName;
    }

    public void setVerifiedName(String verifiedName) {
        this.verifiedName = verifiedName;
    }

    public String getVerifiedDob() {
        return verifiedDob;
    }

    public void setVerifiedDob(String verifiedDob) {
        this.verifiedDob = verifiedDob;
    }

    public String getVerifiedGender() {
        return verifiedGender;
    }

    public void setVerifiedGender(String verifiedGender) {
        this.verifiedGender = verifiedGender;
    }

    public String getVerifiedAddress() {
        return verifiedAddress;
    }

    public void setVerifiedAddress(String verifiedAddress) {
        this.verifiedAddress = verifiedAddress;
    }

    public String getAadhaarLast4() {
        return aadhaarLast4;
    }

    public void setAadhaarLast4(String aadhaarLast4) {
        this.aadhaarLast4 = aadhaarLast4;
    }

    public boolean isAadhaarVerified() {
        return aadhaarVerified;
    }

    public void setAadhaarVerified(boolean aadhaarVerified) {
        this.aadhaarVerified = aadhaarVerified;
    }

    public String getMobileNumberMasked() {
        return mobileNumberMasked;
    }

    public void setMobileNumberMasked(String mobileNumberMasked) {
        this.mobileNumberMasked = mobileNumberMasked;
    }

    public boolean isMobileVerified() {
        return mobileVerified;
    }

    public void setMobileVerified(boolean mobileVerified) {
        this.mobileVerified = mobileVerified;
    }

    public boolean isIdentityVerified() {
        return identityVerified;
    }

    public void setIdentityVerified(boolean identityVerified) {
        this.identityVerified = identityVerified;
    }

    public LocalDateTime getVerifiedAt() {
        return verifiedAt;
    }

    public void setVerifiedAt(LocalDateTime verifiedAt) {
        this.verifiedAt = verifiedAt;
    }
}
