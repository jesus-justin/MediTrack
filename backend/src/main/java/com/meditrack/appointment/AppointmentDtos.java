package com.meditrack.appointment;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

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

        public record ArrangeTimeRequest(
            @NotNull @Future LocalDateTime startTime,
            @NotNull @Future LocalDateTime endTime,
            Long doctorId,
            String notes
        ) {
        }

        public record SlotSuggestionRequest(
            @NotNull Long doctorId,
            @NotNull LocalDate date,
            @NotNull @Min(15) @Max(180) Integer durationMinutes,
            @Min(1) @Max(30) Integer limit
        ) {
        }

        public record TimeSlot(
            LocalDateTime startTime,
            LocalDateTime endTime
        ) {
        }

        public record SlotSuggestionResponse(
            Long doctorId,
            LocalDate date,
            int durationMinutes,
            List<TimeSlot> slots
        ) {
        }
}
