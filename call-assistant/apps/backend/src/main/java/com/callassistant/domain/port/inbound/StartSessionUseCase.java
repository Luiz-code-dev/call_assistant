package com.callassistant.domain.port.inbound;

import com.callassistant.application.dto.CreateSessionRequest;
import com.callassistant.application.dto.SessionResponse;
import reactor.core.publisher.Mono;

public interface StartSessionUseCase {
    Mono<SessionResponse> execute(CreateSessionRequest request);
}
