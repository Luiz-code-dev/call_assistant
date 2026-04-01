package com.callassistant.domain.model;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CopilotSuggestion(
        String id,
        String sessionId,
        String contextSummary,
        List<String> suggestions,
        List<String> suggestionTranslations,
        Instant createdAt
) {
    public static CopilotSuggestion create(String sessionId, String contextSummary,
            List<String> suggestions, List<String> suggestionTranslations) {
        return new CopilotSuggestion(
                UUID.randomUUID().toString(),
                sessionId,
                contextSummary,
                List.copyOf(suggestions),
                List.copyOf(suggestionTranslations),
                Instant.now()
        );
    }
}
