package com.callassistant.infrastructure.adapter.inbound.websocket;

import com.callassistant.application.dto.AudioChunkCommand;
import com.callassistant.application.usecase.ProcessAudioChunkUseCaseImpl;
import com.callassistant.application.usecase.SessionNotFoundException;
import com.callassistant.domain.model.AudioChunk;
import com.callassistant.domain.port.inbound.StopSessionUseCase;
import com.callassistant.infrastructure.adapter.inbound.websocket.protocol.WsCommandType;
import com.callassistant.infrastructure.adapter.inbound.websocket.protocol.WsServerEventFactory;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.socket.WebSocketHandler;
import org.springframework.web.reactive.socket.WebSocketSession;
import reactor.core.publisher.Mono;

import java.util.Base64;

@Slf4j
@Component
@RequiredArgsConstructor
public class AudioWebSocketHandler implements WebSocketHandler {

    private final ProcessAudioChunkUseCaseImpl processAudioChunkUseCase;
    private final StopSessionUseCase stopSessionUseCase;
    private final WsServerEventFactory eventFactory;
    private final ObjectMapper objectMapper;

    @Override
    public Mono<Void> handle(WebSocketSession wsSession) {
        var sessionId = extractSessionId(wsSession);
        log.info("WebSocket connected — sessionId={}, wsId={}", sessionId, wsSession.getId());

        var inbound = wsSession.receive()
                .flatMap(message -> handleMessage(sessionId, message.getPayloadAsText()))
                .doOnError(e -> log.error("WS inbound error — session={}", sessionId, e))
                .onErrorResume(ex -> Mono.empty());

        var outbound = wsSession.send(
                eventFactory.streamFor(sessionId)
                        .map(event -> wsSession.textMessage(serializeQuietly(event)))
                        .doOnError(e -> log.error("WS outbound error — session={}", sessionId, e))
                        .onErrorResume(ex -> Mono.empty())
        );

        return processAudioChunkUseCase.startAudioPipeline(sessionId)
                .then(Mono.zip(inbound.then(), outbound))
                .doFinally(signal -> {
                    log.info("WebSocket closed — sessionId={}, signal={}", sessionId, signal);
                    processAudioChunkUseCase.closeSink(sessionId);
                })
                .then();
    }

    private Mono<Void> handleMessage(String sessionId, String payload) {
        try {
            var node = objectMapper.readTree(payload);
            var type = WsCommandType.valueOf(node.get("type").asText());

            return switch (type) {
                case AUDIO_CHUNK -> {
                    var cmd = objectMapper.treeToValue(node, AudioChunkCommand.class);
                    var raw = Base64.getDecoder().decode(cmd.data());
                    log.info("AUDIO_CHUNK received — session={}, bytes={}", sessionId, raw.length);
                    var chunk = new AudioChunk(raw, cmd.ts(), 16000, 1);
                    yield processAudioChunkUseCase.execute(sessionId, chunk);
                }
                case CONTROL -> {
                    var action = node.get("action").asText();
                    yield switch (action) {
                        case "STOP" -> stopSessionUseCase.execute(sessionId).then();
                        default -> Mono.empty();
                    };
                }
            };
        } catch (Exception e) {
            log.warn("Failed to parse WS message for session={}: {}", sessionId, e.getMessage());
            return Mono.empty();
        }
    }

    private String extractSessionId(WebSocketSession session) {
        var path = session.getHandshakeInfo().getUri().getPath();
        var parts = path.split("/");
        return parts[parts.length - 2];
    }

    private String serializeQuietly(Object event) {
        try {
            return objectMapper.writeValueAsString(event);
        } catch (Exception e) {
            return "{\"type\":\"ERROR\",\"payload\":{\"message\":\"serialization error\"}}";
        }
    }
}
