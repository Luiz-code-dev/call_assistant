package com.callassistant.application.usecase;

import com.callassistant.application.dto.CreateSessionRequest;
import com.callassistant.application.dto.SessionResponse;
import com.callassistant.application.mapper.SessionMapper;
import com.callassistant.domain.model.Session;
import com.callassistant.domain.port.inbound.StartSessionUseCase;
import com.callassistant.domain.port.outbound.SessionEventPublisher;
import com.callassistant.domain.port.outbound.SessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Slf4j
@Service
@RequiredArgsConstructor
public class StartSessionUseCaseImpl implements StartSessionUseCase {

    private final SessionRepository sessionRepository;
    private final SessionEventPublisher eventPublisher;

    @Override
    public Mono<SessionResponse> execute(CreateSessionRequest request) {
        return Mono.fromCallable(() -> {
                    var config = SessionMapper.toDomain(request.config());
                    return Session.create(config, request.userId());
                })
                .flatMap(session -> sessionRepository.save(session)
                        .flatMap(saved -> publishEvents(saved)
                                .thenReturn(SessionMapper.toResponse(saved))))
                .doOnSuccess(r -> log.info("Session created: {}", r.id()))
                .doOnError(e -> log.error("Failed to create session", e));
    }

    private Mono<Void> publishEvents(Session session) {
        return Flux.fromIterable(session.pullDomainEvents())
                .flatMap(event -> eventPublisher.publish(
                        (com.callassistant.domain.event.DomainEvent) event))
                .then();
    }
}
