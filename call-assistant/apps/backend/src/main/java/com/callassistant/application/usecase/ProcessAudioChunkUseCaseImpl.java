package com.callassistant.application.usecase;

import com.callassistant.domain.model.AudioChunk;
import com.callassistant.domain.model.Session;
import com.callassistant.domain.model.Transcript;
import com.callassistant.domain.model.Translation;
import com.callassistant.domain.port.inbound.ProcessAudioChunkUseCase;
import com.callassistant.domain.port.outbound.CopilotPort;
import com.callassistant.domain.port.outbound.SessionEventPublisher;
import com.callassistant.domain.port.outbound.SessionRepository;
import com.callassistant.domain.port.outbound.SpeechToTextPort;
import com.callassistant.domain.port.outbound.TranscriptRepository;
import com.callassistant.domain.port.outbound.TranslationPort;
import com.callassistant.domain.port.outbound.TranslationRepository;
import com.callassistant.domain.port.outbound.WalletPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Sinks;

import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProcessAudioChunkUseCaseImpl implements ProcessAudioChunkUseCase {

    private final SessionRepository sessionRepository;
    private final TranscriptRepository transcriptRepository;
    private final TranslationRepository translationRepository;
    private final SpeechToTextPort speechToTextPort;
    private final TranslationPort translationPort;
    private final Optional<CopilotPort> copilotPort;
    private final SessionEventPublisher eventPublisher;
    private final Optional<WalletPort> walletPort;

    private static final long COPILOT_THROTTLE_MS  = 5_000;
    private static final long PARAGRAPH_BREAK_MS   = 5_000;

    private final ConcurrentHashMap<String, Sinks.Many<AudioChunk>> audioSinks       = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, AtomicLong>             lastCopilotCall  = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, AtomicLong>             lastTranscriptTs = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, StringBuilder>          paragraphBuffers = new ConcurrentHashMap<>();

    @Override
    public Mono<Void> execute(String sessionId, AudioChunk chunk) {
        return sessionRepository.findById(sessionId)
                .switchIfEmpty(Mono.error(new SessionNotFoundException(sessionId)))
                .flatMap(session -> {
                    if (!session.isActive()) {
                        return Mono.error(new IllegalStateException(
                                "Session is not ACTIVE: " + session.getStatus()));
                    }
                    getOrCreateSink(sessionId).tryEmitNext(chunk);
                    return Mono.empty();
                });
    }

    public Mono<Void> startAudioPipeline(String sessionId) {
        return sessionRepository.findById(sessionId)
                .switchIfEmpty(Mono.error(new SessionNotFoundException(sessionId)))
                .doOnNext(session -> {
                    var sink = getOrCreateSink(sessionId);
                    var config = session.getConfig();
                    var src = config.sourceLanguage();
                    var tgt = config.targetLanguage();
                    var ctx = config.meetingContext();

                    speechToTextPort.transcribe(sessionId, sink.asFlux(), src)
                            .flatMap(transcript -> transcriptRepository.save(transcript)
                                    .flatMap(saved -> {
                                        eventPublisher.emitTranscript(sessionId, saved);
                                        return translateAndSuggest(sessionId, saved, session, ctx);
                                    }))
                            .doOnError(e -> log.error("Audio pipeline error — sessionId={}", sessionId, e))
                            .subscribe(
                                    null,
                                    err -> log.error("Audio pipeline error — sessionId={}", sessionId, err)
                            );
                })
                .then();
    }

    public Flux<AudioChunk> getAudioFlux(String sessionId) {
        return getOrCreateSink(sessionId).asFlux();
    }

    public void closeSink(String sessionId) {
        var sink = audioSinks.remove(sessionId);
        if (sink != null) {
            sink.tryEmitComplete();
        }
        lastCopilotCall.remove(sessionId);
        lastTranscriptTs.remove(sessionId);
        paragraphBuffers.remove(sessionId);
    }

    private String addToParagraphBuffer(String sessionId, String text) {
        var now = System.currentTimeMillis();
        var lastTs = lastTranscriptTs.computeIfAbsent(sessionId, id -> new AtomicLong(0));
        var gap = now - lastTs.get();
        lastTs.set(now);

        var buf = paragraphBuffers.computeIfAbsent(sessionId, id -> new StringBuilder());
        if (gap > PARAGRAPH_BREAK_MS && !buf.isEmpty()) {
            buf.setLength(0);
            lastCopilotCall.computeIfAbsent(sessionId, id -> new AtomicLong(0)).set(0);
            log.debug("Paragraph break detected ({}ms) — resetting buffer and throttle, sessionId={}", gap, sessionId);
        }
        if (!buf.isEmpty()) buf.append(" ");
        buf.append(text);
        return buf.toString();
    }

    private boolean shouldCallCopilot(String sessionId) {
        var now = System.currentTimeMillis();
        var last = lastCopilotCall.computeIfAbsent(sessionId, id -> new AtomicLong(0));
        if (now - last.get() >= COPILOT_THROTTLE_MS) {
            last.set(now);
            return true;
        }
        return false;
    }

    private Mono<Void> translateAndSuggest(String sessionId, Transcript saved, Session session, String ctx) {
        var config = session.getConfig();
        var src = config.sourceLanguage();
        var tgt = config.targetLanguage();
        var context = addToParagraphBuffer(sessionId, saved.getText());

        if (!shouldCallCopilot(sessionId)) {
            return fallbackTranslate(sessionId, saved, src, tgt, ctx);
        }

        return copilotPort
                .map(cp -> cp.suggest(sessionId, context, config)
                        .flatMap(suggestion -> {
                            eventPublisher.emitSuggestion(sessionId, suggestion);
                            walletPort.ifPresent(wp ->
                                    wp.deductCredits(session.getUserId(), 1, "usage",
                                            "Copilot response — session " + sessionId)
                                            .subscribe());
                            var translation = Translation.create(
                                    saved.getSessionId(), saved.getId(),
                                    saved.getText(), suggestion.contextSummary(),
                                    src, tgt);
                            return translationRepository.save(translation)
                                    .doOnNext(t -> eventPublisher.emitTranslation(sessionId, t))
                                    .then();
                        })
                        .switchIfEmpty(fallbackTranslate(sessionId, saved, src, tgt, ctx))
                        .onErrorResume(e -> {
                            log.warn("Copilot failed, falling back to translation — {}", e.getMessage());
                            return fallbackTranslate(sessionId, saved, src, tgt, ctx);
                        }))
                .orElseGet(() -> fallbackTranslate(sessionId, saved, src, tgt, ctx));
    }

    private Mono<Void> fallbackTranslate(String sessionId, Transcript saved,
                                         com.callassistant.domain.model.Language src,
                                         com.callassistant.domain.model.Language tgt,
                                         String ctx) {
        return translationPort.translate(saved.getText(), src, tgt, ctx)
                .flatMap(translatedText -> {
                    var translation = Translation.create(
                            saved.getSessionId(), saved.getId(),
                            saved.getText(), translatedText, src, tgt);
                    return translationRepository.save(translation)
                            .doOnNext(t -> eventPublisher.emitTranslation(sessionId, t))
                            .then();
                });
    }

    private Sinks.Many<AudioChunk> getOrCreateSink(String sessionId) {
        return audioSinks.computeIfAbsent(sessionId,
                id -> Sinks.many().multicast().onBackpressureBuffer(256));
    }
}
