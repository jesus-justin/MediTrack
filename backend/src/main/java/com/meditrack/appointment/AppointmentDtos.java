package com.meditrack.appointment;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

public class AppointmentDtos {

    public record AppointmentRequest(
            @NotNull Long patientId,
            @NotNull Long doctorId,
            @NotNull @Future LocalDateTime startTime,
            @NotNull @Future LocalDateTime endTime,
            String reason,
            String notes
    ) {
    }
}
