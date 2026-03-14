package com.meditrack.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {

    // Must be at least 32 bytes for HMAC-SHA256
    private static final String SECRET = "meditrack-test-secret-key-32chars!!";
    private static final long EXPIRATION_MS = 3_600_000L; // 1 hour

    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "secret", SECRET);
        ReflectionTestUtils.setField(jwtService, "expirationMs", EXPIRATION_MS);
    }

    @Test
    void generateToken_returnsNonNullToken() {
        String token = jwtService.generateToken("alice", "DOCTOR");
        assertNotNull(token);
        assertFalse(token.isBlank());
    }

    @Test
    void extractUsername_returnsCorrectSubject() {
        String token = jwtService.generateToken("alice", "DOCTOR");
        assertEquals("alice", jwtService.extractUsername(token));
    }

    @Test
    void extractRole_returnsCorrectRoleClaim() {
        String token = jwtService.generateToken("alice", "DOCTOR");
        assertEquals("DOCTOR", jwtService.extractRole(token));
    }

    @Test
    void isTokenValid_matchingUsername_returnsTrue() {
        String token = jwtService.generateToken("alice", "DOCTOR");
        assertTrue(jwtService.isTokenValid(token, "alice"));
    }

    @Test
    void isTokenValid_wrongUsername_returnsFalse() {
        String token = jwtService.generateToken("alice", "DOCTOR");
        assertFalse(jwtService.isTokenValid(token, "bob"));
    }

    @Test
    void generateToken_differentUsers_produceDifferentTokens() {
        String token1 = jwtService.generateToken("alice", "DOCTOR");
        String token2 = jwtService.generateToken("bob", "RECEPTIONIST");
        assertNotEquals(token1, token2);
    }
}
