import { app, BrowserWindow } from "electron";
import { createMainWindow } from "./window/WindowFactory";
import { registerIpcHandlers } from "./ipc";
import { initAutoUpdater } from "./updater/AutoUpdater";

app.whenReady().then(() => {
  app.setAppUserModelId("com.callassistant");

  const mainWindow = createMainWindow();
  registerIpcHandlers(mainWindow);

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
