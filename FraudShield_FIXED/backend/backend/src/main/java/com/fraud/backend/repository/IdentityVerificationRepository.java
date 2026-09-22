package com.fraud.backend.repository;

import com.fraud.backend.entity.AppUser;
import com.fraud.backend.entity.IdentityVerification;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IdentityVerificationRepository extends JpaRepository<IdentityVerification, Long> {
    Optional<IdentityVerification> findByUser(AppUser user);
}
