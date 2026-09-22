package com.fraud.backend.controller;
import org.springframework.web.bind.annotation.CrossOrigin;
import com.fraud.backend.entity.Transaction;
import com.fraud.backend.repository.TransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "http://localhost:5174")
@RestController
@RequestMapping("/transactions")
public class TransactionController {

    @Autowired
    private TransactionRepository transactionRepository;

    @GetMapping
    public List<Transaction> getAllTransactions() {
        return transactionRepository.findAll();
    }

    @GetMapping("/frauds")
    public List<Transaction> getFraudTransactions() {
        return transactionRepository.findByFraudTrue();
    }

    @PostMapping
public Transaction createTransaction(@RequestBody Transaction transaction) {

    double score = 0.0;

    if (transaction.getAmount() > 10000)
        score += 0.4;

    if ("Apple".equalsIgnoreCase(transaction.getReceiver()))
        score += 0.3;

    if (transaction.getAmount() > 20000)
        score += 0.3;

    transaction.setFraudScore(score);

    if (score >= 0.8) {
        transaction.setFraud(true);
        transaction.setDecision("BLOCKED");
        transaction.setReason("High fraud risk detected");
    }
    else if (score >= 0.5) {
        transaction.setFraud(true);
        transaction.setDecision("REVIEW");
        transaction.setReason("Suspicious transaction requires review");
    }
    else {
        transaction.setFraud(false);
        transaction.setDecision("APPROVED");
        transaction.setReason("Normal transaction");
    }

    return transactionRepository.save(transaction);
}
}