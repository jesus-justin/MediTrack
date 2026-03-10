package com.meditrack.doctor;

import com.meditrack.appointment.AppointmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DoctorService {

    private final DoctorRepository doctorRepository;
    private final AppointmentRepository appointmentRepository;

    public Doctor create(Doctor doctor) {
        return doctorRepository.save(doctor);
    }

    public Doctor update(Long id, Doctor request) {
        Doctor doctor = get(id);
        doctor.setFullName(request.getFullName());
        doctor.setSpecialization(request.getSpecialization());
        doctor.setDepartment(request.getDepartment());
        doctor.setSchedule(request.getSchedule());
        doctor.setActive(request.isActive());
        return doctorRepository.save(doctor);
    }

    public Doctor get(Long id) {
        return doctorRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Doctor not found"));
    }

    public List<Doctor> list(String q) {
        if (q == null || q.isBlank()) {
            return doctorRepository.findAll();
        }
        return doctorRepository.findByFullNameContainingIgnoreCaseOrSpecializationContainingIgnoreCaseOrDepartmentContainingIgnoreCase(q, q, q);
    }

    public List<Map<String, Object>> workloadOverview() {
        return appointmentRepository.countAppointmentsPerDoctor().stream().map(row -> Map.of(
                "doctorId", row[0],
                "doctorName", row[1],
                "appointmentCount", row[2]
        )).collect(Collectors.toList());
    }
}
