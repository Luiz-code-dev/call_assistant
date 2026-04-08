package com.callassistant.infrastructure.adapter.outbound.ai.copilot;

import com.callassistant.domain.model.CopilotSuggestion;
import com.callassistant.domain.model.SessionConfig;
import com.callassistant.domain.port.outbound.CopilotPort;
import com.callassistant.infrastructure.config.OpenAiProperties;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
@ConditionalOnProperty(name = "callassistant.ai.copilot.provider", havingValue = "openai")
public class OpenAiCopilotAdapter implements CopilotPort {

    private static final String SUGGESTIONS_MARKER = "RESPOSTAS SUGERIDAS:";

    private final WebClient openAiWebClient;
    private final OpenAiProperties openAiProperties;

    public OpenAiCopilotAdapter(
            @Qualifier("openAiWebClient") WebClient openAiWebClient,
            OpenAiProperties openAiProperties) {
        this.openAiWebClient = openAiWebClient;
        this.openAiProperties = openAiProperties;
    }

    @Override
    public Mono<CopilotSuggestion> suggest(String sessionId, String transcriptText, SessionConfig config) {
        if (transcriptText == null || transcriptText.isBlank()) {
            return Mono.empty();
        }
        var promptId = openAiProperties.getCopilotPromptId();
        if (promptId == null || promptId.isBlank()) {
            log.warn("Copilot prompt ID not configured — skipping");
            return Mono.empty();
        }

        var context = config.meetingContext() != null ? config.meetingContext() : "";
        var sourceLang = config.sourceLanguage().getCode();
        var targetLang = config.targetLanguage().getCode();

        var contextLine = context.isBlank()
                ? "This is a general conversation. Keep replies natural and conversational."
                : "Conversation context: " + context;

        var systemPrompt = """
                You are a real-time call assistant for a Brazilian user having a conversation in English.
                Given a transcript snippet, you must:
                1. Translate it from %s to %s.
                2. Suggest 3 possible replies the user could give, written in English.
                   IMPORTANT: Adapt the tone and style to match the conversation context below. Do NOT default to formal or interview-style replies unless the context explicitly mentions an interview.
                3. For each reply, also provide a Portuguese (Brazil) translation so the user understands what they would be saying.
                %s
                Respond in EXACTLY this format (no extra text before or after):
                <pt-br translation of transcript>
                RESPOSTAS SUGERIDAS:
                1. Curta: <short reply in English>
                   PT: <Portuguese translation of short reply>
                2. Profissional: <professional reply in English>
                   PT: <Portuguese translation of professional reply>
                3. Detalhada: <detailed reply in English>
                   PT: <Portuguese translation of detailed reply>
                """.formatted(sourceLang, targetLang, contextLine);

        var messages = List.of(
                Map.of("role", "system", "content", systemPrompt),
                Map.of("role", "user", "content", transcriptText)
        );

        var request = Map.of(
                "model", openAiProperties.getTranslationModel(),
                "messages", messages
        );

        log.info("Copilot calling /chat/completions — sessionId={}", sessionId);

        return openAiWebClient.post()
                .uri("/chat/completions")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .retrieve()
                .onStatus(status -> !status.is2xxSuccessful(), response ->
                        response.bodyToMono(String.class)
                                .doOnNext(body -> log.error("Copilot API {} error — body: {}", response.statusCode(), body))
                                .then(Mono.error(new RuntimeException("Copilot API error: " + response.statusCode()))))
                .bodyToMono(ChatResponse.class)
                .mapNotNull(ChatResponse::contentSafely)
                .filter(text -> !text.isBlank())
                .flatMap(text -> parseOutputText(sessionId, text))
                .doOnNext(s -> log.info("Copilot — sessionId={}, translation='{}', suggestions={}",
                        sessionId, s.contextSummary(), s.suggestions().size()))
                .onErrorResume(e -> {
                    log.error("Copilot error — sessionId={}: {}", sessionId, e.getMessage());
                    return Mono.empty();
                });
    }

    private Mono<CopilotSuggestion> parseOutputText(String sessionId, String text) {
        var markerIdx = text.indexOf(SUGGESTIONS_MARKER);
        if (markerIdx < 0) {
            return Mono.just(CopilotSuggestion.create(sessionId, text.strip(), List.of(), List.of()));
        }
        var translation = text.substring(0, markerIdx).strip();
        var suggestionsBlock = text.substring(markerIdx + SUGGESTIONS_MARKER.length());
        var suggestions = new ArrayList<String>();
        var suggestionTranslations = new ArrayList<String>();
        String pendingEn = null;
        for (var line : suggestionsBlock.split("\n")) {
            var trimmed = line.strip();
            if (trimmed.matches("^\\d+\\..*")) {
                if (pendingEn != null) {
                    suggestions.add(pendingEn);
                    suggestionTranslations.add("");
                }
                pendingEn = trimmed.replaceFirst("^\\d+\\.\\s*[^:]+:\\s*", "").strip();
            } else if (trimmed.startsWith("PT:") && pendingEn != null) {
                suggestions.add(pendingEn);
                suggestionTranslations.add(trimmed.replaceFirst("^PT:\\s*", "").strip());
                pendingEn = null;
            }
        }
        if (pendingEn != null) {
            suggestions.add(pendingEn);
            suggestionTranslations.add("");
        }
        return Mono.just(CopilotSuggestion.create(sessionId, translation, suggestions, suggestionTranslations));
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class ChatResponse {
        public List<Choice> choices;

        public String contentSafely() {
            if (choices == null || choices.isEmpty()) return "";
            var msg = choices.get(0).message;
            return (msg != null && msg.content != null) ? msg.content.strip() : "";
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class Choice {
        public Message message;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class Message {
        public String content;
    }
}
