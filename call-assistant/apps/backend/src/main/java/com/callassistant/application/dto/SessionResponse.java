package com.callassistant.application.dto;

import java.time.Instant;

public record SessionResponse(
        String id,
        String status,
        SessionConfigDto config,
        Instant startedAt,
        Instant endedAt
) {}
