import { contextBridge, ipcRenderer } from "electron";
import type { SidecarOutboundMessage } from "@call-assistant/shared-types";

contextBridge.exposeInMainWorld("electronAPI", {
  audio: {
    startCapture: (sessionId: string, sampleRate: number) =>
      ipcRenderer.invoke("ipc:audio:start-capture", { sessionId, sampleRate }),
    stopCapture: (sessionId: string) =>
      ipcRenderer.invoke("ipc:audio:stop-capture", { sessionId }),
    onChunk: (callback: (msg: SidecarOutboundMessage) => void) => {
      ipcRenderer.on("ipc:audio:chunk", (_event, msg) => callback(msg));
      return () => ipcRenderer.removeAllListeners("ipc:audio:chunk");
    },
  },
  tts: {
    play: (audioBase64: string, mimeType: string) =>
      ipcRenderer.invoke("ipc:tts:play", { audioBase64, mimeType }),
    onPlayAudio: (callback: (payload: { audioBase64: string }) => void) => {
      ipcRenderer.on("ipc:tts:play-audio", (_event, payload) => callback(payload));
      return () => ipcRenderer.removeAllListeners("ipc:tts:play-audio");
    },
  },
  auth: {
    openBrowserLogin: () =>
      ipcRenderer.invoke("ipc:auth:open-browser-login"),
    onTokenReceived: (callback: (payload: { token: string }) => void) => {
      ipcRenderer.on("ipc:auth:token-received", (_event, payload) => callback(payload));
      return () => ipcRenderer.removeAllListeners("ipc:auth:token-received");
    },
  },
});
