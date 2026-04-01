import { useEffect } from "react";
import type { WsServerEvent } from "@call-assistant/shared-types";
import { wsClient } from "../../infrastructure/websocket/WebSocketClient";
import { useTranscriptStore } from "../store/transcriptStore";
import { useCopilotStore } from "../store/copilotStore";

export function useTranscription(sessionId: string | null): void {
  const { addOrUpdateTranscript, addTranslation } = useTranscriptStore();
  const { addSuggestion } = useCopilotStore();

  useEffect(() => {
    if (!sessionId) return;

    const unsubscribe = wsClient.onEvent((event: WsServerEvent) => {
      switch (event.type) {
        case "TRANSCRIPT_PARTIAL":
        case "TRANSCRIPT_FINAL":
          addOrUpdateTranscript(event.payload.transcript);
          break;
        case "TRANSLATION_READY":
          addTranslation(event.payload.translation);
          break;
        case "SUGGESTION_READY":
          addSuggestion(event.payload.suggestion);
          break;
        default:
          break;
      }
    });

    return unsubscribe;
  }, [sessionId, addOrUpdateTranscript, addTranslation, addSuggestion]);
}
