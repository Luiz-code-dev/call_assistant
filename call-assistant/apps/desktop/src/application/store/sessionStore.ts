import { create } from "zustand";
import type { Session, SessionConfig } from "@call-assistant/shared-types";
import { sessionApi } from "../../infrastructure/api/sessionApi";
import { wsClient } from "../../infrastructure/websocket/WebSocketClient";

interface SessionState {
  session: Session | null;
  isConnecting: boolean;
  error: string | null;
  startSession: (config: SessionConfig) => Promise<void>;
  stopSession: () => Promise<void>;
  clearError: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  session: null,
  isConnecting: false,
  error: null,

  startSession: async (config: SessionConfig) => {
    set({ isConnecting: true, error: null });
    try {
      const session = await sessionApi.create({ config });
      wsClient.connect(session.id);
      set({ session, isConnecting: false });

      await window.electronAPI.audio.startCapture(session.id, 16000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start session";
      set({ isConnecting: false, error: message });
    }
  },

  stopSession: async () => {
    const { session } = get();
    if (!session) return;
    try {
      await window.electronAPI.audio.stopCapture(session.id);
      wsClient.disconnect();
      const stopped = await sessionApi.stop(session.id);
      set({ session: stopped });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to stop session";
      set({ error: message });
    }
  },

  clearError: () => set({ error: null }),
}));
