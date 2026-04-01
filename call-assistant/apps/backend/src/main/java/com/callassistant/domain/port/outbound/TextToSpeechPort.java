package com.callassistant.domain.port.outbound;

import com.callassistant.domain.model.Language;
import reactor.core.publisher.Mono;

public interface TextToSpeechPort {
    Mono<byte[]> synthesize(String text, Language language, String voiceId);
}
