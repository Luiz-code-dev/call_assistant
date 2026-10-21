package com.callassistant.application.dto;

import jakarta.validation.constraints.NotNull;

public record CreateSessionRequest(
        @NotNull SessionConfigDto config,
        String userId
) {}
