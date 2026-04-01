package com.callassistant.infrastructure.adapter.outbound.persistence.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

import java.time.Instant;

@Table("transcripts")
public record TranscriptEntity(
        @Id String id,
        String sessionId,
        String text,
        String speaker,
        String language,
        double confidence,
        boolean isFinal,
        long startMs,
        Long endMs,
        Instant createdAt
) {}
