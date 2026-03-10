package com.meditrack.consultation;

import com.meditrack.appointment.Appointment;
import com.meditrack.appointment.AppointmentRepository;
import com.meditrack.appointment.AppointmentStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ConsultationService {

    private final ConsultationRepository consultationRepository;
    private final AppointmentRepository appointmentRepository;

    public ConsultationRecord create(ConsultationRecord request, Long appointmentId) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new IllegalArgumentException("Appointment not found"));

        ConsultationRecord record = ConsultationRecord.builder()
                .appointment(appointment)
                .diagnosis(request.getDiagnosis())
                .prescription(request.getPrescription())
                .notes(request.getNotes())
                .attachmentUrl(request.getAttachmentUrl())
                .build();

        appointment.setStatus(AppointmentStatus.COMPLETED);
        appointmentRepository.save(appointment);

        return consultationRepository.save(record);
    }

    public List<ConsultationRecord> timeline(Long patientId) {
        return consultationRepository.timelineByPatient(patientId);
    }

    public List<ConsultationRecord> list() {
        return consultationRepository.findAll();
    }
}
