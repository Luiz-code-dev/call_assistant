package com.callassistant.infrastructure.adapter.outbound.ai.stt;

import com.callassistant.domain.model.AudioChunk;
import com.callassistant.domain.model.Language;
import com.callassistant.domain.model.Speaker;
import com.callassistant.domain.model.Transcript;
import com.callassistant.domain.port.outbound.SpeechToTextPort;
import com.callassistant.infrastructure.config.OpenAiProperties;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Component
@ConditionalOnProperty(name = "callassistant.ai.stt.provider", havingValue = "whisper", matchIfMissing = true)
public class WhisperSpeechToTextAdapter implements SpeechToTextPort {

    private static final int SAMPLE_RATE = 16_000;
    private static final short CHANNELS = 1;
    private static final short BITS_PER_SAMPLE = 16;

    // Silence trimming: 50ms window, RMS threshold ~1% of full scale
    private static final int    SILENCE_WINDOW_SAMPLES  = 800;
    private static final double SILENCE_RMS_THRESHOLD   = 300.0;
    // Minimum 0.5s of speech after trim to bother calling Whisper
    private static final int    MIN_SPEECH_BYTES        = SAMPLE_RATE * 2 / 2; // 0.5s

    private final WebClient openAiWebClient;
    private final OpenAiProperties openAiProperties;

    public WhisperSpeechToTextAdapter(
            @Qualifier("openAiWebClient") WebClient openAiWebClient,
            OpenAiProperties openAiProperties) {
        this.openAiWebClient = openAiWebClient;
        this.openAiProperties = openAiProperties;
    }

    private static final String TRANSCRIPTION_PROMPT =
            "Java, Spring Boot, microservices, enterprise, framework, API, database, " +
            "technical interview, software developer, Kubernetes, Docker, React, Angular, " +
            "TypeScript, Python, AWS, Azure, backend, frontend, agile, sprint, pull request";

    // Repetition detection: discard chunk if any 3-word sequence repeats more than this many times
    private static final int MAX_NGRAM_REPEATS = 3;

    @Override
    public Flux<Transcript> transcribe(String sessionId, Flux<AudioChunk> audioStream, Language language) {
        log.info("STT stream started — sessionId={}, language={}", sessionId, language.getCode());
        return audioStream
                .bufferTimeout(500, Duration.ofSeconds(3))
                .flatMap(chunks -> callWhisperApi(sessionId, mergeChunks(chunks), language))
                .doOnError(e -> log.error("STT error — sessionId={}", sessionId, e));
    }

    /** Removes trailing silence windows from raw PCM-16 LE mono data. */
    private byte[] trimTrailingSilence(byte[] pcmData) {
        int windowBytes = SILENCE_WINDOW_SAMPLES * 2;
        int lastActive  = 0;
        for (int i = 0; i + windowBytes <= pcmData.length; i += windowBytes) {
            long sumSq = 0;
            for (int j = i; j < i + windowBytes - 1; j += 2) {
                short s = (short) ((pcmData[j + 1] << 8) | (pcmData[j] & 0xFF));
                sumSq += (long) s * s;
            }
            double rms = Math.sqrt((double) sumSq / SILENCE_WINDOW_SAMPLES);
            if (rms > SILENCE_RMS_THRESHOLD) {
                lastActive = i + windowBytes;
            }
        }
        return lastActive == 0 ? new byte[0] : Arrays.copyOf(pcmData, lastActive);
    }

    private Flux<Transcript> callWhisperApi(String sessionId, byte[] pcmData, Language language) {
        var trimmed = trimTrailingSilence(pcmData);
        if (trimmed.length < MIN_SPEECH_BYTES) {
            log.debug("Skipping silent/short buffer ({}B after trim) — sessionId={}", trimmed.length, sessionId);
            return Flux.empty();
        }
        log.debug("Buffer trimmed {}B -> {}B — sessionId={}", pcmData.length, trimmed.length, sessionId);
        return Mono.fromCallable(() -> wrapPcmAsWav(trimmed))
                .flatMap(wav -> {
                    log.debug("Sending {}B WAV to Whisper — sessionId={}", wav.length, sessionId);

                    var body = new MultipartBodyBuilder();
                    body.part("model", openAiProperties.getTranscriptionModel());
                    body.part("language", language.getCode().split("-")[0]);
                    body.part("response_format", "json");
                    body.part("temperature", "0.2");
                    body.part("prompt", TRANSCRIPTION_PROMPT);
                    body.part("file", new NamedByteArrayResource("audio.wav", wav))
                            .contentType(MediaType.parseMediaType("audio/wav"));

                    return openAiWebClient.post()
                            .uri("/audio/transcriptions")
                            .contentType(MediaType.MULTIPART_FORM_DATA)
                            .bodyValue(body.build())
                            .retrieve()
                            .bodyToMono(WhisperResponse.class);
                })
                .filter(r -> r.text() != null && !r.text().isBlank())
                .filter(r -> {
                    if (isHallucinatedRepetition(r.text())) {
                        log.warn("Discarding hallucinated repetition — sessionId={}, text='{}'...",
                                sessionId, r.text().trim().substring(0, Math.min(60, r.text().trim().length())));
                        return false;
                    }
                    return true;
                })
                .map(r -> {
                    var ts = System.currentTimeMillis();
                    log.info("Transcribed — sessionId={}, text={}", sessionId, r.text().trim());
                    return Transcript.reconstitute(
                            UUID.randomUUID().toString(), sessionId,
                            r.text().trim(), Speaker.LOCAL, language,
                            0.95, true, ts, ts, Instant.now());
                })
                .flux()
                .onErrorResume(e -> {
                    log.error("Whisper API error — sessionId={}", sessionId, e);
                    return Flux.empty();
                });
    }

    /**
     * Detects Whisper hallucination loops by checking if any 3-word n-gram
     * repeats more than MAX_NGRAM_REPEATS times in the transcription.
     */
    private static boolean isHallucinatedRepetition(String text) {
        String[] words = text.trim().split("\\s+");
        if (words.length < MAX_NGRAM_REPEATS * 3 + 1) {
            return false;
        }
        Map<String, Integer> counts = new LinkedHashMap<>();
        for (int i = 0; i <= words.length - 3; i++) {
            String gram = words[i] + " " + words[i + 1] + " " + words[i + 2];
            counts.merge(gram, 1, Integer::sum);
        }
        return counts.values().stream().mapToInt(v -> v).max().orElse(0) > MAX_NGRAM_REPEATS;
    }

    private byte[] mergeChunks(List<AudioChunk> chunks) {
        int total = chunks.stream().mapToInt(c -> c.data().length).sum();
        var merged = new byte[total];
        int offset = 0;
        for (var chunk : chunks) {
            System.arraycopy(chunk.data(), 0, merged, offset, chunk.data().length);
            offset += chunk.data().length;
        }
        return merged;
    }

    private byte[] wrapPcmAsWav(byte[] pcmData) throws IOException {
        int byteRate = SAMPLE_RATE * CHANNELS * BITS_PER_SAMPLE / 8;
        short blockAlign = (short) (CHANNELS * BITS_PER_SAMPLE / 8);
        int dataSize = pcmData.length;

        var out = new ByteArrayOutputStream(44 + dataSize);
        out.write(new byte[]{'R', 'I', 'F', 'F'});
        out.write(le32(36 + dataSize));
        out.write(new byte[]{'W', 'A', 'V', 'E'});
        out.write(new byte[]{'f', 'm', 't', ' '});
        out.write(le32(16));
        out.write(le16((short) 1));
        out.write(le16(CHANNELS));
        out.write(le32(SAMPLE_RATE));
        out.write(le32(byteRate));
        out.write(le16(blockAlign));
        out.write(le16(BITS_PER_SAMPLE));
        out.write(new byte[]{'d', 'a', 't', 'a'});
        out.write(le32(dataSize));
        out.write(pcmData);
        return out.toByteArray();
    }

    private static byte[] le32(int v) {
        return ByteBuffer.allocate(4).order(ByteOrder.LITTLE_ENDIAN).putInt(v).array();
    }

    private static byte[] le16(short v) {
        return ByteBuffer.allocate(2).order(ByteOrder.LITTLE_ENDIAN).putShort(v).array();
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record WhisperResponse(String text) {}

    private static final class NamedByteArrayResource extends ByteArrayResource {
        private final String filename;

        private NamedByteArrayResource(String filename, byte[] bytes) {
            super(bytes);
            this.filename = filename;
        }

        @Override
        public String getFilename() {
            return filename;
        }
    }
}
