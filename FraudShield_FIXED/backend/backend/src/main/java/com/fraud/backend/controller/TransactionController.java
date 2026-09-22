package com.fraud.backend.controller;
import org.springframework.web.bind.annotation.CrossOrigin;
import com.fraud.backend.entity.Transaction;
import com.fraud.backend.repository.TransactionRepository;
import com.fraud.backend.service.TransactionService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/transactions")
public class TransactionController {

    private final TransactionService transactionService;

    public TransactionController(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    @GetMapping
    public List<Transaction> getAllTransactions() {
        return transactionService.getAllTransactions();
    }

    @GetMapping("/frauds")
    public List<Transaction> getFraudTransactions() {
        return transactionService.getFraudTransactions();
    }

    @PostMapping
    public Transaction createTransaction(@RequestBody @jakarta.validation.Valid Transaction transaction) {
        return transactionService.createTransaction(transaction);
    }
}