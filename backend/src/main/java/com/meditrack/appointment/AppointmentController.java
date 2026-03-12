package com.meditrack.appointment;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/appointments")
@RequiredArgsConstructor
public class AppointmentController {

    private final AppointmentService appointmentService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','RECEPTIONIST','DOCTOR','PATIENT')")
    public List<Appointment> list() {
        return appointmentService.list();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','RECEPTIONIST','DOCTOR','PATIENT')")
    public Appointment get(@PathVariable Long id) {
        return appointmentService.get(id);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','RECEPTIONIST')")
    public Appointment book(@Valid @RequestBody AppointmentDtos.AppointmentRequest request) {
        return appointmentService.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','RECEPTIONIST')")
    public Appointment reschedule(@PathVariable Long id, @Valid @RequestBody AppointmentDtos.AppointmentRequest request) {
        return appointmentService.reschedule(id, request);
    }

    @PatchMapping("/{id}/arrange")
    @PreAuthorize("hasRole('RECEPTIONIST')")
    public Appointment arrangeTime(@PathVariable Long id, @Valid @RequestBody AppointmentDtos.ArrangeTimeRequest request) {
        return appointmentService.arrangeTime(id, request);
    }

    @GetMapping("/reception/slots")
    @PreAuthorize("hasRole('RECEPTIONIST')")
    public AppointmentDtos.SlotSuggestionResponse suggestSlots(
            @RequestParam Long doctorId,
            @RequestParam LocalDate date,
            @RequestParam(defaultValue = "30") Integer durationMinutes,
            @RequestParam(defaultValue = "8") Integer limit
    ) {
        return appointmentService.suggestSlots(
                new AppointmentDtos.SlotSuggestionRequest(doctorId, date, durationMinutes, limit)
        );
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN','RECEPTIONIST','DOCTOR')")
    public Appointment updateStatus(@PathVariable Long id, @RequestParam AppointmentStatus status) {
        return appointmentService.updateStatus(id, status);
    }

    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN','RECEPTIONIST')")
    public Appointment cancel(@PathVariable Long id) {
        return appointmentService.cancel(id);
    }
}
