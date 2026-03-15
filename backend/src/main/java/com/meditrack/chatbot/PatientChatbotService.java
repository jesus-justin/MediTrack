package com.meditrack.chatbot;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class PatientChatbotService {

    private static final Logger LOG = LoggerFactory.getLogger(PatientChatbotService.class);

    private static final String GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/";
    private static final String SYSTEM_INSTRUCTION = """
            You are a helpful patient assistant for MediTrack.
            Only answer questions about appointments, follow-ups, and portal navigation.
            Never provide medical diagnoses or treatment advice.
            Always recommend consulting a doctor for medical concerns.
            """;

    @Value("${app.ai.gemini-api-key:}")
    private String geminiApiKey;

    @Value("${app.ai.gemini-api-key-file:src/main/java/com/meditrack/chatbot/env}")
    private String geminiApiKeyFile;

    @Value("${app.ai.model:gemini-2.0-flash}")
    private String model;

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(12))
            .build();

    public String generatePatientReply(String userMessage) {
        String apiKey = resolveApiKey();
        if (apiKey == null || apiKey.isBlank()) {
            LOG.warn("Patient chatbot key is not configured. Returning fallback response.");
            return generateFallbackReply(userMessage);
        }

        String trimmed = userMessage == null ? "" : userMessage.trim();
        if (trimmed.isEmpty()) {
            throw new IllegalArgumentException("Message cannot be empty");
        }

        String boundedMessage = trimmed.length() > 1200 ? trimmed.substring(0, 1200) : trimmed;
        String prompt = SYSTEM_INSTRUCTION + "\nUser asks: " + boundedMessage;

        Set<String> modelCandidates = new LinkedHashSet<>();
        modelCandidates.add(model);
        modelCandidates.add("gemini-2.5-flash");
        modelCandidates.add("gemini-2.5-flash-lite");
        modelCandidates.add("gemini-2.0-flash");
        modelCandidates.add("gemini-1.5-flash");
        modelCandidates.add("gemini-1.5-flash-latest");

        try {
            String requestBody = objectMapper.writeValueAsString(java.util.Map.of(
                    "contents", java.util.List.of(
                            java.util.Map.of(
                                    "role", "user",
                                    "parts", java.util.List.of(java.util.Map.of("text", prompt))
                            )
                    ),
                    "generationConfig", java.util.Map.of(
                            "temperature", 0.4,
                            "maxOutputTokens", 400
                    )
            ));

            List<String> triedModels = new ArrayList<>();
            boolean anyRateLimited = false;
            for (String candidateModel : modelCandidates) {
                String endpoint = GEMINI_BASE_URL + URLEncoder.encode(candidateModel, StandardCharsets.UTF_8)
                    + ":generateContent?key=" + URLEncoder.encode(apiKey, StandardCharsets.UTF_8);

                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(endpoint))
                        .timeout(Duration.ofSeconds(20))
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() == 429) {
                    anyRateLimited = true;
                    triedModels.add(candidateModel + " (429: rate-limited)");
                    continue;
                }
                if (response.statusCode() == 400 || response.statusCode() == 404) {
                    String providerError = parseProviderError(response.body());
                    triedModels.add(candidateModel + " (" + response.statusCode() + ": " + providerError + ")");
                    if (isApiKeyError(providerError)) {
                        LOG.warn("Gemini key rejected by provider for model {}: {}", candidateModel, providerError);
                        return generateFallbackReply(userMessage);
                    }
                    continue;
                }
                if (response.statusCode() < 200 || response.statusCode() >= 300) {
                    String providerError = parseProviderError(response.body());
                    LOG.warn("Gemini provider error status {} on model {}: {}", response.statusCode(), candidateModel, providerError);
                    throw new ResponseStatusException(
                            HttpStatus.BAD_GATEWAY,
                            "AI assistant is temporarily unavailable. Please try again shortly."
                    );
                }

                JsonNode root = objectMapper.readTree(response.body());
                JsonNode textNode = root.path("candidates").path(0).path("content").path("parts").path(0).path("text");
                String reply = textNode.asText();
                if (reply == null || reply.isBlank()) {
                    throw new IllegalStateException("AI provider returned an empty response");
                }

                return reply.trim();
            }
            if (anyRateLimited) {
                LOG.warn("Gemini temporarily rate-limited across models. Tried: {}", String.join("; ", triedModels));
                return generateRateLimitedFallbackReply(userMessage);
            }
            LOG.warn("No Gemini model succeeded. Tried: {}", String.join("; ", triedModels));
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "AI assistant is temporarily unavailable. Please try again shortly."
            );
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("AI chatbot request was interrupted. Please try again.", ex);
        } catch (IOException ex) {
            throw new IllegalStateException("AI chatbot request failed. Please try again shortly.", ex);
        }
    }

    private boolean isApiKeyError(String providerError) {
        if (providerError == null) {
            return false;
        }
        String normalized = providerError.toLowerCase();
        return normalized.contains("api key not found")
                || normalized.contains("api_key_invalid")
                || normalized.contains("api key expired")
                || normalized.contains("invalid api key");
    }

    private String generateFallbackReply(String userMessage) {
        String normalized = userMessage == null ? "" : userMessage.toLowerCase();
        if (normalized.contains("appointment") || normalized.contains("book") || normalized.contains("resched") || normalized.contains("cancel")) {
            return "I can help with appointment actions. Open Appointments, choose your schedule, and use Quick Book for a new booking. If you need urgent changes, contact your clinic reception.";
        }
        if (normalized.contains("follow") || normalized.contains("checkup") || normalized.contains("next visit")) {
            return "For follow-up care, check your latest consultation notes, then open Appointments to schedule your next visit. If symptoms worsen, contact your doctor immediately.";
        }
        if (normalized.contains("portal") || normalized.contains("login") || normalized.contains("password") || normalized.contains("account")) {
            return "For portal access help, use the sidebar to navigate pages and contact an admin for account or password updates."
                    + " If access issues continue, report the exact error to your clinic support team.";
        }
        return "I can help with appointments, follow-ups, and portal guidance. Ask about booking, rescheduling, or navigating MediTrack features.";
    }

    private String generateRateLimitedFallbackReply(String userMessage) {
        String base = generateFallbackReply(userMessage);
        return base + " The live AI service is currently busy, but I can still guide you with MediTrack steps.";
    }

    private String parseProviderError(String body) {
        if (body == null || body.isBlank()) {
            return "Unknown provider error";
        }

        try {
            JsonNode root = objectMapper.readTree(body);
            String message = root.path("error").path("message").asText();
            if (message == null || message.isBlank()) {
                return compactMessage(body);
            }
            return compactMessage(message);
        } catch (IOException ignored) {
            return compactMessage(body);
        }
    }

    private String compactMessage(String value) {
        String singleLine = value.replaceAll("\\s+", " ").trim();
        if (singleLine.length() <= 240) {
            return singleLine;
        }
        return singleLine.substring(0, 240) + "...";
    }

    private String resolveApiKey() {
        String fileKey = readApiKeyFromFile();
        if (fileKey != null && !fileKey.isBlank()) {
            return fileKey;
        }
        return geminiApiKey;
    }

    private String readApiKeyFromFile() {
        List<Path> candidatePaths = List.of(
                Path.of(geminiApiKeyFile),
                Path.of("src/main/java/com/meditrack/chatbot/env"),
                Path.of("backend/src/main/java/com/meditrack/chatbot/env")
        );

        try {
            Path path = candidatePaths.stream().filter(Files::exists).findFirst().orElse(null);
            if (path == null) return "";

            for (String rawLine : Files.readAllLines(path)) {
                String line = rawLine.trim();
                if (line.isBlank() || line.startsWith("#")) {
                    continue;
                }

                if (line.contains("=")) {
                    String[] parts = line.split("=", 2);
                    if (parts.length == 2 && "GEMINI_API_KEY".equals(parts[0].trim())) {
                        return sanitizeValue(parts[1]);
                    }
                    continue;
                }

                return sanitizeValue(line);
            }
        } catch (IOException ignored) {
            return "";
        }

        return "";
    }

    private String sanitizeValue(String value) {
        String trimmed = value == null ? "" : value.trim();
        if ((trimmed.startsWith("\"") && trimmed.endsWith("\""))
                || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
            return trimmed.substring(1, trimmed.length() - 1).trim();
        }
        return trimmed;
    }
}
