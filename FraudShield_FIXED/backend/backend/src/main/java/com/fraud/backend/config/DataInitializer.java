package com.fraud.backend.config;

import com.fraud.backend.entity.AppUser;
import com.fraud.backend.repository.AppUserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    private final AppUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final String adminEmail;
    private final String adminPassword;

    public DataInitializer(
            AppUserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${fraud.admin.email:admin@fraudshield.local}") String adminEmail,
            @Value("${fraud.admin.password:admin123}") String adminPassword
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.adminEmail = adminEmail;
        this.adminPassword = adminPassword;
    }

    @Override
    public void run(String... args) {
        if (!userRepository.existsByEmailIgnoreCase(adminEmail)) {
            AppUser admin = new AppUser();
            admin.setName("FraudShield Admin");
            admin.setEmail(adminEmail);
            admin.setPasswordHash(passwordEncoder.encode(adminPassword));
            admin.setRole("ADMIN");
            userRepository.save(admin);
        }
    }
}
