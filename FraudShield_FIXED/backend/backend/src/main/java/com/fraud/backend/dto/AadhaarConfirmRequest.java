package com.fraud.backend.dto;

public class AadhaarConfirmRequest {
    private String verificationMethod;
    private String verifiedName;
    private String verifiedDob;
    private String verifiedGender;
    private String verifiedAddress;
    private String aadhaarLast4;

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
}
