package com.meditrack.common;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @GetMapping("/doctor-upcoming")
    @PreAuthorize("hasAnyRole('ADMIN','DOCTOR')")
    public List<Map<String, Object>> doctorUpcoming() {
        // Placeholder response. Replace with scheduler + notification queue integration.
        return List.of(Map.of(
                "type", "UPCOMING_SCHEDULE",
                "message", "You have appointments in the next 2 hours",
                "createdAt", LocalDateTime.now().toString()
        ));
    }

    @GetMapping("/patient-reminders")
    @PreAuthorize("hasAnyRole('ADMIN','RECEPTIONIST')")
    public List<Map<String, Object>> patientReminders() {
        // Placeholder response. Replace with SMS/email service provider integration.
        return List.of(Map.of(
                "type", "APPOINTMENT_REMINDER",
                "message", "3 reminder messages are queued",
                "createdAt", LocalDateTime.now().toString()
        ));
    }
}
