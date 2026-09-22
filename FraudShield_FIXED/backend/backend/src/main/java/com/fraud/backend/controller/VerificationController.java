package com.fraud.backend.controller;

import com.fraud.backend.dto.AadhaarConfirmRequest;
import com.fraud.backend.dto.OtpRequest;
import com.fraud.backend.service.AadhaarVerificationService;
import com.fraud.backend.service.OtpService;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/verification")
public class VerificationController {

    private final AadhaarVerificationService aadhaarVerificationService;
    private final OtpService otpService;

    public VerificationController(AadhaarVerificationService aadhaarVerificationService, OtpService otpService) {
        this.aadhaarVerificationService = aadhaarVerificationService;
        this.otpService = otpService;
    }

    @PostMapping(value = "/aadhaar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, Object> scanAadhaar(@RequestParam("file") MultipartFile file) {
        return aadhaarVerificationService.scan(file);
    }

    @PostMapping("/aadhaar/confirm")
    public Object confirmAadhaar(@RequestBody AadhaarConfirmRequest request) {
        return aadhaarVerificationService.confirm(request);
    }

    @PostMapping("/mobile/send-otp")
    public Map<String, Object> sendOtp(@RequestBody OtpRequest request) {
        return otpService.sendOtp(request.getMobileNumber());
    }

    @PostMapping("/mobile/verify-otp")
    public Object verifyOtp(@RequestBody OtpRequest request) {
        return otpService.verifyOtp(request.getOtp());
    }

    @GetMapping("/status")
    public Object status() {
        return aadhaarVerificationService.status();
    }
}
