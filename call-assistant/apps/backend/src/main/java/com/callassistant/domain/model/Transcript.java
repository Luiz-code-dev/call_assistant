package com.callassistant.domain.model;

import java.time.Instant;
import java.util.UUID;

public class Transcript {

    private final String id;
    private final String sessionId;
    private String text;
    private final Speaker speaker;
    private final Language language;
    private double confidence;
    private boolean isFinal;
    private final long startMs;
    private Long endMs;
    private final Instant createdAt;

    private Transcript(String id, String sessionId, String text, Speaker speaker,
                       Language language, double confidence, boolean isFinal,
                       long startMs, Long endMs, Instant createdAt) {
        this.id = id;
        this.sessionId = sessionId;
        this.text = text;
        this.speaker = speaker;
        this.language = language;
        this.confidence = confidence;
        this.isFinal = isFinal;
        this.startMs = startMs;
        this.endMs = endMs;
        this.createdAt = createdAt;
    }

    public static Transcript createPartial(String sessionId, String text, Speaker speaker,
                                           Language language, double confidence, long startMs) {
        return new Transcript(
                UUID.randomUUID().toString(),
                sessionId, text, speaker, language, confidence,
                false, startMs, null, Instant.now()
        );
    }

    public static Transcript reconstitute(String id, String sessionId, String text, Speaker speaker,
                                          Language language, double confidence, boolean isFinal,
                                          long startMs, Long endMs, Instant createdAt) {
        return new Transcript(id, sessionId, text, speaker, language, confidence,
                isFinal, startMs, endMs, createdAt);
    }

    public void finalize(String finalText, double finalConfidence, long endMs) {
        this.text = finalText;
        this.confidence = finalConfidence;
        this.isFinal = true;
        this.endMs = endMs;
    }

    public String getId() { return id; }
    public String getSessionId() { return sessionId; }
    public String getText() { return text; }
    public Speaker getSpeaker() { return speaker; }
    public Language getLanguage() { return language; }
    public double getConfidence() { return confidence; }
    public boolean isFinal() { return isFinal; }
    public long getStartMs() { return startMs; }
    public Long getEndMs() { return endMs; }
    public Instant getCreatedAt() { return createdAt; }
}
