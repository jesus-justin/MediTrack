package com.meditrack.doctor;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/doctors")
@RequiredArgsConstructor
public class DoctorController {

    private final DoctorService doctorService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','RECEPTIONIST','DOCTOR')")
    public List<Doctor> list(@RequestParam(required = false) String q) {
        return doctorService.list(q);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','RECEPTIONIST','DOCTOR')")
    public Doctor get(@PathVariable Long id) {
        return doctorService.get(id);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public Doctor create(@RequestBody Doctor doctor) {
        return doctorService.create(doctor);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public Doctor update(@PathVariable Long id, @RequestBody Doctor doctor) {
        return doctorService.update(id, doctor);
    }

    @GetMapping("/workload")
    @PreAuthorize("hasAnyRole('ADMIN','RECEPTIONIST')")
    public List<Map<String, Object>> workload() {
        return doctorService.workloadOverview();
    }
}
