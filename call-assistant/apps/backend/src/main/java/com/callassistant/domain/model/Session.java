package com.callassistant.domain.model;

import com.callassistant.domain.event.SessionEndedEvent;
import com.callassistant.domain.event.SessionPausedEvent;
import com.callassistant.domain.event.SessionResumedEvent;
import com.callassistant.domain.event.SessionStartedEvent;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

public class Session {

    private final String id;
    private SessionStatus status;
    private final SessionConfig config;
    private final Instant startedAt;
    private Instant endedAt;
    private final List<Object> domainEvents = new ArrayList<>();

    private Session(String id, SessionStatus status, SessionConfig config, Instant startedAt) {
        this.id = id;
        this.status = status;
        this.config = config;
        this.startedAt = startedAt;
    }

    public static Session create(SessionConfig config) {
        var session = new Session(
                UUID.randomUUID().toString(),
                SessionStatus.ACTIVE,
                config,
                Instant.now()
        );
        session.domainEvents.add(new SessionStartedEvent(session.id, Instant.now()));
        return session;
    }

    public static Session reconstitute(String id, SessionStatus status, SessionConfig config,
                                       Instant startedAt, Instant endedAt) {
        var session = new Session(id, status, config, startedAt);
        session.endedAt = endedAt;
        return session;
    }

    public void pause() {
        if (status != SessionStatus.ACTIVE) {
            throw new IllegalStateException("Only ACTIVE sessions can be paused. Current: " + status);
        }
        status = SessionStatus.PAUSED;
        domainEvents.add(new SessionPausedEvent(id, Instant.now()));
    }

    public void resume() {
        if (status != SessionStatus.PAUSED) {
            throw new IllegalStateException("Only PAUSED sessions can be resumed. Current: " + status);
        }
        status = SessionStatus.ACTIVE;
        domainEvents.add(new SessionResumedEvent(id, Instant.now()));
    }

    public void end() {
        if (status == SessionStatus.ENDED) {
            throw new IllegalStateException("Session is already ENDED.");
        }
        status = SessionStatus.ENDED;
        endedAt = Instant.now();
        domainEvents.add(new SessionEndedEvent(id, endedAt));
    }

    public boolean isActive() {
        return status == SessionStatus.ACTIVE;
    }

    public List<Object> pullDomainEvents() {
        var events = Collections.unmodifiableList(new ArrayList<>(domainEvents));
        domainEvents.clear();
        return events;
    }

    public String getId() { return id; }
    public SessionStatus getStatus() { return status; }
    public SessionConfig getConfig() { return config; }
    public Instant getStartedAt() { return startedAt; }
    public Instant getEndedAt() { return endedAt; }
}
