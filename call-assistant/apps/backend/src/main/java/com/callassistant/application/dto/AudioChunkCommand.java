package com.callassistant.application.dto;

public record AudioChunkCommand(
        String sessionId,
        String data,
        long ts
) {}
