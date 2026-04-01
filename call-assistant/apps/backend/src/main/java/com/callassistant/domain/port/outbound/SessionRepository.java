package com.callassistant.domain.port.outbound;

import com.callassistant.domain.model.Session;
import reactor.core.publisher.Mono;

public interface SessionRepository {
    Mono<Session> save(Session session);
    Mono<Session> findById(String id);
    Mono<Boolean> existsById(String id);
}
