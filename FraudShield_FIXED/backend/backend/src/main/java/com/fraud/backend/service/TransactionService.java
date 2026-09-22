package com.fraud.backend.service;

import com.fraud.backend.entity.Transaction;
import com.fraud.backend.repository.TransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class TransactionService {

    private final TransactionRepository transactionRepository;

    public TransactionService(TransactionRepository transactionRepository) {
        this.transactionRepository = transactionRepository;
    }

    public List<Transaction> getAllTransactions() {
        return transactionRepository.findAll();
    }

    public List<Transaction> getFraudTransactions() {
        return transactionRepository.findByFraudTrue();
    }

    public Transaction createTransaction(Transaction transaction) {
        double score = 0.0;

        if (transaction.getAmount() != null && transaction.getAmount() > 10000)
            score += 0.4;

        if ("Apple".equalsIgnoreCase(transaction.getReceiver()))
            score += 0.3;

        if (transaction.getAmount() != null && transaction.getAmount() > 20000)
            score += 0.3;

        transaction.setFraudScore(score);

        if (score >= 0.8) {
            transaction.setFraud(true);
            transaction.setDecision("BLOCKED");
            transaction.setReason("High fraud risk detected");
        } else if (score >= 0.5) {
            transaction.setFraud(true);
            transaction.setDecision("REVIEW");
            transaction.setReason("Suspicious transaction requires review");
        } else {
            transaction.setFraud(false);
            transaction.setDecision("APPROVED");
            transaction.setReason("Normal transaction");
        }

        return transactionRepository.save(transaction);
    }
}
