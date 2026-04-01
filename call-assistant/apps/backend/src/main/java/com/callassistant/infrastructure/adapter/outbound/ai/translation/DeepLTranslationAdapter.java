package com.callassistant.infrastructure.adapter.outbound.ai.translation;

import com.callassistant.domain.model.Language;
import com.callassistant.domain.port.outbound.TranslationPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "callassistant.ai.translation.provider", havingValue = "deepl")
public class DeepLTranslationAdapter implements TranslationPort {

    private final WebClient webClient;

    @Override
    public Mono<String> translate(String text, Language sourceLanguage, Language targetLanguage, String meetingContext) {
        log.debug("Translating {} → {}: '{}'", sourceLanguage.getCode(), targetLanguage.getCode(), text);
        return Mono.defer(() -> {
            // TODO: wire DeepL API — POST https://api-free.deepl.com/v2/translate
            log.info("DeepL translation placeholder — wire API key from config");
            return Mono.just("[translated: " + text + "]");
        });
    }
}
