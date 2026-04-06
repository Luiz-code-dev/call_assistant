package com.callassistant.infrastructure.persistence;

import com.callassistant.domain.model.Language;
import com.callassistant.domain.model.Session;
import com.callassistant.domain.model.SessionConfig;
import com.callassistant.domain.model.SessionStatus;
import com.callassistant.domain.port.outbound.SessionRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import reactor.test.StepVerifier;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("SessionRepositoryAdapter — Integration")
class SessionRepositoryAdapterIT extends AbstractIntegrationTest {

    @Autowired
    private SessionRepository sessionRepository;

    @Test
    @DisplayName("save and findById should round-trip domain model")
    void saveAndFindById() {
        var config = new SessionConfig(Language.EN_US, Language.PT_BR, false, false, null);
        var session = Session.create(config, null);
        session.pullDomainEvents();

        StepVerifier.create(
                sessionRepository.save(session)
                        .flatMap(saved -> sessionRepository.findById(saved.getId()))
        )
                .assertNext(found -> {
                    assertThat(found.getId()).isEqualTo(session.getId());
                    assertThat(found.getStatus()).isEqualTo(SessionStatus.ACTIVE);
                    assertThat(found.getConfig().sourceLanguage()).isEqualTo(Language.EN_US);
                    assertThat(found.getConfig().targetLanguage()).isEqualTo(Language.PT_BR);
                    assertThat(found.getStartedAt()).isNotNull();
                    assertThat(found.getEndedAt()).isNull();
                })
                .verifyComplete();
    }

    @Test
    @DisplayName("existsById should return true after save")
    void existsById() {
        var session = Session.create(new SessionConfig(Language.EN_US, Language.PT_BR, false, false, null), null);
        session.pullDomainEvents();

        StepVerifier.create(
                sessionRepository.save(session)
                        .flatMap(saved -> sessionRepository.existsById(saved.getId()))
        )
                .expectNext(true)
                .verifyComplete();
    }

    @Test
    @DisplayName("existsById should return empty Mono for unknown id")
    void findByIdUnknown() {
        StepVerifier.create(sessionRepository.findById("non-existent-id"))
                .verifyComplete();
    }

    @Test
    @DisplayName("save should persist ENDED session with endedAt set")
    void saveEndedSession() {
        var session = Session.create(new SessionConfig(Language.EN_US, Language.PT_BR, false, false, null), null);
        session.pullDomainEvents();
        session.end();
        session.pullDomainEvents();

        StepVerifier.create(
                sessionRepository.save(session)
                        .flatMap(saved -> sessionRepository.findById(saved.getId()))
        )
                .assertNext(found -> {
                    assertThat(found.getStatus()).isEqualTo(SessionStatus.ENDED);
                    assertThat(found.getEndedAt()).isNotNull();
                })
                .verifyComplete();
    }
}
