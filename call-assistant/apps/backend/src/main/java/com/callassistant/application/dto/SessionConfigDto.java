package com.callassistant.application.dto;

import jakarta.validation.constraints.NotNull;

public record SessionConfigDto(
        @NotNull String sourceLanguage,
        @NotNull String targetLanguage,
        boolean enableTts,
        boolean enableSuggestions,
        String meetingContext
) {}
