import { create } from "zustand";
import type { ResponseSuggestion } from "@call-assistant/shared-types";

interface CopilotState {
  suggestions: ResponseSuggestion[];
  latest: ResponseSuggestion | null;
  currentIndex: number;
  current: ResponseSuggestion | null;
  addSuggestion: (suggestion: ResponseSuggestion) => void;
  viewPrevious: () => void;
  viewNext: () => void;
  clear: () => void;
}

export const useCopilotStore = create<CopilotState>((set) => ({
  suggestions: [],
  latest: null,
  currentIndex: -1,
  current: null,

  addSuggestion: (suggestion) =>
    set((state) => {
      const next = [...state.suggestions.slice(-19), suggestion];
      const idx = next.length - 1;
      return { suggestions: next, latest: suggestion, currentIndex: idx, current: suggestion };
    }),

  viewPrevious: () =>
    set((state) => {
      const idx = Math.max(0, state.currentIndex - 1);
      return { currentIndex: idx, current: state.suggestions[idx] ?? null };
    }),

  viewNext: () =>
    set((state) => {
      const idx = Math.min(state.suggestions.length - 1, state.currentIndex + 1);
      return { currentIndex: idx, current: state.suggestions[idx] ?? null };
    }),

  clear: () => set({ suggestions: [], latest: null, currentIndex: -1, current: null }),
}));
