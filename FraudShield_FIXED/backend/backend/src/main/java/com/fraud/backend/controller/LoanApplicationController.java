package com.fraud.backend.controller;

import com.fraud.backend.entity.LoanApplication;
import com.fraud.backend.service.LoanApplicationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
public class LoanApplicationController {

    private final LoanApplicationService service;

    public LoanApplicationController(LoanApplicationService service) {
        this.service = service;
    }

    @PostMapping({"/loan", "/api/loans"})
    public Map<String, Object> createApplication(
            @Valid @RequestBody LoanApplication application,
            HttpServletRequest servletRequest
    ) {
        return customerView(service.createApplication(application, servletRequest));
    }

    @GetMapping("/loan")
    public List<LoanApplication> getAllApplications() {
        return service.getAllApplications();
    }

    @GetMapping("/api/loans/my")
    public List<Map<String, Object>> getMyApplications() {
        return service.getMyApplications().stream().map(this::customerView).toList();
    }

    @GetMapping("/api/loans/{id}")
    public Map<String, Object> getMyApplication(@PathVariable Long id) {
        return customerView(service.getMyApplication(id));
    }

    @GetMapping("/loan/ai-review/{id}")
    public String reviewLoan(@PathVariable Long id) {
        return service.reviewLoan(id);
    }

    private Map<String, Object> customerView(LoanApplication application) {
        return Map.ofEntries(
                Map.entry("id", application.getId()),
                Map.entry("applicationId", "FS-2026-" + String.format("%05d", application.getId())),
                Map.entry("fullName", application.getFullName()),
                Map.entry("loanAmount", application.getLoanAmount()),
                Map.entry("loanPurpose", application.getLoanPurpose()),
                Map.entry("submittedDate", application.getCreatedAt()),
                Map.entry("status", application.getStatus() == null ? "SUBMITTED" : application.getStatus()),
                Map.entry("identityVerified", Boolean.TRUE.equals(application.getIdentityVerified())),
                Map.entry("mobileVerified", Boolean.TRUE.equals(application.getMobileVerified())),
                Map.entry("maskedAadhaar", application.getMaskedAadhaar() == null ? "XXXX XXXX" : application.getMaskedAadhaar())
        );
    }
}
