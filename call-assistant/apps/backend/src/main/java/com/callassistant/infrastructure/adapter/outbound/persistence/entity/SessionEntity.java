package com.callassistant.infrastructure.adapter.outbound.persistence.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

import java.time.Instant;

@Table("sessions")
public record SessionEntity(
        @Id String id,
        String status,
        String sourceLanguage,
        String targetLanguage,
        boolean enableTts,
        boolean enableSuggestions,
        String meetingContext,
        Instant startedAt,
        Instant endedAt
) {}
