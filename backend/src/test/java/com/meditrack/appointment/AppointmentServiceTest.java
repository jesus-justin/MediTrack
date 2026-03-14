package com.meditrack.appointment;

import com.meditrack.doctor.Doctor;
import com.meditrack.doctor.DoctorRepository;
import com.meditrack.patient.Patient;
import com.meditrack.patient.PatientRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AppointmentServiceTest {

    @Mock private AppointmentRepository appointmentRepository;
    @Mock private PatientRepository patientRepository;
    @Mock private DoctorRepository doctorRepository;

    @InjectMocks
    private AppointmentService appointmentService;

    private static final LocalDateTime FUTURE_START = LocalDateTime.now().plusHours(2);
    private static final LocalDateTime FUTURE_END   = LocalDateTime.now().plusHours(3);

    private Patient samplePatient() {
        return Patient.builder()
                .id(1L).firstName("John").lastName("Doe")
                .dateOfBirth(LocalDate.of(1990, 1, 1)).gender("Male")
                .build();
    }

    private Doctor sampleDoctor() {
        return Doctor.builder()
                .id(2L).fullName("Dr. Smith").specialization("Cardiology")
                .department("Cardio").active(true)
                .build();
    }

    // ── create ──────────────────────────────────────────────────────────────

    @Test
    void create_success_returnsAppointmentWithPendingStatus() {
        AppointmentDtos.AppointmentRequest request =
                new AppointmentDtos.AppointmentRequest(1L, 2L, FUTURE_START, FUTURE_END, "Checkup", null);
        when(appointmentRepository.hasConflict(any(), any(), any(), any())).thenReturn(false);
        when(patientRepository.findById(1L)).thenReturn(Optional.of(samplePatient()));
        when(doctorRepository.findById(2L)).thenReturn(Optional.of(sampleDoctor()));
        when(appointmentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Appointment result = appointmentService.create(request);

        assertNotNull(result);
        assertEquals(AppointmentStatus.PENDING, result.getStatus());
        assertEquals("Checkup", result.getReason());
        verify(appointmentRepository).save(any(Appointment.class));
    }

    @Test
    void create_endBeforeStart_throws() {
        // Swap start/end so endTime <= startTime
        AppointmentDtos.AppointmentRequest request =
                new AppointmentDtos.AppointmentRequest(1L, 2L, FUTURE_END, FUTURE_START, null, null);

        assertThrows(IllegalArgumentException.class, () -> appointmentService.create(request));
        verify(appointmentRepository, never()).save(any());
    }

    @Test
    void create_conflictDetected_throws() {
        AppointmentDtos.AppointmentRequest request =
                new AppointmentDtos.AppointmentRequest(1L, 2L, FUTURE_START, FUTURE_END, null, null);
        when(appointmentRepository.hasConflict(any(), any(), any(), any())).thenReturn(true);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> appointmentService.create(request));
        assertTrue(ex.getMessage().contains("Scheduling conflict"));
    }

    @Test
    void create_patientNotFound_throws() {
        AppointmentDtos.AppointmentRequest request =
                new AppointmentDtos.AppointmentRequest(99L, 2L, FUTURE_START, FUTURE_END, null, null);
        when(appointmentRepository.hasConflict(any(), any(), any(), any())).thenReturn(false);
        when(patientRepository.findById(99L)).thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> appointmentService.create(request));
        assertEquals("Patient not found", ex.getMessage());
    }

    @Test
    void create_doctorNotFound_throws() {
        AppointmentDtos.AppointmentRequest request =
                new AppointmentDtos.AppointmentRequest(1L, 99L, FUTURE_START, FUTURE_END, null, null);
        when(appointmentRepository.hasConflict(any(), any(), any(), any())).thenReturn(false);
        when(patientRepository.findById(1L)).thenReturn(Optional.of(samplePatient()));
        when(doctorRepository.findById(99L)).thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> appointmentService.create(request));
        assertEquals("Doctor not found", ex.getMessage());
    }

    // ── get / status ─────────────────────────────────────────────────────────

    @Test
    void get_notFound_throws() {
        when(appointmentRepository.findById(999L)).thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> appointmentService.get(999L));
        assertEquals("Appointment not found", ex.getMessage());
    }

    @Test
    void updateStatus_updatesStatusAndSaves() {
        Appointment appointment = Appointment.builder()
                .id(1L).patient(samplePatient()).doctor(sampleDoctor())
                .startTime(FUTURE_START).endTime(FUTURE_END)
                .status(AppointmentStatus.PENDING).build();
        when(appointmentRepository.findById(1L)).thenReturn(Optional.of(appointment));
        when(appointmentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Appointment result = appointmentService.updateStatus(1L, AppointmentStatus.CONFIRMED);

        assertEquals(AppointmentStatus.CONFIRMED, result.getStatus());
    }

    @Test
    void cancel_setsStatusToCanceled() {
        Appointment appointment = Appointment.builder()
                .id(1L).patient(samplePatient()).doctor(sampleDoctor())
                .startTime(FUTURE_START).endTime(FUTURE_END)
                .status(AppointmentStatus.CONFIRMED).build();
        when(appointmentRepository.findById(1L)).thenReturn(Optional.of(appointment));
        when(appointmentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Appointment result = appointmentService.cancel(1L);

        assertEquals(AppointmentStatus.CANCELED, result.getStatus());
    }

    // ── arrangeTime ──────────────────────────────────────────────────────────

    @Test
    void arrangeTime_appendsNoteToExistingNotes() {
        Appointment appointment = Appointment.builder()
                .id(1L).patient(samplePatient()).doctor(sampleDoctor())
                .startTime(FUTURE_START).endTime(FUTURE_END)
                .status(AppointmentStatus.PENDING).notes("Initial note").build();
        when(appointmentRepository.findById(1L)).thenReturn(Optional.of(appointment));
        when(appointmentRepository.hasConflict(any(), any(), any(), eq(1L))).thenReturn(false);
        when(appointmentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        AppointmentDtos.ArrangeTimeRequest request = new AppointmentDtos.ArrangeTimeRequest(
                FUTURE_START.plusDays(1), FUTURE_END.plusDays(1), null, "Addendum");
        Appointment result = appointmentService.arrangeTime(1L, request);

        assertEquals("Initial note | Addendum", result.getNotes());
    }

    @Test
    void arrangeTime_setsNotesWhenPreviouslyNull() {
        Appointment appointment = Appointment.builder()
                .id(1L).patient(samplePatient()).doctor(sampleDoctor())
                .startTime(FUTURE_START).endTime(FUTURE_END)
                .status(AppointmentStatus.PENDING).notes(null).build();
        when(appointmentRepository.findById(1L)).thenReturn(Optional.of(appointment));
        when(appointmentRepository.hasConflict(any(), any(), any(), eq(1L))).thenReturn(false);
        when(appointmentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        AppointmentDtos.ArrangeTimeRequest request = new AppointmentDtos.ArrangeTimeRequest(
                FUTURE_START.plusDays(1), FUTURE_END.plusDays(1), null, "First note");
        Appointment result = appointmentService.arrangeTime(1L, request);

        assertEquals("First note", result.getNotes());
    }
}
