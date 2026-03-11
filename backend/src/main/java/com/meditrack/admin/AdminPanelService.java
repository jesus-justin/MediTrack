package com.meditrack.admin;

import com.meditrack.appointment.Appointment;
import com.meditrack.appointment.AppointmentRepository;
import com.meditrack.appointment.AppointmentStatus;
import com.meditrack.auth.Role;
import com.meditrack.auth.User;
import com.meditrack.auth.UserRepository;
import com.meditrack.consultation.ConsultationRecord;
import com.meditrack.consultation.ConsultationRepository;
import com.meditrack.doctor.Doctor;
import com.meditrack.doctor.DoctorRepository;
import com.meditrack.patient.Patient;
import com.meditrack.patient.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AdminPanelService {

    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final AppointmentRepository appointmentRepository;
    private final ConsultationRepository consultationRepository;
    private final AdminAuditService adminAuditService;

    public AdminPanelDtos.SearchResponse advancedSearch(String q) {
        String normalized = q == null ? "" : q.trim();
        if (normalized.isBlank()) {
            return new AdminPanelDtos.SearchResponse("", 0, Map.of());
        }

        List<AdminPanelDtos.SearchItem> users = userRepository
                .findTop8ByUsernameContainingIgnoreCaseOrEmailContainingIgnoreCaseOrderByCreatedAtDesc(normalized, normalized)
                .stream()
                .map(this::toUserSearchItem)
                .toList();

        List<AdminPanelDtos.SearchItem> patients = patientRepository
                .findTop8ByFirstNameContainingIgnoreCaseOrLastNameContainingIgnoreCaseOrPatientCodeContainingIgnoreCaseOrEmailContainingIgnoreCaseOrPhoneContainingIgnoreCaseOrderByCreatedAtDesc(
                        normalized, normalized, normalized, normalized, normalized
                )
                .stream()
                .map(this::toPatientSearchItem)
                .toList();

        List<AdminPanelDtos.SearchItem> doctors = doctorRepository
                .findTop8ByFullNameContainingIgnoreCaseOrSpecializationContainingIgnoreCaseOrDepartmentContainingIgnoreCaseOrderByIdDesc(
                        normalized, normalized, normalized
                )
                .stream()
                .map(this::toDoctorSearchItem)
                .toList();

        List<AdminPanelDtos.SearchItem> appointments = appointmentRepository.searchForAdmin(normalized)
                .stream()
                .limit(8)
                .map(this::toAppointmentSearchItem)
                .toList();

        List<AdminPanelDtos.SearchItem> consultations = consultationRepository.searchForAdmin(normalized)
                .stream()
                .limit(8)
                .map(this::toConsultationSearchItem)
                .toList();

        Map<String, List<AdminPanelDtos.SearchItem>> groups = new HashMap<>();
        groups.put("users", users);
        groups.put("patients", patients);
        groups.put("doctors", doctors);
        groups.put("appointments", appointments);
        groups.put("consultations", consultations);

        int total = users.size() + patients.size() + doctors.size() + appointments.size() + consultations.size();
        return new AdminPanelDtos.SearchResponse(normalized, total, groups);
    }

    public List<AdminPanelDtos.AuditEntryResponse> recentAudit(int limit) {
        return adminAuditService.listRecent(limit).stream()
                .map(log -> new AdminPanelDtos.AuditEntryResponse(
                        log.getId(),
                        log.getActorUsername(),
                        log.getAction(),
                        log.getTargetType(),
                        log.getTargetId(),
                        log.getDetails(),
                        log.getCreatedAt()
                ))
                .toList();
    }

    public AdminPanelDtos.ReportsSummaryResponse reportsSummary() {
        long totalUsers = userRepository.count();
        long enabledUsers = userRepository.countByEnabled(true);
        long disabledUsers = userRepository.countByEnabled(false);
        long adminUsers = userRepository.countByRole(Role.ADMIN);

        List<Object[]> statusRows = appointmentRepository.countByStatus();
        Map<String, Long> appointmentStatus = new HashMap<>();
        for (Object[] row : statusRows) {
            appointmentStatus.put(row[0].toString(), ((Number) row[1]).longValue());
        }

        long patients = patientRepository.count();
        long doctors = doctorRepository.count();
        long consultations = consultationRepository.count();
        long totalAppointments = appointmentStatus.values().stream().mapToLong(Long::longValue).sum();

        long unresolvedCompleted = appointmentRepository.countCompletedWithNoConsultation();
        long orphanPatients = patientRepository.countPatientsWithNoAppointments();
        long idleDoctors = doctorRepository.countDoctorsWithNoAppointments();

        Map<String, Object> overview = Map.of(
                "patients", patients,
                "doctors", doctors,
                "appointments", totalAppointments,
                "consultations", consultations
        );

        Map<String, Object> operations = Map.of(
                "appointmentStatus", appointmentStatus,
                "completedWithConsultationCoverage",
                appointmentStatus.getOrDefault("COMPLETED", 0L) == 0 ? 0D :
                        Math.round((consultations * 10000D) / appointmentStatus.getOrDefault("COMPLETED", 0L)) / 100D
        );

        Map<String, Object> security = Map.of(
                "totalUsers", totalUsers,
                "enabledUsers", enabledUsers,
                "disabledUsers", disabledUsers,
                "adminUsers", adminUsers,
                "jwtEnabled", true,
                "passwordHashing", "BCrypt"
        );

        Map<String, Object> integrity = Map.of(
                "completedAppointmentsWithoutConsultation", unresolvedCompleted,
                "patientsWithoutAppointments", orphanPatients,
                "doctorsWithoutAppointments", idleDoctors
        );

        return new AdminPanelDtos.ReportsSummaryResponse(
                LocalDateTime.now(),
                overview,
                operations,
                security,
                integrity
        );
    }

    @Transactional
    public AdminPanelDtos.WorkflowRunResponse runMaintenanceWorkflow(String actorUsername) {
        LocalDateTime threshold = LocalDateTime.now().minusDays(30);
        List<Appointment> stalePending = appointmentRepository.findStalePending(threshold);

        int canceled = 0;
        for (Appointment appointment : stalePending) {
            appointment.setStatus(AppointmentStatus.CANCELED);
            String existing = appointment.getNotes() == null ? "" : appointment.getNotes() + "\n";
            appointment.setNotes(existing + "[AUTO] Canceled by maintenance workflow due to stale pending status.");
            canceled++;
        }
        if (!stalePending.isEmpty()) {
            appointmentRepository.saveAll(stalePending);
        }

        long unresolvedCompleted = appointmentRepository.countCompletedWithNoConsultation();
        long orphanPatients = patientRepository.countPatientsWithNoAppointments();
        long idleDoctors = doctorRepository.countDoctorsWithNoAppointments();

        String details = "Canceled stale pending appointments=" + canceled
                + ", unresolvedCompleted=" + unresolvedCompleted
                + ", orphanPatients=" + orphanPatients
                + ", idleDoctors=" + idleDoctors;

        adminAuditService.record(actorUsername, "RUN_MAINTENANCE_WORKFLOW", "SYSTEM", "maintenance-v1", details);

        return new AdminPanelDtos.WorkflowRunResponse(
                "maintenance-v1",
                LocalDateTime.now(),
                canceled,
                unresolvedCompleted,
                orphanPatients,
                idleDoctors,
                canceled > 0 ? "Workflow completed and stale appointments were auto-canceled." : "Workflow completed. No stale pending appointments found."
        );
    }

    private AdminPanelDtos.SearchItem toUserSearchItem(User user) {
        return new AdminPanelDtos.SearchItem(
                "USER",
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getRole().name(),
                user.isEnabled() ? "Enabled" : "Disabled"
        );
    }

    private AdminPanelDtos.SearchItem toPatientSearchItem(Patient patient) {
        String fullName = (patient.getFirstName() + " " + patient.getLastName()).trim();
        return new AdminPanelDtos.SearchItem(
                "PATIENT",
                patient.getId(),
                fullName,
                patient.getPatientCode(),
                patient.getGender(),
                patient.getPhone()
        );
    }

    private AdminPanelDtos.SearchItem toDoctorSearchItem(Doctor doctor) {
        return new AdminPanelDtos.SearchItem(
                "DOCTOR",
                doctor.getId(),
                doctor.getFullName(),
                doctor.getSpecialization(),
                doctor.getDepartment(),
                doctor.isActive() ? "Active" : "Inactive"
        );
    }

    private AdminPanelDtos.SearchItem toAppointmentSearchItem(Appointment appointment) {
        String patientName = (appointment.getPatient().getFirstName() + " " + appointment.getPatient().getLastName()).trim();
        return new AdminPanelDtos.SearchItem(
                "APPOINTMENT",
                appointment.getId(),
                patientName,
                appointment.getDoctor().getFullName(),
                appointment.getStatus().name(),
                appointment.getStartTime().toString()
        );
    }

    private AdminPanelDtos.SearchItem toConsultationSearchItem(ConsultationRecord consultation) {
        return new AdminPanelDtos.SearchItem(
                "CONSULTATION",
                consultation.getId(),
                consultation.getDiagnosis(),
                consultation.getAppointment().getDoctor().getFullName(),
                consultation.getCreatedAt().toLocalDate().toString(),
                consultation.getAppointment().getPatient().getPatientCode()
        );
    }
}
