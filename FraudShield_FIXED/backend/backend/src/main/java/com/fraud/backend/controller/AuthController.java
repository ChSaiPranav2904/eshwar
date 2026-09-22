package com.fraud.backend.controller;
import com.fraud.backend.security.JwtService;
import com.fraud.backend.dto.LoginRequest;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@CrossOrigin(origins = {"http://localhost:5174","http://localhost:5173"})
public class AuthController {
private final JwtService jwtService;
    

    public AuthController(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @GetMapping("/test")
    public String test() {
        return "WORKING";
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @RequestBody LoginRequest request) {

        if ("admin".equals(request.getUsername())
                && "admin123".equals(request.getPassword())) {

            String token =
                    jwtService.generateToken(
                            request.getUsername()
                    );

           return ResponseEntity.ok(
        Map.of("token", token)
);
        }

        return ResponseEntity.status(401)
                .body("INVALID_CREDENTIALS");
    }
}