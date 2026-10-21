package com.callassistant.domain.model;

import com.callassistant.domain.event.SessionEndedEvent;
import com.callassistant.domain.event.SessionStartedEvent;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("Session domain model")
class SessionTest {

    private static SessionConfig defaultConfig() {
        return new SessionConfig(Language.EN_US, Language.PT_BR, false, false, null);
    }

    @Test
    @DisplayName("create should produce ACTIVE session with SessionStartedEvent")
    void createShouldProduceActiveSession() {
        var session = Session.create(defaultConfig(), null);

        assertThat(session.getStatus()).isEqualTo(SessionStatus.ACTIVE);
        assertThat(session.getId()).isNotBlank();
        assertThat(session.getStartedAt()).isNotNull();
        assertThat(session.getEndedAt()).isNull();

        var events = session.pullDomainEvents();
        assertThat(events).hasSize(1);
        assertThat(events.getFirst()).isInstanceOf(SessionStartedEvent.class);
    }

    @Test
    @DisplayName("end should set status to ENDED and produce SessionEndedEvent")
    void endShouldSetStatusEnded() {
        var session = Session.create(defaultConfig(), null);
        session.pullDomainEvents();

        session.end();

        assertThat(session.getStatus()).isEqualTo(SessionStatus.ENDED);
        assertThat(session.getEndedAt()).isNotNull();

        var events = session.pullDomainEvents();
        assertThat(events).hasSize(1);
        assertThat(events.getFirst()).isInstanceOf(SessionEndedEvent.class);
    }

    @Test
    @DisplayName("end on already ENDED session should throw")
    void endOnEndedShouldThrow() {
        var session = Session.create(defaultConfig(), null);
        session.end();

        assertThatThrownBy(session::end)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("already ENDED");
    }

    @Test
    @DisplayName("pause then resume should restore ACTIVE status")
    void pauseAndResumeShouldWork() {
        var session = Session.create(defaultConfig(), null);

        session.pause();
        assertThat(session.getStatus()).isEqualTo(SessionStatus.PAUSED);

        session.resume();
        assertThat(session.getStatus()).isEqualTo(SessionStatus.ACTIVE);
    }

    @Test
    @DisplayName("pullDomainEvents should clear internal list")
    void pullDomainEventsShouldClear() {
        var session = Session.create(defaultConfig(), null);

        assertThat(session.pullDomainEvents()).hasSize(1);
        assertThat(session.pullDomainEvents()).isEmpty();
    }

    @Test
    @DisplayName("SessionConfig should reject same source and target language")
    void configShouldRejectSameLanguages() {
        assertThatThrownBy(() -> new SessionConfig(Language.EN_US, Language.EN_US, false, false, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("must differ");
    }
}
