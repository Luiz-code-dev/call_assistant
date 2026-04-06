package com.callassistant.domain.port.outbound;

import com.callassistant.domain.event.DomainEvent;
import com.callassistant.domain.model.CopilotSuggestion;
import com.callassistant.domain.model.Transcript;
import com.callassistant.domain.model.Translation;
import reactor.core.publisher.Mono;

public interface SessionEventPublisher {
    Mono<Void> publish(DomainEvent event);
    void emitTranscript(String sessionId, Transcript transcript);
    void emitTranslation(String sessionId, Translation translation);
    void emitSuggestion(String sessionId, CopilotSuggestion suggestion);
    void emitCreditsExhausted(String sessionId);
}
