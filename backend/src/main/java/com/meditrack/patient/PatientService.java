package com.meditrack.patient;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PatientService {

    private final PatientRepository patientRepository;

    public Patient create(Patient patient) {
        patient.setPatientCode(generatePatientCode());
        return patientRepository.save(patient);
    }

    public Patient update(Long id, Patient request) {
        Patient patient = get(id);
        patient.setFirstName(request.getFirstName());
        patient.setLastName(request.getLastName());
        patient.setDateOfBirth(request.getDateOfBirth());
        patient.setGender(request.getGender());
        patient.setPhone(request.getPhone());
        patient.setEmail(request.getEmail());
        patient.setAddress(request.getAddress());
        patient.setInsuranceProvider(request.getInsuranceProvider());
        patient.setMedicalHistory(request.getMedicalHistory());
        return patientRepository.save(patient);
    }

    public Patient get(Long id) {
        return patientRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Patient not found"));
    }

    public List<Patient> list(String q) {
        if (q == null || q.isBlank()) {
            return patientRepository.findAll();
        }
        return patientRepository.findByFirstNameContainingIgnoreCaseOrLastNameContainingIgnoreCaseOrPatientCodeContainingIgnoreCase(q, q, q);
    }

    private String generatePatientCode() {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyyMMdd");
        String datePart = LocalDate.now().format(formatter);
        String code;
        do {
            int random = (int) (Math.random() * 9000) + 1000;
            code = "PT-" + datePart + "-" + random;
        } while (patientRepository.existsByPatientCode(code));
        return code;
    }
}
