import { app, BrowserWindow, shell } from "electron";

const PROTOCOL = "callassistant";
const WEB_APP_URL = process.env["VITE_WEB_APP_URL"] || "https://call-assistant.com.br";

export function registerDeepLinkProtocol(): void {
  if (process.defaultApp) {
    if (process.argv.length >= 2 && process.argv[1]) {
      app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [
        "--",
        process.argv[1],
      ]);
    }
  } else {
    app.setAsDefaultProtocolClient(PROTOCOL);
  }
}

export function openLoginInBrowser(): void {
  const loginUrl = `${WEB_APP_URL}/login?callback=desktop`;
  shell.openExternal(loginUrl);
}

export function handleDeepLink(
  url: string,
  mainWindow: BrowserWindow
): void {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== `${PROTOCOL}:`) return;

    if (parsed.hostname === "auth") {
      const token = parsed.searchParams.get("token");
      if (token) {
        mainWindow.webContents.send("ipc:auth:token-received", { token });
        mainWindow.focus();
      }
    }
  } catch (err) {
    console.error("[DeepLink] Failed to parse URL:", url, err);
  }
}

export function registerDeepLinkHandlers(mainWindow: BrowserWindow): void {
  // Windows: second-instance event (app already running)
  app.on("second-instance", (_event, commandLine) => {
    const url = commandLine.find((arg) => arg.startsWith(`${PROTOCOL}://`));
    if (url) handleDeepLink(url, mainWindow);
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  // macOS: open-url event
  app.on("open-url", (_event, url) => {
    handleDeepLink(url, mainWindow);
  });

  // Handle URL passed as argv at startup (Windows cold start)
  const startupUrl = process.argv.find((arg) => arg.startsWith(`${PROTOCOL}://`));
  if (startupUrl) {
    app.whenReady().then(() => handleDeepLink(startupUrl, mainWindow));
  }
}
