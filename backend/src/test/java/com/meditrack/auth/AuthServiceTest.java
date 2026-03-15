package com.meditrack.auth;

import com.meditrack.security.JwtService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private JwtService jwtService;
    @Mock private AuthenticationManager authenticationManager;

    @InjectMocks
    private AuthService authService;

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
