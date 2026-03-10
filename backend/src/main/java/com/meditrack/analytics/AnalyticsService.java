package com.meditrack.analytics;

import com.meditrack.appointment.AppointmentRepository;
import com.meditrack.consultation.ConsultationRepository;
import com.meditrack.patient.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.Period;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final AppointmentRepository appointmentRepository;
    private final ConsultationRepository consultationRepository;
    private final PatientRepository patientRepository;

    public Map<String, Object> dashboard() {
        Map<String, Object> data = new HashMap<>();
        data.put("appointmentTrends", appointmentRepository.appointmentTrendDaily());
        data.put("commonDiagnoses", consultationRepository.commonDiagnoses());
        data.put("doctorUtilization", appointmentRepository.countAppointmentsPerDoctor());
        data.put("patientDemographics", patientDemographics());
        data.put("peakHours", appointmentRepository.peakHourHeatmap());
        return data;
    }

    private Map<String, Object> patientDemographics() {
        List<com.meditrack.patient.Patient> patients = patientRepository.findAll();

        Map<String, Long> gender = patients.stream()
                .collect(java.util.stream.Collectors.groupingBy(
                        p -> p.getGender() == null ? "Unknown" : p.getGender(),
                        java.util.stream.Collectors.counting()
                ));

        Map<String, Long> location = patients.stream()
                .collect(java.util.stream.Collectors.groupingBy(
                        p -> p.getAddress() == null || p.getAddress().isBlank() ? "Unknown" : p.getAddress(),
                        java.util.stream.Collectors.counting()
                ));

        Map<String, Long> ageBand = new HashMap<>();
        for (var p : patients) {
            int age = Period.between(p.getDateOfBirth(), LocalDate.now()).getYears();
            String bucket = age < 18 ? "0-17" : age < 35 ? "18-34" : age < 50 ? "35-49" : age < 65 ? "50-64" : "65+";
            ageBand.put(bucket, ageBand.getOrDefault(bucket, 0L) + 1);
        }

        return Map.of("gender", gender, "location", location, "ageBand", ageBand);
    }
}
