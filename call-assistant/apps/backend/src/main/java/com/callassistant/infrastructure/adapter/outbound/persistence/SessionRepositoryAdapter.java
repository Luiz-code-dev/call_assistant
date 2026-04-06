package com.callassistant.infrastructure.adapter.outbound.persistence;

import com.callassistant.domain.model.Language;
import com.callassistant.domain.model.Session;
import com.callassistant.domain.model.SessionConfig;
import com.callassistant.domain.model.SessionStatus;
import com.callassistant.domain.port.outbound.SessionRepository;
import com.callassistant.infrastructure.adapter.outbound.persistence.entity.SessionEntity;
import com.callassistant.infrastructure.adapter.outbound.persistence.repository.SessionR2dbcRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.r2dbc.core.R2dbcEntityTemplate;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

@Component
@RequiredArgsConstructor
public class SessionRepositoryAdapter implements SessionRepository {

    private final SessionR2dbcRepository r2dbcRepository;
    private final R2dbcEntityTemplate r2dbcEntityTemplate;

    @Override
    public Mono<Session> save(Session session) {
        var entity = toEntity(session);
        return r2dbcEntityTemplate.insert(entity)
                .onErrorResume(DuplicateKeyException.class, e -> r2dbcEntityTemplate.update(entity))
                .map(this::toDomain);
    }

    @Override
    public Mono<Session> findById(String id) {
        return r2dbcRepository.findById(id)
                .map(this::toDomain);
    }

    @Override
    public Mono<Boolean> existsById(String id) {
        return r2dbcRepository.existsById(id);
    }

    private SessionEntity toEntity(Session session) {
        return new SessionEntity(
                session.getId(),
                session.getStatus().name(),
                session.getConfig().sourceLanguage().getCode(),
                session.getConfig().targetLanguage().getCode(),
                session.getConfig().enableTts(),
                session.getConfig().enableSuggestions(),
                session.getConfig().meetingContext(),
                session.getUserId(),
                session.getStartedAt(),
                session.getEndedAt()
        );
    }

    private Session toDomain(SessionEntity entity) {
        var config = new SessionConfig(
                Language.fromCode(entity.sourceLanguage()),
                Language.fromCode(entity.targetLanguage()),
                entity.enableTts(),
                entity.enableSuggestions(),
                entity.meetingContext()
        );
        return Session.reconstitute(
                entity.id(),
                SessionStatus.valueOf(entity.status()),
                config,
                entity.userId(),
                entity.startedAt(),
                entity.endedAt()
        );
    }
}
