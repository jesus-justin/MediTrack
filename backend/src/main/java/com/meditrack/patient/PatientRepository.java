package com.meditrack.patient;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PatientRepository extends JpaRepository<Patient, Long> {
    boolean existsByPatientCode(String patientCode);

    List<Patient> findByFirstNameContainingIgnoreCaseOrLastNameContainingIgnoreCaseOrPatientCodeContainingIgnoreCase(
            String firstName,
            String lastName,
            String patientCode
    );
}
