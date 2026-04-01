import { useEffect } from "react";
import type { SidecarOutboundMessage } from "@call-assistant/shared-types";
import { wsClient } from "../../infrastructure/websocket/WebSocketClient";

export function useAudioBridge(sessionId: string | null): void {
  useEffect(() => {
    if (!sessionId) return;

    let chunkCount = 0;
    const unsubscribe = window.electronAPI.audio.onChunk((msg: SidecarOutboundMessage) => {
      if (msg.type === "chunk") {
        chunkCount++;
        if (chunkCount <= 3 || chunkCount % 50 === 0) {
          console.log(`[useAudioBridge] chunk #${chunkCount} — sessionId=${sessionId}, bytes=${msg.data.length}`);
        }
        wsClient.send({
          type: "AUDIO_CHUNK",
          sessionId,
          data: msg.data,
          ts: msg.ts,
        });
      }
    });

    return unsubscribe;
  }, [sessionId]);
}
