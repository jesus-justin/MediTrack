package com.meditrack.patient;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface PatientRepository extends JpaRepository<Patient, Long> {
    boolean existsByPatientCode(String patientCode);

    @Query("select count(p) from Patient p where p.id not in (select distinct a.patient.id from Appointment a)")
    long countPatientsWithNoAppointments();

        List<Patient> findTop8ByFirstNameContainingIgnoreCaseOrLastNameContainingIgnoreCaseOrPatientCodeContainingIgnoreCaseOrEmailContainingIgnoreCaseOrPhoneContainingIgnoreCaseOrderByCreatedAtDesc(
            String firstName,
            String lastName,
            String patientCode,
            String email,
            String phone
        );

    List<Patient> findByFirstNameContainingIgnoreCaseOrLastNameContainingIgnoreCaseOrPatientCodeContainingIgnoreCase(
            String firstName,
            String lastName,
            String patientCode
    );
}
