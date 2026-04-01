package com.callassistant.application.dto;

import java.time.Instant;

public record TranscriptResponse(
        String id,
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
