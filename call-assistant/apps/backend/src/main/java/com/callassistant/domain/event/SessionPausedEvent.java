package com.callassistant.domain.event;

import java.time.Instant;

public record SessionPausedEvent(String sessionId, Instant occurredAt) implements DomainEvent {}
