package com.callassistant.domain.port.outbound;

import com.callassistant.domain.model.Language;
import reactor.core.publisher.Mono;

public interface TranslationPort {
    Mono<String> translate(String text, Language sourceLanguage, Language targetLanguage, String meetingContext);
}
