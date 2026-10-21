package com.callassistant.infrastructure.adapter.outbound.ai.copilot;

import com.callassistant.domain.model.CopilotSuggestion;
import com.callassistant.domain.model.SessionConfig;
import com.callassistant.domain.port.outbound.CopilotPort;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

@Slf4j
@Component
@ConditionalOnProperty(name = "callassistant.ai.copilot.provider", havingValue = "python")
public class PythonCopilotAdapter implements CopilotPort {

    private final WebClient webClient;

    public PythonCopilotAdapter(
            @Value("${callassistant.ai.copilot.python-service-url}") String serviceUrl) {
        this.webClient = WebClient.builder()
                .baseUrl(serviceUrl)
                .build();
        log.info("PythonCopilotAdapter initialized — serviceUrl={}", serviceUrl);
    }

    @Override
    public Mono<CopilotSuggestion> suggest(String sessionId, String transcriptText, SessionConfig config) {
        if (transcriptText == null || transcriptText.isBlank()) {
            return Mono.empty();
        }

        var requestBody = Map.of(
                "session_id", sessionId,
                "transcript", transcriptText,
                "meeting_context", config.meetingContext() != null ? config.meetingContext() : "",
                "source_lang", config.sourceLanguage().getCode(),
                "target_lang", config.targetLanguage().getCode()
        );

        log.info("PythonCopilot calling /copilot/suggest — sessionId={}", sessionId);

        return webClient.post()
                .uri("/copilot/suggest")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(requestBody)
                .retrieve()
                .onStatus(
                        status -> status.value() == 204,
                        response -> Mono.empty()
                )
                .onStatus(
                        status -> !status.is2xxSuccessful(),
                        response -> response.bodyToMono(String.class)
                                .doOnNext(body -> log.error("PythonCopilot error {} — body: {}", response.statusCode(), body))
                                .then(Mono.error(new RuntimeException("PythonCopilot error: " + response.statusCode())))
                )
                .bodyToMono(PythonSuggestResponse.class)
                .mapNotNull(r -> CopilotSuggestion.create(
                        r.session_id(),
                        r.translation() != null ? r.translation() : "",
                        r.suggestions() != null ? r.suggestions() : List.of(),
                        r.suggestion_translations() != null ? r.suggestion_translations() : List.of()
                ))
                .doOnNext(s -> log.info("PythonCopilot — sessionId={}, translation='{}', suggestions={}",
                        sessionId, s.contextSummary(), s.suggestions().size()))
                .onErrorResume(e -> {
                    log.error("PythonCopilot error — sessionId={}: {}", sessionId, e.getMessage());
                    return Mono.empty();
                });
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record PythonSuggestResponse(
            String session_id,
            String translation,
            List<String> suggestions,
            List<String> suggestion_translations
    ) {}
}
