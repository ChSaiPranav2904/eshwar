package com.fraud.backend.controller;

import com.fraud.backend.entity.Transaction;
import com.fraud.backend.repository.TransactionRepository;
import com.fraud.backend.service.FraudAIService;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/ai")
@CrossOrigin(origins = "http://localhost:5174")
public class AIController {

    private final FraudAIService fraudAIService;
    private final TransactionRepository transactionRepository;

    public AIController(
            FraudAIService fraudAIService,
            TransactionRepository transactionRepository
    ) {
        this.fraudAIService = fraudAIService;
        this.transactionRepository = transactionRepository;
    }

    @GetMapping("/transactions")
    public String transactions() {
        return "SECURED ENDPOINT WORKING";
    }

    @GetMapping("/analyze/{id}")
    public String analyzeTransaction(@PathVariable Long id) {

        Transaction tx =
                transactionRepository.findById(id)
                        .orElseThrow();

        return fraudAIService.analyzeTransaction(
                tx.getSender(),
                tx.getReceiver(),
                tx.getAmount(),
                tx.getFraudScore()
        );
    }
}