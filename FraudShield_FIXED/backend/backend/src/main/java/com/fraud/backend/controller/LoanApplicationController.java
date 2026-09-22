package com.fraud.backend.controller;

import com.fraud.backend.entity.LoanApplication;
import com.fraud.backend.service.LoanApplicationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/loan")
public class LoanApplicationController {

    private final LoanApplicationService service;

    public LoanApplicationController(LoanApplicationService service) {
        this.service = service;
    }

    @PostMapping
    public LoanApplication createApplication(
            @Valid @RequestBody LoanApplication application,
            HttpServletRequest servletRequest
    ) {
        return service.createApplication(application, servletRequest);
    }

    @GetMapping
    public List<LoanApplication> getAllApplications() {
        return service.getAllApplications();
    }

    @GetMapping("/ai-review/{id}")
    public String reviewLoan(@PathVariable Long id) {
        return service.reviewLoan(id);
    }
}