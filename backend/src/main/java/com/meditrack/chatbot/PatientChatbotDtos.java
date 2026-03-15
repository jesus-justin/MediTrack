package com.meditrack.chatbot;

import jakarta.validation.constraints.NotBlank;

public class PatientChatbotDtos {

    public record ChatRequest(
            @NotBlank String message
    ) {
    }

    public record ChatResponse(
            String reply
    ) {
    }
}
