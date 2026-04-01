import { create } from "zustand";
import type { ResponseSuggestion } from "@call-assistant/shared-types";

interface CopilotState {
  suggestions: ResponseSuggestion[];
  latest: ResponseSuggestion | null;
  addSuggestion: (suggestion: ResponseSuggestion) => void;
  clear: () => void;
}

export const useCopilotStore = create<CopilotState>((set) => ({
  suggestions: [],
  latest: null,

  addSuggestion: (suggestion) =>
    set((state) => ({
      suggestions: [...state.suggestions.slice(-19), suggestion],
      latest: suggestion,
    })),

  clear: () => set({ suggestions: [], latest: null }),
}));
