package com.callassistant.infrastructure.adapter.outbound.ai.tts;

import com.callassistant.domain.model.Language;
import com.callassistant.domain.port.outbound.TextToSpeechPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "callassistant.ai.tts.provider", havingValue = "elevenlabs")
public class ElevenLabsTtsAdapter implements TextToSpeechPort {

    private final WebClient webClient;

    @Override
    public Mono<byte[]> synthesize(String text, Language language, String voiceId) {
        log.debug("TTS synthesize — lang={}, voice={}, text='{}'", language.getCode(), voiceId, text);
        return Mono.defer(() -> {
            // TODO: wire ElevenLabs API — POST https://api.elevenlabs.io/v1/text-to-speech/{voiceId}
            log.info("ElevenLabs TTS placeholder — wire API key from config");
            return Mono.just(new byte[0]);
        });
    }
}
