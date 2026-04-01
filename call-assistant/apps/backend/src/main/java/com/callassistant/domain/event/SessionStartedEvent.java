package com.callassistant.domain.event;

import java.time.Instant;

public record SessionStartedEvent(String sessionId, Instant occurredAt) implements DomainEvent {}
