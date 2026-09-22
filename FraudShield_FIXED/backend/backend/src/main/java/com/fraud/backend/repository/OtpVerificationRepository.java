package com.fraud.backend.repository;

import com.fraud.backend.entity.AppUser;
import com.fraud.backend.entity.OtpVerification;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OtpVerificationRepository extends JpaRepository<OtpVerification, Long> {
    Optional<OtpVerification> findTopByUserAndVerifiedFalseOrderByCreatedAtDesc(AppUser user);
}
