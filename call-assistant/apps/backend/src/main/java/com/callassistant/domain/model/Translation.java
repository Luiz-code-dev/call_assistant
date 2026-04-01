package com.callassistant.domain.model;

import java.time.Instant;
import java.util.UUID;

public class Translation {

    private final String id;
    private final String sessionId;
    private final String transcriptId;
    private final String sourceText;
    private final String targetText;
    private final Language sourceLanguage;
    private final Language targetLanguage;
    private final Instant createdAt;

    private Translation(String id, String sessionId, String transcriptId,
                        String sourceText, String targetText,
                        Language sourceLanguage, Language targetLanguage,
                        Instant createdAt) {
        this.id = id;
        this.sessionId = sessionId;
        this.transcriptId = transcriptId;
        this.sourceText = sourceText;
        this.targetText = targetText;
        this.sourceLanguage = sourceLanguage;
        this.targetLanguage = targetLanguage;
        this.createdAt = createdAt;
    }

    public static Translation create(String sessionId, String transcriptId,
                                     String sourceText, String targetText,
                                     Language sourceLanguage, Language targetLanguage) {
        return new Translation(
                UUID.randomUUID().toString(),
                sessionId, transcriptId,
                sourceText, targetText,
                sourceLanguage, targetLanguage,
                Instant.now()
        );
    }

    public static Translation reconstitute(String id, String sessionId, String transcriptId,
                                           String sourceText, String targetText,
                                           Language sourceLanguage, Language targetLanguage,
                                           Instant createdAt) {
        return new Translation(id, sessionId, transcriptId, sourceText, targetText,
                sourceLanguage, targetLanguage, createdAt);
    }

    public String getId() { return id; }
    public String getSessionId() { return sessionId; }
    public String getTranscriptId() { return transcriptId; }
    public String getSourceText() { return sourceText; }
    public String getTargetText() { return targetText; }
    public Language getSourceLanguage() { return sourceLanguage; }
    public Language getTargetLanguage() { return targetLanguage; }
    public Instant getCreatedAt() { return createdAt; }
}
