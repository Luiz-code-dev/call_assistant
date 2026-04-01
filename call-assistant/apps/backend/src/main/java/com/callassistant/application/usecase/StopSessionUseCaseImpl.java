package com.callassistant.application.usecase;

import com.callassistant.application.dto.SessionResponse;
import com.callassistant.application.mapper.SessionMapper;
import com.callassistant.domain.port.inbound.StopSessionUseCase;
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
public class StopSessionUseCaseImpl implements StopSessionUseCase {

    private final SessionRepository sessionRepository;
    private final SessionEventPublisher eventPublisher;

    @Override
    public Mono<SessionResponse> execute(String sessionId) {
        return sessionRepository.findById(sessionId)
                .switchIfEmpty(Mono.error(new SessionNotFoundException(sessionId)))
                .flatMap(session -> {
                    session.end();
                    return sessionRepository.save(session)
                            .flatMap(saved -> Flux.fromIterable(saved.pullDomainEvents())
                                    .flatMap(event -> eventPublisher.publish(
                                            (com.callassistant.domain.event.DomainEvent) event))
                                    .then(Mono.just(SessionMapper.toResponse(saved))));
                })
                .doOnSuccess(r -> log.info("Session ended: {}", r.id()))
                .doOnError(e -> log.error("Failed to stop session: {}", sessionId, e));
    }
}
