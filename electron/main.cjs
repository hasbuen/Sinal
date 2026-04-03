const path = require("path");
const { app, BrowserWindow, ipcMain, shell } = require("electron");
const { autoUpdater } = require("electron-updater");

const isDev = !app.isPackaged;
const remoteAppUrl =
  process.env.ELECTRON_APP_URL || "https://hasbuen.github.io/Sinal/";

let mainWindow = null;

function getIconPath() {
  const buildDir = path.join(__dirname, "build");
  if (process.platform === "win32") {
    return path.join(buildDir, "icon.ico");
  }

  return path.join(buildDir, "icon.png");
}

function sendUpdaterStatus(type, detail) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.webContents.send("desktop-updater", {
    type,
    detail,
  });
}

function configureAutoUpdate() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => {
    sendUpdaterStatus("checking");
  });

  autoUpdater.on("update-available", (info) => {
    sendUpdaterStatus("available", info);
  });

  autoUpdater.on("update-not-available", (info) => {
    sendUpdaterStatus("idle", info);
  });

  autoUpdater.on("download-progress", (progress) => {
    sendUpdaterStatus("downloading", progress);
  });

  autoUpdater.on("update-downloaded", (info) => {
    sendUpdaterStatus("downloaded", info);
  });

  autoUpdater.on("error", (error) => {
    sendUpdaterStatus("error", error.message);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1080,
    minHeight: 720,
    backgroundColor: "#050914",
    title: "Sinal",
    icon: getIconPath(),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools({ mode: "detach" });
    return;
  }

  mainWindow.loadURL(remoteAppUrl);
}

app.whenReady().then(() => {
  createWindow();
  configureAutoUpdate();

  if (!isDev) {
    void autoUpdater.checkForUpdatesAndNotify();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

ipcMain.handle("desktop:get-info", () => ({
  version: app.getVersion(),
  platform: process.platform,
  isPackaged: app.isPackaged,
}));

ipcMain.handle("desktop:check-updates", async () => {
  if (isDev) {
    return { ok: false, reason: "dev-mode" };
  }

  await autoUpdater.checkForUpdates();
  return { ok: true };
});

ipcMain.handle("desktop:install-update", () => {
  if (!isDev) {
    autoUpdater.quitAndInstall();
  }

  return { ok: !isDev };
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
