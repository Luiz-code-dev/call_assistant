package com.callassistant.infrastructure.adapter.outbound.persistence.repository;

import com.callassistant.infrastructure.adapter.outbound.persistence.entity.TranslationEntity;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface TranslationR2dbcRepository extends ReactiveCrudRepository<TranslationEntity, String> {
    Flux<TranslationEntity> findBySessionId(String sessionId);
    Mono<TranslationEntity> findByTranscriptId(String transcriptId);
}
