package com.meditrack.analytics;

import com.meditrack.appointment.AppointmentRepository;
import com.meditrack.auth.Role;
import com.meditrack.auth.UserRepository;
import com.meditrack.doctor.DoctorRepository;
import com.meditrack.patient.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AdminAnalyticsService {

    private final AppointmentRepository appointmentRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final UserRepository userRepository;

    public Map<String, Object> systemStats() {
        // Appointment status breakdown
        List<Object[]> statusRaw = appointmentRepository.countByStatus();
        Map<String, Long> appointmentsByStatus = new HashMap<>();
        for (Object[] row : statusRaw) {
            appointmentsByStatus.put(row[0].toString(), ((Number) row[1]).longValue());
        }

        // Data integrity checks
        long patientsWithNoAppointments = patientRepository.countPatientsWithNoAppointments();
        long doctorsWithNoAppointments = doctorRepository.countDoctorsWithNoAppointments();
        long completedWithNoConsultation = appointmentRepository.countCompletedWithNoConsultation();

        // Security and access-control stats
        LocalDateTime lastWeek = LocalDateTime.now().minusDays(7);
        long usersCreatedLastWeek = userRepository.countByCreatedAtAfter(lastWeek);
        long adminCount = userRepository.countByRole(Role.ADMIN);
        long disabledCount = userRepository.countByEnabled(false);

        Map<String, Object> result = new HashMap<>();
        result.put("appointmentsByStatus", appointmentsByStatus);
        result.put("patientsWithNoAppointments", patientsWithNoAppointments);
        result.put("doctorsWithNoAppointments", doctorsWithNoAppointments);
        result.put("completedWithNoConsultation", completedWithNoConsultation);
        result.put("usersCreatedLastWeek", usersCreatedLastWeek);
        result.put("adminCount", adminCount);
        result.put("disabledCount", disabledCount);
        return result;
    }
}
