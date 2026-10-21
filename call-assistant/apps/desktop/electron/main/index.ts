import { app, BrowserWindow } from "electron";
import { createMainWindow } from "./window/WindowFactory";
import { registerIpcHandlers } from "./ipc";
import { initAutoUpdater } from "./updater/AutoUpdater";
import {
  registerDeepLinkProtocol,
  registerDeepLinkHandlers,
} from "./deeplink/DeepLinkHandler";
// Must be called before app ready
registerDeepLinkProtocol();

// Enforce single instance for deep link to work on Windows
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

// Restore window when a second instance tries to launch
app.on("second-instance", () => {
  const win = BrowserWindow.getAllWindows()[0];
  if (win) {
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  }
});

app.whenReady().then(() => {
  app.setAppUserModelId("com.speakflow");

  const mainWindow = createMainWindow();

  // Fallback: force-show window if renderer never fires ready-to-show
  setTimeout(() => {
    if (!mainWindow.isVisible()) mainWindow.show();
  }, 5000);

  registerIpcHandlers(mainWindow);
  registerDeepLinkHandlers(mainWindow);

  if (!process.env["ELECTRON_RENDERER_URL"]) {
    initAutoUpdater(mainWindow);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
