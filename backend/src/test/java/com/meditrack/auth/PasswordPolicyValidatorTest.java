package com.meditrack.auth;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class PasswordPolicyValidatorTest {

    private final PasswordPolicyValidator validator = new PasswordPolicyValidator();

    @Test
    void validate_validPassword_doesNotThrow() {
        assertDoesNotThrow(() -> validator.validate("Secure@123"));
    }

    @Test
    void validate_nullPassword_throws() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> validator.validate(null));
        assertEquals("Password is required", ex.getMessage());
    }

    @Test
    void validate_blankPassword_throws() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> validator.validate("   "));
        assertEquals("Password is required", ex.getMessage());
    }

    @Test
    void validate_tooShort_throws() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> validator.validate("Ab1!"));
        assertEquals("Password must be at least 8 characters", ex.getMessage());
    }

    @Test
    void validate_missingUppercase_throws() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> validator.validate("secure@123"));
        assertEquals("Password must include at least one uppercase letter", ex.getMessage());
    }

    @Test
    void validate_missingLowercase_throws() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> validator.validate("SECURE@123"));
        assertEquals("Password must include at least one lowercase letter", ex.getMessage());
    }

    @Test
    void validate_missingDigit_throws() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> validator.validate("Secure@abc"));
        assertEquals("Password must include at least one number", ex.getMessage());
    }

    @Test
    void validate_missingSpecialChar_throws() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> validator.validate("Secure1234"));
        assertEquals("Password must include at least one special character", ex.getMessage());
    }
}
