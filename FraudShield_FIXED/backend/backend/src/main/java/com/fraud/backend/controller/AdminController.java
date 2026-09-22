package com.fraud.backend.controller;

import com.fraud.backend.entity.LoanApplication;
import com.fraud.backend.service.LoanApplicationService;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final LoanApplicationService loanApplicationService;

    public AdminController(LoanApplicationService loanApplicationService) {
        this.loanApplicationService = loanApplicationService;
    }

    @GetMapping("/dashboard")
    public Map<String, Object> dashboard() {
        return loanApplicationService.dashboardSummary();
    }

    @GetMapping("/applications")
    public List<LoanApplication> applications() {
        return loanApplicationService.getAllApplications();
    }

    @GetMapping("/applications/{id}")
    public LoanApplication application(@PathVariable Long id) {
        return loanApplicationService.getAdminApplication(id);
    }

    @GetMapping("/applications/{id}/fraud-analysis")
    public Map<String, Object> fraudAnalysis(@PathVariable Long id) {
        return loanApplicationService.fraudAnalysis(id);
    }
}
