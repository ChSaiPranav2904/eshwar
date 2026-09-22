package com.fraud.backend.service;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

@Service
public class FraudAIService {

    private final ChatClient chatClient;

    public FraudAIService(ChatClient.Builder builder) {
        System.out.println("FraudAIService Loaded!");
        this.chatClient = builder.build();
    }

    public String analyzeTransaction(
            String sender,
            String receiver,
            Double amount,
            Double fraudScore
    ) {

        String prompt = """
                You are a senior banking fraud analyst.

                Analyze this transaction:

                Sender: %s
                Receiver: %s
                Amount: %.2f
                Fraud Score: %.2f

                Provide:
                1. Risk Level
                2. Why suspicious
                3. Recommendation

                Keep response under 100 words.
                """
                .formatted(
                        sender,
                        receiver,
                        amount,
                        fraudScore
                );

        try {
            return chatClient.prompt()
                    .user(prompt)
                    .call()
                    .content();
        } catch (Exception e) {
            return "AI service is currently unavailable. Please try again later. Error: " + e.getMessage();
        }
    }
}