package com.callassistant.domain.port.inbound;

import com.callassistant.application.dto.SessionResponse;
import reactor.core.publisher.Mono;

public interface StopSessionUseCase {
    Mono<SessionResponse> execute(String sessionId);
}
