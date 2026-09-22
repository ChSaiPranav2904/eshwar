package com.fraud.backend.service;

import com.fraud.backend.entity.AppUser;
import com.fraud.backend.entity.IdentityVerification;
import com.fraud.backend.entity.OtpVerification;
import com.fraud.backend.repository.IdentityVerificationRepository;
import com.fraud.backend.repository.OtpVerificationRepository;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Map;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class OtpService {

    private final OtpVerificationRepository otpRepository;
    private final IdentityVerificationRepository identityRepository;
    private final CurrentUserService currentUserService;
    private final AadhaarVerificationService aadhaarVerificationService;
    private final DeviceRiskService deviceRiskService;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom random = new SecureRandom();

    public OtpService(
            OtpVerificationRepository otpRepository,
            IdentityVerificationRepository identityRepository,
            CurrentUserService currentUserService,
            AadhaarVerificationService aadhaarVerificationService,
            DeviceRiskService deviceRiskService,
            PasswordEncoder passwordEncoder
    ) {
        this.otpRepository = otpRepository;
        this.identityRepository = identityRepository;
        this.currentUserService = currentUserService;
        this.aadhaarVerificationService = aadhaarVerificationService;
        this.deviceRiskService = deviceRiskService;
        this.passwordEncoder = passwordEncoder;
    }

    public Map<String, Object> sendOtp(String mobileNumber) {
        AppUser user = currentUserService.requireUser();
        String normalized = normalizeMobile(mobileNumber);
        if (normalized.length() < 10) {
            throw new IllegalArgumentException("INVALID_MOBILE_NUMBER");
        }

        String otp = String.format("%06d", random.nextInt(1_000_000));
        OtpVerification verification = new OtpVerification();
        verification.setUser(user);
        verification.setMobileNumber(normalized);
        verification.setOtpHash(passwordEncoder.encode(otp));
        verification.setExpiresAt(LocalDateTime.now().plusMinutes(5));
        otpRepository.save(verification);

        System.out.printf("Demo OTP sent to %s OTP: %s%n", maskMobile(normalized), otp);
        return Map.of(
                "mobileNumberMasked", maskMobile(normalized),
                "expiresInSeconds", 300,
                "demoOtp", otp
        );
    }

    public IdentityVerification verifyOtp(String otp, String deviceId) {
        AppUser user = currentUserService.requireUser();
        OtpVerification verification = otpRepository.findTopByUserAndVerifiedFalseOrderByCreatedAtDesc(user)
                .orElseThrow(() -> new IllegalArgumentException("OTP_NOT_REQUESTED"));

        if (verification.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("OTP_EXPIRED");
        }
        if (verification.getAttemptCount() >= 5) {
            throw new IllegalArgumentException("OTP_ATTEMPTS_EXCEEDED");
        }

        verification.setAttemptCount(verification.getAttemptCount() + 1);
        if (!passwordEncoder.matches(otp, verification.getOtpHash())) {
            otpRepository.save(verification);
            throw new IllegalArgumentException("INVALID_OTP");
        }

        verification.setVerified(true);
        otpRepository.save(verification);

        IdentityVerification identity = identityRepository.findByUser(user).orElseGet(IdentityVerification::new);
        identity.setUser(user);
        identity.setMobileNumberMasked(maskMobile(verification.getMobileNumber()));
        identity.setMobileVerified(true);
        aadhaarVerificationService.updateIdentityStatus(identity);
        if (identity.isIdentityVerified()) {
            deviceRiskService.trustDevice(user, deviceId);
        }
        return identityRepository.save(identity);
    }

    private static String normalizeMobile(String value) {
        return value == null ? "" : value.replaceAll("[^+0-9]", "");
    }

    private static String maskMobile(String value) {
        if (value == null || value.length() < 4) return "******";
        String last4 = value.substring(value.length() - 4);
        return value.startsWith("+91") ? "+91******" + last4 : "******" + last4;
    }
}
