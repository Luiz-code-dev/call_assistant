package com.callassistant.domain.model;

public record SessionConfig(
        Language sourceLanguage,
        Language targetLanguage,
        boolean enableTts,
        boolean enableSuggestions,
        String meetingContext
) {
    public SessionConfig {
        if (sourceLanguage == null) throw new IllegalArgumentException("sourceLanguage must not be null");
        if (targetLanguage == null) throw new IllegalArgumentException("targetLanguage must not be null");
        if (sourceLanguage == targetLanguage) {
            throw new IllegalArgumentException("sourceLanguage and targetLanguage must differ");
        }
    }
}
