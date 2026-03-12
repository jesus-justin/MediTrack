package com.meditrack.appointment;

import com.meditrack.doctor.Doctor;
import com.meditrack.doctor.DoctorRepository;
import com.meditrack.patient.Patient;
import com.meditrack.patient.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
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

    public Appointment arrangeTime(Long id, AppointmentDtos.ArrangeTimeRequest request) {
        validateDates(request.startTime(), request.endTime());

        Appointment appointment = get(id);
        Long targetDoctorId = request.doctorId() == null ? appointment.getDoctor().getId() : request.doctorId();
        ensureNoConflict(targetDoctorId, request.startTime(), request.endTime(), id);

        if (!targetDoctorId.equals(appointment.getDoctor().getId())) {
            Doctor doctor = doctorRepository.findById(targetDoctorId)
                    .orElseThrow(() -> new IllegalArgumentException("Doctor not found"));
            appointment.setDoctor(doctor);
        }

        appointment.setStartTime(request.startTime());
        appointment.setEndTime(request.endTime());
        if (request.notes() != null && !request.notes().isBlank()) {
            String existingNotes = appointment.getNotes() == null ? "" : appointment.getNotes().trim();
            String newNotes = request.notes().trim();
            appointment.setNotes(existingNotes.isBlank() ? newNotes : existingNotes + " | " + newNotes);
        }

        return appointmentRepository.save(appointment);
    }

    public AppointmentDtos.SlotSuggestionResponse suggestSlots(AppointmentDtos.SlotSuggestionRequest request) {
        doctorRepository.findById(request.doctorId())
                .orElseThrow(() -> new IllegalArgumentException("Doctor not found"));

        int duration = request.durationMinutes();
        int limit = request.limit() == null ? 8 : request.limit();

        LocalDateTime dayStart = LocalDateTime.of(request.date(), LocalTime.of(8, 0));
        LocalDateTime dayEnd = LocalDateTime.of(request.date(), LocalTime.of(18, 0));
        List<Appointment> dayAppointments = appointmentRepository.findDoctorAppointmentsForDate(request.doctorId(), dayStart, dayEnd);

        LocalDateTime now = LocalDateTime.now();
        LocalDate today = now.toLocalDate();

        List<AppointmentDtos.TimeSlot> slots = new ArrayList<>();
        LocalDateTime cursor = dayStart;

        while (!cursor.plusMinutes(duration).isAfter(dayEnd) && slots.size() < limit) {
            LocalDateTime slotEnd = cursor.plusMinutes(duration);
            boolean inPast = request.date().equals(today) && !cursor.isAfter(now);

            if (!inPast && isAvailable(dayAppointments, cursor, slotEnd)) {
                slots.add(new AppointmentDtos.TimeSlot(cursor, slotEnd));
            }

            cursor = cursor.plusMinutes(15);
        }

        return new AppointmentDtos.SlotSuggestionResponse(
                request.doctorId(),
                request.date(),
                duration,
                slots
        );
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

    private boolean isAvailable(List<Appointment> appointments, LocalDateTime start, LocalDateTime end) {
        for (Appointment appointment : appointments) {
            boolean overlap = start.isBefore(appointment.getEndTime()) && end.isAfter(appointment.getStartTime());
            if (overlap) {
                return false;
            }
        }
        return true;
    }

    private void validateDates(java.time.LocalDateTime startTime, java.time.LocalDateTime endTime) {
        if (!endTime.isAfter(startTime)) {
            throw new IllegalArgumentException("End time must be after start time");
        }
    }
}
