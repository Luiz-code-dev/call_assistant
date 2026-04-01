import { create } from "zustand";
import type { Transcript, Translation } from "@call-assistant/shared-types";

interface TranscriptState {
  transcripts: Transcript[];
  translations: Map<string, Translation>;
  addOrUpdateTranscript: (transcript: Transcript) => void;
  addTranslation: (translation: Translation) => void;
  clear: () => void;
}

export const useTranscriptStore = create<TranscriptState>((set) => ({
  transcripts: [],
  translations: new Map(),

  addOrUpdateTranscript: (transcript: Transcript) =>
    set((state) => {
      const existing = state.transcripts.findIndex((t) => t.id === transcript.id);
      if (existing >= 0) {
        const updated = [...state.transcripts];
        updated[existing] = transcript;
        return { transcripts: updated };
      }
      return { transcripts: [...state.transcripts, transcript] };
    }),

  addTranslation: (translation: Translation) =>
    set((state) => {
      const next = new Map(state.translations);
      next.set(translation.transcriptId, translation);
      return { translations: next };
    }),

  clear: () => set({ transcripts: [], translations: new Map() }),
}));
