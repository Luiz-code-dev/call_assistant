CREATE TABLE IF NOT EXISTS translations (
    id               VARCHAR(36)  PRIMARY KEY,
    session_id       VARCHAR(36)  NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    transcript_id    VARCHAR(36)  NOT NULL REFERENCES transcripts(id) ON DELETE CASCADE,
    source_text      TEXT         NOT NULL,
    target_text      TEXT         NOT NULL,
    source_language  VARCHAR(10)  NOT NULL,
    target_language  VARCHAR(10)  NOT NULL,
    created_at       TIMESTAMPTZ  NOT NULL
);

CREATE INDEX idx_translations_session_id    ON translations (session_id);
CREATE INDEX idx_translations_transcript_id ON translations (transcript_id);
