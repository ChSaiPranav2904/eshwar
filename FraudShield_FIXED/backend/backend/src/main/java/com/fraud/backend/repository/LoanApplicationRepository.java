package com.fraud.backend.repository;

import com.fraud.backend.entity.LoanApplication;
import com.fraud.backend.entity.AppUser;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LoanApplicationRepository
        extends JpaRepository<LoanApplication, Long> {
    List<LoanApplication> findByUserOrderByCreatedAtDesc(AppUser user);
}
