package com.callassistant.infrastructure.adapter.outbound.persistence;

import com.callassistant.domain.model.Language;
import com.callassistant.domain.model.Speaker;
import com.callassistant.domain.model.Transcript;
import com.callassistant.domain.port.outbound.TranscriptRepository;
import com.callassistant.infrastructure.adapter.outbound.persistence.entity.TranscriptEntity;
import com.callassistant.infrastructure.adapter.outbound.persistence.repository.TranscriptR2dbcRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.r2dbc.core.R2dbcEntityTemplate;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Component
@RequiredArgsConstructor
public class TranscriptRepositoryAdapter implements TranscriptRepository {

    private final TranscriptR2dbcRepository r2dbcRepository;
    private final R2dbcEntityTemplate r2dbcEntityTemplate;

    @Override
    public Mono<Transcript> save(Transcript transcript) {
        var entity = toEntity(transcript);
        return r2dbcEntityTemplate.insert(entity)
                .onErrorResume(DuplicateKeyException.class, e -> r2dbcEntityTemplate.update(entity))
                .map(this::toDomain);
    }

    @Override
    public Flux<Transcript> findBySessionId(String sessionId) {
        return r2dbcRepository.findBySessionId(sessionId).map(this::toDomain);
    }

    @Override
    public Mono<Transcript> findById(String id) {
        return r2dbcRepository.findById(id).map(this::toDomain);
    }

    private TranscriptEntity toEntity(Transcript t) {
        return new TranscriptEntity(
                t.getId(), t.getSessionId(), t.getText(),
                t.getSpeaker().name(), t.getLanguage().getCode(),
                t.getConfidence(), t.isFinal(),
                t.getStartMs(), t.getEndMs(), t.getCreatedAt()
        );
    }

    private Transcript toDomain(TranscriptEntity e) {
        return Transcript.reconstitute(
                e.id(), e.sessionId(), e.text(),
                Speaker.valueOf(e.speaker()),
                Language.fromCode(e.language()),
                e.confidence(), e.isFinal(),
                e.startMs(), e.endMs(), e.createdAt()
        );
    }
}
