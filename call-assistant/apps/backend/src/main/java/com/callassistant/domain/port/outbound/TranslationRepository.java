package com.callassistant.domain.port.outbound;

import com.callassistant.domain.model.Translation;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface TranslationRepository {
    Mono<Translation> save(Translation translation);
    Flux<Translation> findBySessionId(String sessionId);
    Mono<Translation> findByTranscriptId(String transcriptId);
}
