package com.callassistant.application.usecase;

import com.callassistant.application.dto.TranscriptResponse;
import com.callassistant.application.mapper.SessionMapper;
import com.callassistant.domain.port.inbound.GetTranscriptsUseCase;
import com.callassistant.domain.port.outbound.TranscriptRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

@Service
@RequiredArgsConstructor
public class GetTranscriptsUseCaseImpl implements GetTranscriptsUseCase {

    private final TranscriptRepository transcriptRepository;

    @Override
    public Flux<TranscriptResponse> execute(String sessionId) {
        return transcriptRepository.findBySessionId(sessionId)
                .map(SessionMapper::toResponse);
    }
}
