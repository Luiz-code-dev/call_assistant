CREATE TABLE IF NOT EXISTS transcripts (
    id          VARCHAR(36)    PRIMARY KEY,
    session_id  VARCHAR(36)    NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    text        TEXT           NOT NULL,
    speaker     VARCHAR(10)    NOT NULL,
    language    VARCHAR(10)    NOT NULL,
    confidence  DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    is_final    BOOLEAN        NOT NULL DEFAULT false,
    start_ms    BIGINT         NOT NULL,
    end_ms      BIGINT,
    created_at  TIMESTAMPTZ    NOT NULL
);

CREATE INDEX idx_transcripts_session_id ON transcripts (session_id);
CREATE INDEX idx_transcripts_created_at ON transcripts (created_at);
