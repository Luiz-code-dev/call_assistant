import { autoUpdater } from "electron-updater";
import { BrowserWindow, dialog } from "electron";

export function initAutoUpdater(mainWindow: BrowserWindow): void {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("update-available", (info) => {
    mainWindow.webContents.send("update:available", info.version);
  });

  autoUpdater.on("update-downloaded", () => {
    dialog
      .showMessageBox(mainWindow, {
        type: "info",
        title: "Atualização disponível",
        message: "Uma nova versão do Call Assistant foi baixada.",
        detail: "Reinicie o aplicativo para aplicar a atualização.",
        buttons: ["Reiniciar agora", "Mais tarde"],
        defaultId: 0,
      })
      .then(({ response }) => {
        if (response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
  });

  autoUpdater.on("error", (err) => {
    console.error("[AutoUpdater] erro:", err.message);
  });

  autoUpdater.checkForUpdatesAndNotify().catch((err) => {
    console.error("[AutoUpdater] checkForUpdates falhou:", err.message);
  });
}
