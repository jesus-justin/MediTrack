package com.meditrack.appointment;

import com.meditrack.doctor.Doctor;
import com.meditrack.doctor.DoctorRepository;
import com.meditrack.patient.Patient;
import com.meditrack.patient.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;

    public Appointment create(AppointmentDtos.AppointmentRequest request) {
        validateDates(request.startTime(), request.endTime());
        ensureNoConflict(request.doctorId(), request.startTime(), request.endTime(), null);

        Patient patient = patientRepository.findById(request.patientId())
                .orElseThrow(() -> new IllegalArgumentException("Patient not found"));

        Doctor doctor = doctorRepository.findById(request.doctorId())
                .orElseThrow(() -> new IllegalArgumentException("Doctor not found"));

        Appointment appointment = Appointment.builder()
                .patient(patient)
                .doctor(doctor)
                .startTime(request.startTime())
                .endTime(request.endTime())
                .reason(request.reason())
                .notes(request.notes())
                .status(AppointmentStatus.PENDING)
                .build();

        return appointmentRepository.save(appointment);
    }

    public Appointment reschedule(Long id, AppointmentDtos.AppointmentRequest request) {
        validateDates(request.startTime(), request.endTime());
        Appointment appointment = get(id);
        ensureNoConflict(request.doctorId(), request.startTime(), request.endTime(), id);

        Patient patient = patientRepository.findById(request.patientId())
                .orElseThrow(() -> new IllegalArgumentException("Patient not found"));
        Doctor doctor = doctorRepository.findById(request.doctorId())
                .orElseThrow(() -> new IllegalArgumentException("Doctor not found"));

        appointment.setPatient(patient);
        appointment.setDoctor(doctor);
        appointment.setStartTime(request.startTime());
        appointment.setEndTime(request.endTime());
        appointment.setReason(request.reason());
        appointment.setNotes(request.notes());

        return appointmentRepository.save(appointment);
    }

    public Appointment updateStatus(Long id, AppointmentStatus status) {
        Appointment appointment = get(id);
        appointment.setStatus(status);
        return appointmentRepository.save(appointment);
    }

    public Appointment cancel(Long id) {
        return updateStatus(id, AppointmentStatus.CANCELED);
    }

    public List<Appointment> list() {
        return appointmentRepository.findAll();
    }

    public Appointment get(Long id) {
        return appointmentRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Appointment not found"));
    }

    private void ensureNoConflict(Long doctorId, java.time.LocalDateTime startTime, java.time.LocalDateTime endTime, Long appointmentId) {
        if (appointmentRepository.hasConflict(doctorId, startTime, endTime, appointmentId)) {
            throw new IllegalArgumentException("Scheduling conflict: doctor already has an appointment in that timeslot");
        }
    }

    private void validateDates(java.time.LocalDateTime startTime, java.time.LocalDateTime endTime) {
        if (!endTime.isAfter(startTime)) {
            throw new IllegalArgumentException("End time must be after start time");
        }
    }
}
