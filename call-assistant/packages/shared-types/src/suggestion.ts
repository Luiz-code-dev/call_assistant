import type { SessionId } from "./session.js";

export type SuggestionId = string;

export interface ResponseSuggestion {
  readonly id: SuggestionId;
  readonly sessionId: SessionId;
  readonly contextSummary: string;
  readonly suggestions: readonly string[];
  readonly createdAt: string;
}
