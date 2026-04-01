import type { Language, SessionId } from "./session.js";

export type TranscriptId = string;

export type Speaker = "LOCAL" | "REMOTE";

export interface Transcript {
  readonly id: TranscriptId;
  readonly sessionId: SessionId;
  readonly text: string;
  readonly speaker: Speaker;
  readonly language: Language;
  readonly confidence: number;
  readonly isFinal: boolean;
  readonly startMs: number;
  readonly endMs?: number;
  readonly createdAt: string;
}
