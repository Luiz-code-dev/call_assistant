import { API_BASE_URL } from "@shared/constants/config";
import { TokenStorage } from "@infrastructure/storage/TokenStorage";
import type { Result } from "@shared/types";

export interface LiveSuggestionResult {
  transcript: string;
  translation: string;
  suggestions: string[];
  suggestionTranslations: string[];
  creditsUsed: number;
}

export const LiveApi = {
  async translatePhrase(text: string): Promise<Result<{ english: string }>> {
    const token = await TokenStorage.get();
    try {
      const res = await fetch(`${API_BASE_URL}/api/live/phrase`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ text }),
      });
      const data = await res.json() as { english?: string; error?: string };
      if (!res.ok) return { ok: false, error: { message: data.error ?? "Erro ao traduzir.", statusCode: res.status } };
      return { ok: true, data: { english: data.english ?? "" } };
    } catch {
      return { ok: false, error: { message: "Erro de conexão.", statusCode: 0 } };
    }
  },

  async endSession(sessionId: string): Promise<void> {
    const token = await TokenStorage.get();
    try {
      await fetch(`${API_BASE_URL}/api/live/session/end`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ session_id: sessionId }),
      });
    } catch { /* fire and forget */ }
  },

  /**
   * Envia áudio gravado (Blob/File) para o endpoint Whisper → IA.
   * Fallback do MediaRecorder — funciona em iOS (sem Web Speech API).
   */
  async processAudio(
    audioUri: string,
    sessionId: string,
    opts: { focus?: string; level?: string; sourceLang?: string; customContext?: string } = {}
  ): Promise<Result<LiveSuggestionResult>> {
    const token = await TokenStorage.get();

    const formData = new FormData();
    formData.append("audio", {
      uri: audioUri,
      type: "audio/m4a",
      name: "live.m4a",
    } as unknown as Blob);
    formData.append("session_id", sessionId);
    formData.append("focus", opts.focus ?? "");
    formData.append("level", opts.level ?? "");
    formData.append("source_lang", opts.sourceLang ?? "en-US");
    formData.append("custom_context", opts.customContext ?? "");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 40_000);

    try {
      const response = await fetch(`${API_BASE_URL}/api/live/process`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const err = await response.json().catch(() => ({})) as Record<string, unknown>;
        return {
          ok: false,
          error: {
            message: (err.error as string) ?? `Erro ${response.status}`,
            statusCode: response.status,
          },
        };
      }

      const data = await response.json() as {
        transcript: string;
        translation: string;
        suggestions: string[];
        suggestion_translations: string[];
        creditsUsed: number;
      };

      return {
        ok: true,
        data: {
          transcript: data.transcript,
          translation: data.translation,
          suggestions: data.suggestions ?? [],
          suggestionTranslations: data.suggestion_translations ?? [],
          creditsUsed: data.creditsUsed ?? 0,
        },
      };
    } catch (err) {
      clearTimeout(timeout);
      return {
        ok: false,
        error: {
          message:
            (err as Error).name === "AbortError"
              ? "Tempo limite esgotado."
              : "Erro de conexão.",
          statusCode: 0,
        },
      };
    }
  },
};
