export type SessionId = string;

export type SessionStatus = "ACTIVE" | "PAUSED" | "ENDED";

export type Language = "en-US" | "pt-BR";

export interface SessionConfig {
  readonly sourceLanguage: Language;
  readonly targetLanguage: Language;
  readonly enableTts: boolean;
  readonly enableSuggestions: boolean;
  readonly meetingContext?: string;
}

export interface Session {
  readonly id: SessionId;
  readonly status: SessionStatus;
  readonly config: SessionConfig;
  readonly startedAt: string;
  readonly endedAt?: string;
}

export interface CreateSessionRequest {
  readonly config: SessionConfig;
}

export interface CreateSessionResponse {
  readonly session: Session;
}

export interface StopSessionResponse {
  readonly session: Session;
}
