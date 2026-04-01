import type { Language, SessionId } from "./session.js";
import type { TranscriptId } from "./transcript.js";

export type TranslationId = string;

export interface Translation {
  readonly id: TranslationId;
  readonly sessionId: SessionId;
  readonly transcriptId: TranscriptId;
  readonly sourceText: string;
  readonly targetText: string;
  readonly sourceLanguage: Language;
  readonly targetLanguage: Language;
  readonly createdAt: string;
}
