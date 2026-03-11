package com.meditrack.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

public class UserManagementDtos {

    public record UserSummary(
            Long id,
            String username,
            String email,
            Role role,
            boolean enabled,
            LocalDateTime createdAt
    ) {
    }

    public record CreateUserRequest(
            @NotBlank String username,
            @NotBlank @Email String email,
            @NotBlank String password,
            @NotNull Role role,
            Boolean enabled
    ) {
    }

    public record UpdateUserRequest(
            @NotBlank String username,
            @NotBlank @Email String email,
            String password,
            @NotNull Role role,
            Boolean enabled
    ) {
    }
}