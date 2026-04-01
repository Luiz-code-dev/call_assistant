package com.callassistant.infrastructure.adapter.outbound.persistence;

import com.callassistant.domain.model.Language;
import com.callassistant.domain.model.Translation;
import com.callassistant.domain.port.outbound.TranslationRepository;
import com.callassistant.infrastructure.adapter.outbound.persistence.entity.TranslationEntity;
import com.callassistant.infrastructure.adapter.outbound.persistence.repository.TranslationR2dbcRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.r2dbc.core.R2dbcEntityTemplate;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Component
@RequiredArgsConstructor
public class TranslationRepositoryAdapter implements TranslationRepository {

    private final TranslationR2dbcRepository r2dbcRepository;
    private final R2dbcEntityTemplate r2dbcEntityTemplate;

    @Override
    public Mono<Translation> save(Translation translation) {
        var entity = toEntity(translation);
        return r2dbcEntityTemplate.insert(entity)
                .onErrorResume(DuplicateKeyException.class, e -> r2dbcEntityTemplate.update(entity))
                .map(this::toDomain);
    }

    @Override
    public Flux<Translation> findBySessionId(String sessionId) {
        return r2dbcRepository.findBySessionId(sessionId).map(this::toDomain);
    }

    @Override
    public Mono<Translation> findByTranscriptId(String transcriptId) {
        return r2dbcRepository.findByTranscriptId(transcriptId).map(this::toDomain);
    }

    private TranslationEntity toEntity(Translation t) {
        return new TranslationEntity(
                t.getId(), t.getSessionId(), t.getTranscriptId(),
                t.getSourceText(), t.getTargetText(),
                t.getSourceLanguage().getCode(), t.getTargetLanguage().getCode(),
                t.getCreatedAt()
        );
    }

    private Translation toDomain(TranslationEntity e) {
        return Translation.reconstitute(
                e.id(), e.sessionId(), e.transcriptId(),
                e.sourceText(), e.targetText(),
                Language.fromCode(e.sourceLanguage()),
                Language.fromCode(e.targetLanguage()),
                e.createdAt()
        );
    }
}
