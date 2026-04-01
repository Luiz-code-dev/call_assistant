import type { SidecarOutboundMessage } from "@call-assistant/shared-types";

export {};

declare global {
  interface Window {
    electronAPI: {
      audio: {
        startCapture: (sessionId: string, sampleRate: number) => Promise<void>;
        stopCapture: (sessionId: string) => Promise<void>;
        onChunk: (callback: (msg: SidecarOutboundMessage) => void) => () => void;
      };
      tts: {
        play: (audioBase64: string, mimeType: string) => Promise<void>;
        onPlayAudio: (callback: (payload: { audioBase64: string }) => void) => () => void;
      };
    };
  }
}
