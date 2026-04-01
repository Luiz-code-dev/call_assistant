package com.callassistant.application.dto;

import java.time.Instant;

public record TranslationResponse(
        String id,
        String sessionId,
        String transcriptId,
        String sourceText,
        String targetText,
        String sourceLanguage,
        String targetLanguage,
        Instant createdAt
) {}
