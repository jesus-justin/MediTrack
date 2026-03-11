package com.meditrack.auth;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class UserManagementController {

    private final UserManagementService userManagementService;

    @GetMapping
    public List<UserManagementDtos.UserSummary> list() {
        return userManagementService.list();
    }

    @PostMapping
    public UserManagementDtos.UserSummary create(
            @Valid @RequestBody UserManagementDtos.CreateUserRequest request,
            Authentication authentication
    ) {
        return userManagementService.create(request, authentication.getName());
    }

    @PutMapping("/{id}")
    public UserManagementDtos.UserSummary update(
            @PathVariable Long id,
            @Valid @RequestBody UserManagementDtos.UpdateUserRequest request,
            Authentication authentication
    ) {
        return userManagementService.update(id, request, authentication.getName());
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id, Authentication authentication) {
        userManagementService.delete(id, authentication.getName());
    }
}