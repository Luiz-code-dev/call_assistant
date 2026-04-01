package com.callassistant.application.usecase;

import com.callassistant.application.dto.SessionResponse;
import com.callassistant.application.mapper.SessionMapper;
import com.callassistant.domain.port.inbound.GetSessionUseCase;
import com.callassistant.domain.port.outbound.SessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

@Service
@RequiredArgsConstructor
public class GetSessionUseCaseImpl implements GetSessionUseCase {

    private final SessionRepository sessionRepository;

    @Override
    public Mono<SessionResponse> execute(String sessionId) {
        return sessionRepository.findById(sessionId)
                .switchIfEmpty(Mono.error(new SessionNotFoundException(sessionId)))
                .map(SessionMapper::toResponse);
    }
}
