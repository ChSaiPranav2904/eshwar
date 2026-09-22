package com.fraud.backend.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import java.util.Date;

@Service
public class JwtService {

    @org.springframework.beans.factory.annotation.Value("${jwt.secret:default-dev-secret-key-change-in-production-32chars}")
    private String secret;

    public String generateToken(String username, String role) {
        return generateToken(username, role, null, null);
    }

    public String generateToken(String username, String role, Long userId, String name) {

        var builder = Jwts.builder()
                .claim("role", role)
                .claim("roles", role)
                .setSubject(username)
                .setIssuedAt(new Date())
                .setExpiration(
                        new Date(System.currentTimeMillis() + 86400000)
                );

        if (userId != null) {
            builder.claim("userId", userId);
        }
        if (name != null) {
            builder.claim("name", name);
        }

        return builder.signWith(
                        Keys.hmacShaKeyFor(secret.getBytes()),
                        SignatureAlgorithm.HS256
                )
                .compact();
    }

    public String extractUsername(String token) {

        return Jwts.parserBuilder()
                .setSigningKey(
                        Keys.hmacShaKeyFor(secret.getBytes())
                )
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getSubject();
    }

    public String extractRole(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(
                        Keys.hmacShaKeyFor(secret.getBytes())
                )
                .build()
                .parseClaimsJws(token)
                .getBody()
                .get("role", String.class);
    }

    public boolean validateToken(String token) {

        try {

            Jwts.parserBuilder()
                    .setSigningKey(
                            Keys.hmacShaKeyFor(secret.getBytes())
                    )
                    .build()
                    .parseClaimsJws(token);

            return true;

        } catch (JwtException | IllegalArgumentException e) {

            return false;
        }
    }
}
