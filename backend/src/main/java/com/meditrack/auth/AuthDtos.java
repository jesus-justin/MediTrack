package com.meditrack.auth;

import jakarta.validation.constraints.NotBlank;

public class AuthDtos {

    public record LoginRequest(
            @NotBlank String username,
            @NotBlank String password
    ) {
    }

    public record AuthResponse(
            String token,
            String username,
            Role role
    ) {
    }
}
