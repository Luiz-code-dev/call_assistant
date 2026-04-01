package com.callassistant.domain.port.inbound;

import com.callassistant.application.dto.TranscriptResponse;
import reactor.core.publisher.Flux;

public interface GetTranscriptsUseCase {
    Flux<TranscriptResponse> execute(String sessionId);
}
