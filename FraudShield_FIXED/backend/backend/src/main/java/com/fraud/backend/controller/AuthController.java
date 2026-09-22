package com.fraud.backend.controller;
import com.fraud.backend.security.JwtService;
import com.fraud.backend.dto.LoginRequest;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
public class AuthController {
private final JwtService jwtService;
private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
private final org.springframework.security.core.userdetails.UserDetailsService userDetailsService;
    

    public AuthController(JwtService jwtService, 
                          org.springframework.security.crypto.password.PasswordEncoder passwordEncoder,
                          org.springframework.security.core.userdetails.UserDetailsService userDetailsService) {
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
        this.userDetailsService = userDetailsService;
    }

    @GetMapping("/test")
    public String test() {
        return "WORKING";
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @RequestBody LoginRequest request) {

        try {
            var userDetails = userDetailsService.loadUserByUsername(request.getUsername());
            if (passwordEncoder.matches(request.getPassword(), userDetails.getPassword())) {
                String role = userDetails.getAuthorities().iterator().next().getAuthority();
                String token = jwtService.generateToken(userDetails.getUsername(), role);
                return ResponseEntity.ok(Map.of("token", token));
            }
        } catch (org.springframework.security.core.userdetails.UsernameNotFoundException e) {
            // fallthrough
        }

        return ResponseEntity.status(401)
                .body("INVALID_CREDENTIALS");
    }
}