const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("sinalDesktop", {
  getInfo: () => ipcRenderer.invoke("desktop:get-info"),
  checkForUpdates: () => ipcRenderer.invoke("desktop:check-updates"),
  installUpdate: () => ipcRenderer.invoke("desktop:install-update"),
  onUpdaterEvent: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("desktop-updater", listener);
    return () => ipcRenderer.removeListener("desktop-updater", listener);
  },
});
