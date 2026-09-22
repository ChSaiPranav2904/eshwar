package com.fraud.backend.service;

import com.fraud.backend.dto.AadhaarConfirmRequest;
import com.fraud.backend.entity.AppUser;
import com.fraud.backend.entity.IdentityVerification;
import com.fraud.backend.repository.IdentityVerificationRepository;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@Transactional
public class AadhaarVerificationService {

    private static final Pattern AADHAAR_PATTERN = Pattern.compile("\\b(\\d{4})\\s?(\\d{4})\\s?(\\d{4})\\b");
    private final IdentityVerificationRepository repository;
    private final CurrentUserService currentUserService;

    public AadhaarVerificationService(
            IdentityVerificationRepository repository,
            CurrentUserService currentUserService
    ) {
        this.repository = repository;
        this.currentUserService = currentUserService;
    }

    public Map<String, Object> scan(MultipartFile file) {
        AppUser user = currentUserService.requireUser();
        String text = readBestEffort(file);
        String last4 = extractLast4(text);
        String name = extractLabeled(text, "name");
        String dob = extractLabeled(text, "dob|date of birth|yob|year of birth");
        String gender = extractGender(text);
        String address = extractLabeled(text, "address");

        return Map.of(
                "verifiedName", blankToDefault(name, user.getName()),
                "verifiedDob", blankToDefault(dob, ""),
                "verifiedGender", blankToDefault(gender, ""),
                "verifiedAddress", blankToDefault(address, ""),
                "aadhaarLast4", blankToDefault(last4, ""),
                "maskedAadhaar", maskAadhaar(last4),
                "verificationMethod", "OCR",
                "aadhaarVerified", false,
                "message", "Confirm the extracted Aadhaar details before mobile verification."
        );
    }

    public IdentityVerification confirm(AadhaarConfirmRequest request) {
        AppUser user = currentUserService.requireUser();
        IdentityVerification verification = repository.findByUser(user).orElseGet(IdentityVerification::new);
        verification.setUser(user);
        verification.setVerificationMethod(defaultValue(request.getVerificationMethod(), "OCR"));
        verification.setVerifiedName(clean(request.getVerifiedName()));
        verification.setVerifiedDob(clean(request.getVerifiedDob()));
        verification.setVerifiedGender(clean(request.getVerifiedGender()));
        verification.setVerifiedAddress(clean(request.getVerifiedAddress()));
        verification.setAadhaarLast4(onlyLast4(request.getAadhaarLast4()));
        verification.setAadhaarVerified(true);
        updateIdentityStatus(verification);
        return repository.save(verification);
    }

    public IdentityVerification status() {
        AppUser user = currentUserService.requireUser();
        return repository.findByUser(user).orElseGet(() -> {
            IdentityVerification verification = new IdentityVerification();
            verification.setUser(user);
            return verification;
        });
    }

    void updateIdentityStatus(IdentityVerification verification) {
        boolean complete = verification.isAadhaarVerified() && verification.isMobileVerified();
        verification.setIdentityVerified(complete);
        if (complete && verification.getVerifiedAt() == null) {
            verification.setVerifiedAt(LocalDateTime.now());
        }
    }

    private static String readBestEffort(MultipartFile file) {
        try {
            byte[] bytes = file.getBytes();
            String value = new String(bytes, StandardCharsets.UTF_8);
            return value.replace("\u0000", " ");
        } catch (Exception ex) {
            return "";
        }
    }

    private static String extractLast4(String text) {
        Matcher matcher = AADHAAR_PATTERN.matcher(text);
        String last = "";
        while (matcher.find()) {
            last = matcher.group(3);
        }
        return last;
    }

    private static String extractLabeled(String text, String labelPattern) {
        Pattern pattern = Pattern.compile("(?im)^\\s*(?:" + labelPattern + ")\\s*[:\\-]\\s*(.+)$");
        Matcher matcher = pattern.matcher(text);
        return matcher.find() ? matcher.group(1).trim() : "";
    }

    private static String extractGender(String text) {
        Matcher matcher = Pattern.compile("\\b(MALE|FEMALE|OTHER)\\b", Pattern.CASE_INSENSITIVE).matcher(text);
        return matcher.find() ? matcher.group(1).toUpperCase() : "";
    }

    private static String blankToDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    private static String defaultValue(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    private static String clean(String value) {
        return value == null ? "" : value.trim();
    }

    private static String onlyLast4(String value) {
        if (value == null) return "";
        String digits = value.replaceAll("\\D", "");
        return digits.length() <= 4 ? digits : digits.substring(digits.length() - 4);
    }

    public static String maskAadhaar(String last4) {
        return last4 == null || last4.isBlank() ? "XXXX XXXX" : "XXXX XXXX " + onlyLast4(last4);
    }
}
