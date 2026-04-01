package com.callassistant.infrastructure.adapter.outbound.persistence.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

import java.time.Instant;

@Table("translations")
public record TranslationEntity(
        @Id String id,
        String sessionId,
        String transcriptId,
        String sourceText,
        String targetText,
        String sourceLanguage,
        String targetLanguage,
        Instant createdAt
) {}
