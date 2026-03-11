package com.meditrack.auth;

import com.meditrack.admin.AdminAuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserManagementService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordPolicyValidator passwordPolicyValidator;
    private final AdminAuditService adminAuditService;

    public List<UserManagementDtos.UserSummary> list() {
        return userRepository.findAll().stream()
                .sorted(Comparator.comparing(User::getCreatedAt).reversed())
                .map(this::toSummary)
                .toList();
    }

    public UserManagementDtos.UserSummary create(UserManagementDtos.CreateUserRequest request, String actingUsername) {
        if (userRepository.existsByUsername(request.username())) {
            throw new IllegalArgumentException("Username already exists");
        }
        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("Email already exists");
        }

        passwordPolicyValidator.validate(request.password());

        User user = User.builder()
                .username(request.username())
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .role(request.role())
                .enabled(request.enabled() == null || request.enabled())
                .build();

        User saved = userRepository.save(user);
        adminAuditService.record(actingUsername, "CREATE_USER", "USER", String.valueOf(saved.getId()),
            "Created user " + saved.getUsername() + " with role " + saved.getRole());
        return toSummary(saved);
    }

    public UserManagementDtos.UserSummary update(Long id, UserManagementDtos.UpdateUserRequest request, String actingUsername) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        String before = user.getUsername() + "|" + user.getEmail() + "|" + user.getRole() + "|" + user.isEnabled();

        if (userRepository.existsByUsernameAndIdNot(request.username(), id)) {
            throw new IllegalArgumentException("Username already exists");
        }
        if (userRepository.existsByEmailAndIdNot(request.email(), id)) {
            throw new IllegalArgumentException("Email already exists");
        }
        if (user.getUsername().equals(actingUsername) && !request.enabled()) {
            throw new IllegalArgumentException("You cannot disable your own account");
        }
        if (user.getUsername().equals(actingUsername) && request.role() != Role.ADMIN) {
            throw new IllegalArgumentException("You cannot remove your own admin role");
        }
        if (user.getRole() == Role.ADMIN && request.role() != Role.ADMIN && userRepository.countByRole(Role.ADMIN) <= 1) {
            throw new IllegalArgumentException("At least one admin account must remain");
        }
        if (user.getRole() == Role.ADMIN && request.enabled() != null && !request.enabled() && userRepository.countByRole(Role.ADMIN) <= 1) {
            throw new IllegalArgumentException("At least one enabled admin account must remain");
        }

        user.setUsername(request.username());
        user.setEmail(request.email());
        user.setRole(request.role());
        user.setEnabled(request.enabled() == null || request.enabled());

        if (request.password() != null && !request.password().isBlank()) {
            passwordPolicyValidator.validate(request.password());
            user.setPassword(passwordEncoder.encode(request.password()));
        }

        User saved = userRepository.save(user);
        String after = saved.getUsername() + "|" + saved.getEmail() + "|" + saved.getRole() + "|" + saved.isEnabled();
        adminAuditService.record(actingUsername, "UPDATE_USER", "USER", String.valueOf(saved.getId()),
                "Before=" + before + "; After=" + after);
        return toSummary(saved);
    }

    public void delete(Long id, String actingUsername) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (user.getUsername().equals(actingUsername)) {
            throw new IllegalArgumentException("You cannot delete your own account");
        }
        if (user.getRole() == Role.ADMIN && userRepository.countByRole(Role.ADMIN) <= 1) {
            throw new IllegalArgumentException("At least one admin account must remain");
        }

        String deletedUsername = user.getUsername();
        String deletedRole = user.getRole().name();
        userRepository.delete(user);
        adminAuditService.record(actingUsername, "DELETE_USER", "USER", String.valueOf(id),
            "Deleted user " + deletedUsername + " with role " + deletedRole);
    }

    private UserManagementDtos.UserSummary toSummary(User user) {
        return new UserManagementDtos.UserSummary(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getRole(),
                user.isEnabled(),
                user.getCreatedAt()
        );
    }
}