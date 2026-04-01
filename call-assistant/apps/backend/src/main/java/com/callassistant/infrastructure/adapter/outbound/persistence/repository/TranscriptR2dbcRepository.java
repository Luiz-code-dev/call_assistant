package com.callassistant.infrastructure.adapter.outbound.persistence.repository;

import com.callassistant.infrastructure.adapter.outbound.persistence.entity.TranscriptEntity;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;

public interface TranscriptR2dbcRepository extends ReactiveCrudRepository<TranscriptEntity, String> {
    Flux<TranscriptEntity> findBySessionId(String sessionId);
}
