package com.meditrack.consultation;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/consultations")
@RequiredArgsConstructor
public class ConsultationController {

    private final ConsultationService consultationService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','DOCTOR')")
    public List<ConsultationRecord> list() {
        return consultationService.list();
    }

    @GetMapping("/timeline/{patientId}")
    @PreAuthorize("hasAnyRole('ADMIN','RECEPTIONIST','DOCTOR')")
    public List<ConsultationRecord> timeline(@PathVariable Long patientId) {
        return consultationService.timeline(patientId);
    }

    @PostMapping("/{appointmentId}")
    @PreAuthorize("hasAnyRole('ADMIN','DOCTOR')")
    public ConsultationRecord create(@PathVariable Long appointmentId, @RequestBody ConsultationRecord request) {
        return consultationService.create(request, appointmentId);
    }
}
