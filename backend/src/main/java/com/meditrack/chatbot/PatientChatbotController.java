package com.meditrack.chatbot;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/patient-chatbot")
@RequiredArgsConstructor
public class PatientChatbotController {

    private final PatientChatbotService patientChatbotService;

    @PostMapping("/message")
    @PreAuthorize("hasAnyRole('PATIENT','RECEPTIONIST','DOCTOR','ADMIN')")
    public PatientChatbotDtos.ChatResponse message(@Valid @RequestBody PatientChatbotDtos.ChatRequest request) {
        String reply = patientChatbotService.generatePatientReply(request.message());
        return new PatientChatbotDtos.ChatResponse(reply);
    }
}
