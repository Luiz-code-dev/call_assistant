package com.callassistant.infrastructure.persistence;

import com.callassistant.domain.model.Language;
import com.callassistant.domain.model.Session;
import com.callassistant.domain.model.SessionConfig;
import com.callassistant.domain.model.Speaker;
import com.callassistant.domain.model.Transcript;
import com.callassistant.domain.port.outbound.SessionRepository;
import com.callassistant.domain.port.outbound.TranscriptRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("TranscriptRepositoryAdapter — Integration")
class TranscriptRepositoryAdapterIT extends AbstractIntegrationTest {

    @Autowired
    private SessionRepository sessionRepository;

    @Autowired
    private TranscriptRepository transcriptRepository;

    private String savedSessionId;

    @BeforeEach
    void setUp() {
        var session = Session.create(new SessionConfig(Language.EN_US, Language.PT_BR, false, false, null));
        session.pullDomainEvents();
        savedSessionId = sessionRepository.save(session).map(Session::getId).block();
    }

    @Test
    @DisplayName("save and findBySessionId should return saved transcript")
    void saveAndFindBySessionId() {
        var transcript = Transcript.createPartial(
                savedSessionId, "Hello world", Speaker.LOCAL, Language.EN_US, 0.95, 0L);

        StepVerifier.create(
                transcriptRepository.save(transcript)
                        .thenMany(transcriptRepository.findBySessionId(savedSessionId))
        )
                .assertNext(found -> {
                    assertThat(found.getId()).isEqualTo(transcript.getId());
                    assertThat(found.getText()).isEqualTo("Hello world");
                    assertThat(found.getSpeaker()).isEqualTo(Speaker.LOCAL);
                    assertThat(found.getLanguage()).isEqualTo(Language.EN_US);
                    assertThat(found.getConfidence()).isEqualTo(0.95);
                    assertThat(found.isFinal()).isFalse();
                })
                .verifyComplete();
    }

    @Test
    @DisplayName("findBySessionId on unknown session should return empty flux")
    void findBySessionIdUnknown() {
        StepVerifier.create(transcriptRepository.findBySessionId("non-existent"))
                .verifyComplete();
    }

    @Test
    @DisplayName("save final transcript should persist isFinal=true")
    void saveFinalTranscript() {
        var transcript = Transcript.createPartial(
                savedSessionId, "Final text", Speaker.REMOTE, Language.EN_US, 0.99, 100L);
        transcript.finalize("Final text", 0.99, 500L);

        StepVerifier.create(
                transcriptRepository.save(transcript)
                        .then(Mono.defer(() ->
                                transcriptRepository.findBySessionId(savedSessionId).next()
                        ))
        )
                .assertNext(found -> {
                    assertThat(found.isFinal()).isTrue();
                    assertThat(found.getEndMs()).isEqualTo(500L);
                })
                .verifyComplete();
    }
}
