package com.callassistant.domain.port.outbound;

import com.callassistant.domain.model.AudioChunk;
import com.callassistant.domain.model.Language;
import com.callassistant.domain.model.Transcript;
import reactor.core.publisher.Flux;

public interface SpeechToTextPort {
    Flux<Transcript> transcribe(String sessionId, Flux<AudioChunk> audioStream, Language language);
}
