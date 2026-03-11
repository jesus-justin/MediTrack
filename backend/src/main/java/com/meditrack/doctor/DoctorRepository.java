package com.meditrack.doctor;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface DoctorRepository extends JpaRepository<Doctor, Long> {
    @Query("""
            select count(d) from Doctor d
            where d.id not in (
                select distinct a.doctor.id from Appointment a
                where a.status <> com.meditrack.appointment.AppointmentStatus.CANCELED
            )
            """)
    long countDoctorsWithNoAppointments();

        List<Doctor> findTop8ByFullNameContainingIgnoreCaseOrSpecializationContainingIgnoreCaseOrDepartmentContainingIgnoreCaseOrderByIdDesc(
            String fullName,
            String specialization,
            String department
        );

    List<Doctor> findByFullNameContainingIgnoreCaseOrSpecializationContainingIgnoreCaseOrDepartmentContainingIgnoreCase(
            String fullName,
            String specialization,
            String department
    );
}
