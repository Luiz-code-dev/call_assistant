CREATE TABLE IF NOT EXISTS sessions (
    id               VARCHAR(36)  PRIMARY KEY,
    status           VARCHAR(20)  NOT NULL,
    source_language  VARCHAR(10)  NOT NULL,
    target_language  VARCHAR(10)  NOT NULL,
    enable_tts       BOOLEAN      NOT NULL DEFAULT false,
    enable_suggestions BOOLEAN    NOT NULL DEFAULT false,
    started_at       TIMESTAMPTZ  NOT NULL,
    ended_at         TIMESTAMPTZ
);

CREATE INDEX idx_sessions_status ON sessions (status);
