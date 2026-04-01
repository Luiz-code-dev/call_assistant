package com.callassistant.domain.port.inbound;

import com.callassistant.domain.model.AudioChunk;
import reactor.core.publisher.Mono;

public interface ProcessAudioChunkUseCase {
    Mono<Void> execute(String sessionId, AudioChunk chunk);
}
