import type { SessionId, SessionStatus } from "./session.js";
import type { Transcript } from "./transcript.js";
import type { Translation } from "./translation.js";
import type { ResponseSuggestion } from "./suggestion.js";

export type WsEventType =
  | "SESSION_STATUS_CHANGED"
  | "TRANSCRIPT_PARTIAL"
  | "TRANSCRIPT_FINAL"
  | "TRANSLATION_READY"
  | "SUGGESTION_READY"
  | "ERROR";

interface BaseWsEvent<T extends WsEventType, P> {
  readonly type: T;
  readonly sessionId: SessionId;
  readonly ts: number;
  readonly payload: P;
}

export type SessionStatusChangedEvent = BaseWsEvent<
  "SESSION_STATUS_CHANGED",
  { status: SessionStatus }
>;

export type TranscriptPartialEvent = BaseWsEvent<
  "TRANSCRIPT_PARTIAL",
  { transcript: Transcript }
>;

export type TranscriptFinalEvent = BaseWsEvent<
  "TRANSCRIPT_FINAL",
  { transcript: Transcript }
>;

export type TranslationReadyEvent = BaseWsEvent<
  "TRANSLATION_READY",
  { translation: Translation }
>;

export type SuggestionReadyEvent = BaseWsEvent<
  "SUGGESTION_READY",
  { suggestion: ResponseSuggestion }
>;

export type WsErrorEvent = BaseWsEvent<
  "ERROR",
  { code: string; message: string }
>;

export type WsServerEvent =
  | SessionStatusChangedEvent
  | TranscriptPartialEvent
  | TranscriptFinalEvent
  | TranslationReadyEvent
  | SuggestionReadyEvent
  | WsErrorEvent;

export type WsClientCommandType = "AUDIO_CHUNK" | "CONTROL";

export type AudioChunkCommand = {
  readonly type: "AUDIO_CHUNK";
  readonly sessionId: SessionId;
  readonly data: string;
  readonly ts: number;
};

export type ControlCommand = {
  readonly type: "CONTROL";
  readonly sessionId: SessionId;
  readonly action: "PAUSE" | "RESUME" | "STOP";
};

export type WsClientCommand = AudioChunkCommand | ControlCommand;
