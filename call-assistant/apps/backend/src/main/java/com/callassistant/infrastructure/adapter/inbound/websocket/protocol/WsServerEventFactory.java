package com.callassistant.infrastructure.adapter.inbound.websocket.protocol;

import com.callassistant.domain.event.DomainEvent;
import com.callassistant.domain.event.SessionEndedEvent;
import com.callassistant.domain.event.SessionPausedEvent;
import com.callassistant.domain.event.SessionResumedEvent;
import com.callassistant.domain.event.SessionStartedEvent;
import com.callassistant.domain.model.CopilotSuggestion;
import com.callassistant.domain.model.Transcript;
import com.callassistant.domain.model.Translation;
import com.callassistant.domain.port.outbound.SessionEventPublisher;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Sinks;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
public class WsServerEventFactory implements SessionEventPublisher {

    private final ConcurrentHashMap<String, Sinks.Many<Object>> sinks = new ConcurrentHashMap<>();

    @Override
    public Mono<Void> publish(DomainEvent event) {
        var sink = sinks.get(event.sessionId());
        if (sink != null) {
            var payload = buildPayload(event);
            sink.tryEmitNext(payload);
        }
        return Mono.empty();
    }

    public Flux<Object> streamFor(String sessionId) {
        var sink = sinks.computeIfAbsent(sessionId,
                id -> Sinks.many().multicast().onBackpressureBuffer(128));
        return sink.asFlux()
                .doFinally(signal -> sinks.remove(sessionId));
    }

    @Override
    public void emitTranscript(String sessionId, Transcript transcript) {
        var sink = sinks.get(sessionId);
        if (sink == null) return;
        var type = transcript.isFinal() ? "TRANSCRIPT_FINAL" : "TRANSCRIPT_PARTIAL";
        sink.tryEmitNext(Map.of(
                "type", type,
                "sessionId", sessionId,
                "ts", Instant.now().toEpochMilli(),
                "payload", Map.of("transcript", buildTranscriptMap(transcript))
        ));
    }

    @Override
    public void emitTranslation(String sessionId, Translation translation) {
        var sink = sinks.get(sessionId);
        if (sink == null) return;
        sink.tryEmitNext(Map.of(
                "type", "TRANSLATION_READY",
                "sessionId", sessionId,
                "ts", Instant.now().toEpochMilli(),
                "payload", Map.of("translation", buildTranslationMap(translation))
        ));
    }

    @Override
    public void emitSuggestion(String sessionId, CopilotSuggestion suggestion) {
        var sink = sinks.get(sessionId);
        if (sink == null) return;
        sink.tryEmitNext(Map.of(
                "type", "SUGGESTION_READY",
                "sessionId", sessionId,
                "ts", Instant.now().toEpochMilli(),
                "payload", Map.of("suggestion", Map.of(
                        "id", suggestion.id(),
                        "sessionId", suggestion.sessionId(),
                        "contextSummary", suggestion.contextSummary(),
                        "suggestions", suggestion.suggestions(),
                        "suggestionTranslations", suggestion.suggestionTranslations(),
                        "createdAt", suggestion.createdAt().toString()
                ))
        ));
    }

    private Map<String, Object> buildTranscriptMap(Transcript t) {
        var map = new LinkedHashMap<String, Object>();
        map.put("id", t.getId());
        map.put("sessionId", t.getSessionId());
        map.put("text", t.getText());
        map.put("speaker", t.getSpeaker().name());
        map.put("language", t.getLanguage().getCode());
        map.put("confidence", t.getConfidence());
        map.put("isFinal", t.isFinal());
        map.put("startMs", t.getStartMs());
        if (t.getEndMs() != null) map.put("endMs", t.getEndMs());
        map.put("createdAt", t.getCreatedAt().toString());
        return map;
    }

    private Map<String, Object> buildTranslationMap(Translation t) {
        return Map.of(
                "id", t.getId(),
                "sessionId", t.getSessionId(),
                "transcriptId", t.getTranscriptId(),
                "sourceText", t.getSourceText(),
                "targetText", t.getTargetText(),
                "sourceLanguage", t.getSourceLanguage().getCode(),
                "targetLanguage", t.getTargetLanguage().getCode(),
                "createdAt", t.getCreatedAt().toString()
        );
    }

    private Object buildPayload(DomainEvent event) {
        var status = switch (event) {
            case SessionStartedEvent e -> "ACTIVE";
            case SessionEndedEvent e -> "ENDED";
            case SessionPausedEvent e -> "PAUSED";
            case SessionResumedEvent e -> "ACTIVE";
            default -> "UNKNOWN";
        };
        return Map.of(
                "type", "SESSION_STATUS_CHANGED",
                "sessionId", event.sessionId(),
                "ts", event.occurredAt().toEpochMilli(),
                "payload", Map.of("status", status)
        );
    }
}
