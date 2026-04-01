import { BrowserWindow, ipcMain } from "electron";
import { sidecarManager } from "../sidecar/SidecarManager";
import type {
  CreateSessionRequest,
  SidecarOutboundMessage,
} from "@call-assistant/shared-types";

export function registerIpcHandlers(mainWindow: BrowserWindow): void {
  ipcMain.handle("ipc:audio:start-capture", (_event, { sessionId, sampleRate }: { sessionId: string; sampleRate: number }) => {
    sidecarManager.start((msg: SidecarOutboundMessage) => {
      mainWindow.webContents.send("ipc:audio:chunk", msg);
    });
    sidecarManager.send({ cmd: "start", sampleRate, channels: 1 });
  });

  ipcMain.handle("ipc:audio:stop-capture", (_event, { sessionId: _sessionId }: { sessionId: string }) => {
    sidecarManager.stop();
  });

  ipcMain.handle("ipc:tts:play", async (_event, { audioBase64 }: { audioBase64: string }) => {
    mainWindow.webContents.send("ipc:tts:play-audio", { audioBase64 });
  });
}
