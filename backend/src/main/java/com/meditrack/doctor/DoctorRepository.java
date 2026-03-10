package com.meditrack.doctor;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DoctorRepository extends JpaRepository<Doctor, Long> {
    List<Doctor> findByFullNameContainingIgnoreCaseOrSpecializationContainingIgnoreCaseOrDepartmentContainingIgnoreCase(
            String fullName,
            String specialization,
            String department
    );
}
