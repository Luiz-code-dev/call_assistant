import { app, BrowserWindow } from "electron";
import { createMainWindow } from "./window/WindowFactory";
import { registerIpcHandlers } from "./ipc";

app.whenReady().then(() => {
  app.setAppUserModelId("com.callassistant");

  const mainWindow = createMainWindow();
  registerIpcHandlers(mainWindow);

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
