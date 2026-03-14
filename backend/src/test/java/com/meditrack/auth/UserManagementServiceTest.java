package com.meditrack.auth;

import com.meditrack.admin.AdminAuditService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserManagementServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private PasswordPolicyValidator passwordPolicyValidator;
    @Mock private AdminAuditService adminAuditService;

    @InjectMocks
    private UserManagementService userManagementService;

    private User adminUser(Long id, String username) {
        return User.builder()
                .id(id).username(username).email(username + "@hospital.com")
                .password("encoded").role(Role.ADMIN).enabled(true)
                .createdAt(LocalDateTime.now()).build();
    }

    // ── create ──────────────────────────────────────────────────────────────

    @Test
    void create_success_returnsSummaryAndAudits() {
        UserManagementDtos.CreateUserRequest request =
                new UserManagementDtos.CreateUserRequest("alice", "alice@h.com", "Secure@123", Role.DOCTOR, true);
        when(userRepository.existsByUsername("alice")).thenReturn(false);
        when(userRepository.existsByEmail("alice@h.com")).thenReturn(false);
        when(passwordEncoder.encode("Secure@123")).thenReturn("encoded");
        User saved = User.builder().id(1L).username("alice").email("alice@h.com")
                .password("encoded").role(Role.DOCTOR).enabled(true)
                .createdAt(LocalDateTime.now()).build();
        when(userRepository.save(any(User.class))).thenReturn(saved);

        UserManagementDtos.UserSummary summary = userManagementService.create(request, "admin");

        assertEquals("alice", summary.username());
        assertEquals(Role.DOCTOR, summary.role());
        verify(adminAuditService).record(eq("admin"), eq("CREATE_USER"), any(), any(), any());
    }

    @Test
    void create_duplicateUsername_throws() {
        UserManagementDtos.CreateUserRequest request =
                new UserManagementDtos.CreateUserRequest("alice", "new@h.com", "Secure@123", Role.DOCTOR, true);
        when(userRepository.existsByUsername("alice")).thenReturn(true);

        assertThrows(IllegalArgumentException.class,
                () -> userManagementService.create(request, "admin"));
        verify(userRepository, never()).save(any());
    }

    @Test
    void create_duplicateEmail_throws() {
        UserManagementDtos.CreateUserRequest request =
                new UserManagementDtos.CreateUserRequest("newuser", "alice@h.com", "Secure@123", Role.DOCTOR, true);
        when(userRepository.existsByUsername("newuser")).thenReturn(false);
        when(userRepository.existsByEmail("alice@h.com")).thenReturn(true);

        assertThrows(IllegalArgumentException.class,
                () -> userManagementService.create(request, "admin"));
        verify(userRepository, never()).save(any());
    }

    // ── delete ──────────────────────────────────────────────────────────────

    @Test
    void delete_success_deletesUserAndAudits() {
        User target = User.builder().id(2L).username("bob").email("bob@h.com")
                .password("encoded").role(Role.DOCTOR).enabled(true)
                .createdAt(LocalDateTime.now()).build();
        when(userRepository.findById(2L)).thenReturn(Optional.of(target));

        userManagementService.delete(2L, "admin");

        verify(userRepository).delete(target);
        verify(adminAuditService).record(eq("admin"), eq("DELETE_USER"), any(), any(), any());
    }

    @Test
    void delete_ownAccount_throws() {
        User self = adminUser(1L, "admin");
        when(userRepository.findById(1L)).thenReturn(Optional.of(self));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> userManagementService.delete(1L, "admin"));
        assertEquals("You cannot delete your own account", ex.getMessage());
    }

    @Test
    void delete_lastAdmin_throws() {
        User lastAdmin = User.builder().id(2L).username("lastadmin").email("la@h.com")
                .password("encoded").role(Role.ADMIN).enabled(true)
                .createdAt(LocalDateTime.now()).build();
        when(userRepository.findById(2L)).thenReturn(Optional.of(lastAdmin));
        when(userRepository.countByRole(Role.ADMIN)).thenReturn(1L);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> userManagementService.delete(2L, "other"));
        assertEquals("At least one admin account must remain", ex.getMessage());
    }

    // ── update guard rules ────────────────────────────────────────────────

    @Test
    void update_cannotDisableOwnAccount_throws() {
        User self = adminUser(1L, "admin");
        when(userRepository.findById(1L)).thenReturn(Optional.of(self));
        when(userRepository.existsByUsernameAndIdNot("admin", 1L)).thenReturn(false);
        when(userRepository.existsByEmailAndIdNot(any(), any())).thenReturn(false);

        // Attempt to disable own account (enabled = false)
        UserManagementDtos.UpdateUserRequest request =
                new UserManagementDtos.UpdateUserRequest("admin", "admin@hospital.com", null, Role.ADMIN, false);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> userManagementService.update(1L, request, "admin"));
        assertEquals("You cannot disable your own account", ex.getMessage());
    }

    @Test
    void update_cannotRemoveOwnAdminRole_throws() {
        User self = adminUser(1L, "admin");
        when(userRepository.findById(1L)).thenReturn(Optional.of(self));
        when(userRepository.existsByUsernameAndIdNot("admin", 1L)).thenReturn(false);
        when(userRepository.existsByEmailAndIdNot(any(), any())).thenReturn(false);

        // Attempt to change own role away from ADMIN
        UserManagementDtos.UpdateUserRequest request =
                new UserManagementDtos.UpdateUserRequest("admin", "admin@hospital.com", null, Role.DOCTOR, true);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> userManagementService.update(1L, request, "admin"));
        assertEquals("You cannot remove your own admin role", ex.getMessage());
    }
}
