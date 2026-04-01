package com.callassistant.infrastructure.adapter.inbound.rest;

import com.callassistant.application.dto.CreateSessionRequest;
import com.callassistant.application.dto.SessionResponse;
import com.callassistant.application.dto.TranscriptResponse;
import com.callassistant.domain.port.inbound.GetSessionUseCase;
import com.callassistant.domain.port.inbound.GetTranscriptsUseCase;
import com.callassistant.domain.port.inbound.StartSessionUseCase;
import com.callassistant.domain.port.inbound.StopSessionUseCase;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/v1/sessions")
@RequiredArgsConstructor
public class SessionController {

    private final StartSessionUseCase startSessionUseCase;
    private final StopSessionUseCase stopSessionUseCase;
    private final GetSessionUseCase getSessionUseCase;
    private final GetTranscriptsUseCase getTranscriptsUseCase;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<SessionResponse> createSession(@Valid @RequestBody CreateSessionRequest request) {
        return startSessionUseCase.execute(request);
    }

    @GetMapping("/{id}")
    public Mono<SessionResponse> getSession(@PathVariable String id) {
        return getSessionUseCase.execute(id);
    }

    @PatchMapping("/{id}/stop")
    public Mono<SessionResponse> stopSession(@PathVariable String id) {
        return stopSessionUseCase.execute(id);
    }

    @GetMapping("/{id}/transcripts")
    public Flux<TranscriptResponse> getTranscripts(@PathVariable String id) {
        return getTranscriptsUseCase.execute(id);
    }
}
