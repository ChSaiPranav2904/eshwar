package com.fraud.backend.controller;
import com.fraud.backend.dto.RegisterRequest;
import com.fraud.backend.entity.AppUser;
import com.fraud.backend.repository.AppUserRepository;
import com.fraud.backend.security.JwtService;
import com.fraud.backend.dto.LoginRequest;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/auth", "/api/auth"})
public class AuthController {
private final JwtService jwtService;
private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
private final org.springframework.security.core.userdetails.UserDetailsService userDetailsService;
private final AppUserRepository userRepository;
    

    public AuthController(JwtService jwtService, 
                          org.springframework.security.crypto.password.PasswordEncoder passwordEncoder,
                          org.springframework.security.core.userdetails.UserDetailsService userDetailsService,
                          AppUserRepository userRepository) {
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
        this.userDetailsService = userDetailsService;
        this.userRepository = userRepository;
    }

    @GetMapping("/test")
    public String test() {
        return "WORKING";
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmailIgnoreCase(email)) {
            return ResponseEntity.status(409).body("EMAIL_ALREADY_REGISTERED");
        }

        AppUser user = new AppUser();
        user.setName(request.getName().trim());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setRole("USER");
        userRepository.save(user);

        String token = jwtService.generateToken(user.getEmail(), "ROLE_" + user.getRole(), user.getId(), user.getName());
        return ResponseEntity.ok(Map.of("token", token));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @RequestBody LoginRequest request) {

        try {
            String username = request.getUsername().trim().toLowerCase();
            UserDetails userDetails = userDetailsService.loadUserByUsername(username);
            if (passwordEncoder.matches(request.getPassword(), userDetails.getPassword())) {
                String role = userDetails.getAuthorities().iterator().next().getAuthority();
                AppUser user = userRepository.findByEmailIgnoreCase(username).orElseThrow();
                String token = jwtService.generateToken(userDetails.getUsername(), role, user.getId(), user.getName());
                return ResponseEntity.ok(Map.of("token", token));
            }
        } catch (org.springframework.security.core.userdetails.UsernameNotFoundException e) {
            // fallthrough
        }

        return ResponseEntity.status(401)
                .body("INVALID_CREDENTIALS");
    }
}
