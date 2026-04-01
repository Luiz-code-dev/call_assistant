package com.callassistant.domain.model;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CopilotSuggestion(
        String id,
        String sessionId,
        String contextSummary,
        List<String> suggestions,
        Instant createdAt
) {
    public static CopilotSuggestion create(String sessionId, String contextSummary, List<String> suggestions) {
        return new CopilotSuggestion(
                UUID.randomUUID().toString(),
                sessionId,
                contextSummary,
                List.copyOf(suggestions),
                Instant.now()
        );
    }
}
