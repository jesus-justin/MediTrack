package com.meditrack.auth;

import com.meditrack.security.JwtService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private PasswordPolicyValidator passwordPolicyValidator;
    @Mock private JwtService jwtService;
    @Mock private AuthenticationManager authenticationManager;

    @InjectMocks
    private AuthService authService;

    @Test
    void register_success_returnsAuthResponse() {
        // Arrange
        AuthDtos.RegisterRequest request =
                new AuthDtos.RegisterRequest("alice", "alice@hospital.com", "Secure@123", Role.DOCTOR);
        when(userRepository.existsByUsername("alice")).thenReturn(false);
        when(userRepository.existsByEmail("alice@hospital.com")).thenReturn(false);
        when(passwordEncoder.encode("Secure@123")).thenReturn("encoded");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(jwtService.generateToken("alice", "DOCTOR")).thenReturn("jwt-token");

        // Act
        AuthDtos.AuthResponse response = authService.register(request);

        // Assert
        assertEquals("jwt-token", response.token());
        assertEquals("alice", response.username());
        assertEquals(Role.DOCTOR, response.role());
        verify(passwordPolicyValidator).validate("Secure@123");
        verify(userRepository).save(any(User.class));
    }

    @Test
    void register_usernameAlreadyExists_throwsException() {
        AuthDtos.RegisterRequest request =
                new AuthDtos.RegisterRequest("alice", "alice@hospital.com", "Secure@123", Role.DOCTOR);
        when(userRepository.existsByUsername("alice")).thenReturn(true);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> authService.register(request));
        assertEquals("Username already exists", ex.getMessage());
        verify(userRepository, never()).save(any());
    }

    @Test
    void register_emailAlreadyExists_throwsException() {
        AuthDtos.RegisterRequest request =
                new AuthDtos.RegisterRequest("alice", "alice@hospital.com", "Secure@123", Role.DOCTOR);
        when(userRepository.existsByUsername("alice")).thenReturn(false);
        when(userRepository.existsByEmail("alice@hospital.com")).thenReturn(true);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> authService.register(request));
        assertEquals("Email already exists", ex.getMessage());
        verify(userRepository, never()).save(any());
    }

    @Test
    void register_nullRole_defaultsToReceptionist() {
        // role == null should default to RECEPTIONIST
        AuthDtos.RegisterRequest request =
                new AuthDtos.RegisterRequest("alice", "alice@hospital.com", "Secure@123", null);
        when(userRepository.existsByUsername(any())).thenReturn(false);
        when(userRepository.existsByEmail(any())).thenReturn(false);
        when(passwordEncoder.encode(any())).thenReturn("encoded");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(jwtService.generateToken("alice", "RECEPTIONIST")).thenReturn("token");

        AuthDtos.AuthResponse response = authService.register(request);

        assertEquals(Role.RECEPTIONIST, response.role());
    }

    @Test
    void login_success_returnsAuthResponse() {
        // Arrange
        AuthDtos.LoginRequest request = new AuthDtos.LoginRequest("alice", "Secure@123");
        User user = User.builder()
                .username("alice").email("alice@hospital.com")
                .password("encoded").role(Role.DOCTOR).build();
        when(userRepository.findByUsername("alice")).thenReturn(Optional.of(user));
        when(jwtService.generateToken("alice", "DOCTOR")).thenReturn("jwt-token");

        // Act
        AuthDtos.AuthResponse response = authService.login(request);

        // Assert
        assertEquals("jwt-token", response.token());
        assertEquals("alice", response.username());
        verify(authenticationManager).authenticate(any(UsernamePasswordAuthenticationToken.class));
    }

    @Test
    void login_userNotFoundAfterAuth_throwsException() {
        AuthDtos.LoginRequest request = new AuthDtos.LoginRequest("ghost", "pass");
        when(userRepository.findByUsername("ghost")).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> authService.login(request));
    }
}
