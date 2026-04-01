package com.callassistant.domain.event;

import java.time.Instant;

public record SessionResumedEvent(String sessionId, Instant occurredAt) implements DomainEvent {}
