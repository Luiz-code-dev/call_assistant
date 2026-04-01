package com.callassistant.domain.event;

import java.time.Instant;

public interface DomainEvent {
    String sessionId();
    Instant occurredAt();
}
