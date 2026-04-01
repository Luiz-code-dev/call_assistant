package com.callassistant.domain.port.outbound;

import com.callassistant.domain.model.CopilotSuggestion;
import com.callassistant.domain.model.SessionConfig;
import reactor.core.publisher.Mono;

public interface CopilotPort {
    Mono<CopilotSuggestion> suggest(String sessionId, String transcriptText, SessionConfig config);
}
