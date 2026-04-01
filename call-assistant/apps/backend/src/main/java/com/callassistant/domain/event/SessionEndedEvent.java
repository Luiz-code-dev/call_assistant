package com.callassistant.domain.event;

import java.time.Instant;

public record SessionEndedEvent(String sessionId, Instant occurredAt) implements DomainEvent {}
