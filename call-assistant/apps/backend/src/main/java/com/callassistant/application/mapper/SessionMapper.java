package com.callassistant.application.mapper;

import com.callassistant.application.dto.SessionConfigDto;
import com.callassistant.application.dto.SessionResponse;
import com.callassistant.application.dto.TranscriptResponse;
import com.callassistant.application.dto.TranslationResponse;
import com.callassistant.domain.model.Language;
import com.callassistant.domain.model.Session;
import com.callassistant.domain.model.SessionConfig;
import com.callassistant.domain.model.Transcript;
import com.callassistant.domain.model.Translation;

public final class SessionMapper {

    private SessionMapper() {}

    public static SessionConfig toDomain(SessionConfigDto dto) {
        return new SessionConfig(
                Language.fromCode(dto.sourceLanguage()),
                Language.fromCode(dto.targetLanguage()),
                dto.enableTts(),
                dto.enableSuggestions(),
                dto.meetingContext()
        );
    }

    public static SessionConfigDto toDto(SessionConfig config) {
        return new SessionConfigDto(
                config.sourceLanguage().getCode(),
                config.targetLanguage().getCode(),
                config.enableTts(),
                config.enableSuggestions(),
                config.meetingContext()
        );
    }

    public static SessionResponse toResponse(Session session) {
        return new SessionResponse(
                session.getId(),
                session.getStatus().name(),
                toDto(session.getConfig()),
                session.getStartedAt(),
                session.getEndedAt()
        );
    }

    public static TranscriptResponse toResponse(Transcript transcript) {
        return new TranscriptResponse(
                transcript.getId(),
                transcript.getSessionId(),
                transcript.getText(),
                transcript.getSpeaker().name(),
                transcript.getLanguage().getCode(),
                transcript.getConfidence(),
                transcript.isFinal(),
                transcript.getStartMs(),
                transcript.getEndMs(),
                transcript.getCreatedAt()
        );
    }

    public static TranslationResponse toResponse(Translation translation) {
        return new TranslationResponse(
                translation.getId(),
                translation.getSessionId(),
                translation.getTranscriptId(),
                translation.getSourceText(),
                translation.getTargetText(),
                translation.getSourceLanguage().getCode(),
                translation.getTargetLanguage().getCode(),
                translation.getCreatedAt()
        );
    }
}
