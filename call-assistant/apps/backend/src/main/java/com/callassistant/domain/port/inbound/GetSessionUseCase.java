package com.callassistant.domain.port.inbound;

import com.callassistant.application.dto.SessionResponse;
import reactor.core.publisher.Mono;

public interface GetSessionUseCase {
    Mono<SessionResponse> execute(String sessionId);
}
