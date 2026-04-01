package com.callassistant.infrastructure.adapter.outbound.ai.translation;

import com.callassistant.domain.model.Language;
import com.callassistant.domain.port.outbound.TranslationPort;
import com.callassistant.infrastructure.config.OpenAiProperties;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.List;

@Slf4j
@Component
@ConditionalOnProperty(name = "callassistant.ai.translation.provider", havingValue = "openai")
public class OpenAiTranslationAdapter implements TranslationPort {

    private static final String BASE_SYSTEM_PROMPT = """
            Você é um assistente de tradução simultânea para reuniões de negócios.
            Traduza fielmente e de forma literal. Mantenha termos técnicos no original quando necessário.
            Não interprete, não resuma e não adicione conteúdo.
            Retorne APENAS a tradução, sem explicações, sem aspas e sem prefixos.
            """;

    private final WebClient openAiWebClient;
    private final OpenAiProperties openAiProperties;

    public OpenAiTranslationAdapter(
            @Qualifier("openAiWebClient") WebClient openAiWebClient,
            OpenAiProperties openAiProperties) {
        this.openAiWebClient = openAiWebClient;
        this.openAiProperties = openAiProperties;
    }

    @Override
    public Mono<String> translate(String text, Language sourceLanguage, Language targetLanguage, String meetingContext) {
        if (text == null || text.isBlank()) {
            return Mono.empty();
        }

        var systemPrompt = (meetingContext != null && !meetingContext.isBlank())
                ? BASE_SYSTEM_PROMPT + "\nContexto da reunião: " + meetingContext
                : BASE_SYSTEM_PROMPT;

        var userPrompt = "Translate from %s to %s:\n%s"
                .formatted(sourceLanguage.getCode(), targetLanguage.getCode(), text);

        var request = new ChatRequest(
                openAiProperties.getTranslationModel(),
                List.of(
                        new Message("system", systemPrompt),
                        new Message("user", userPrompt)
                )
        );

        log.debug("Translating {} → {}: '{}'", sourceLanguage.getCode(), targetLanguage.getCode(), text);

        return openAiWebClient.post()
                .uri("/chat/completions")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .retrieve()
                .bodyToMono(ChatResponse.class)
                .mapNotNull(r -> r.choices() != null && !r.choices().isEmpty()
                        ? r.choices().get(0).message().content().trim()
                        : null)
                .filter(t -> !t.isBlank())
                .doOnNext(t -> log.info("Translated — {} → {}: '{}'",
                        sourceLanguage.getCode(), targetLanguage.getCode(), t))
                .onErrorResume(e -> {
                    log.error("GPT translation error — {} → {}", sourceLanguage.getCode(), targetLanguage.getCode(), e);
                    return Mono.empty();
                });
    }

    private record Message(String role, String content) {}

    private record ChatRequest(String model, List<Message> messages) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record ChatResponse(List<Choice> choices) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record Choice(Message message) {}
}
