package com.callassistant.domain.port.outbound;

import com.callassistant.domain.model.Transcript;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface TranscriptRepository {
    Mono<Transcript> save(Transcript transcript);
    Flux<Transcript> findBySessionId(String sessionId);
    Mono<Transcript> findById(String id);
}
