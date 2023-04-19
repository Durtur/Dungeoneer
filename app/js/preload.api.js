// preload with contextIsolation enabled
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("config", {
    get: (options) => {
        return ipcRenderer.sendSync("config", options);
    },
    getConstantsSync: (options) => {
        return JSON.parse(ipcRenderer.sendSync("module-constants", options));
    },
});

contextBridge.exposeInMainWorld("api", {
    getPath: (arg) => {
        return ipcRenderer.sendSync("get-path", arg);
    },
    getAppPath: () => {
        return ipcRenderer.sendSync("app-path");
    },
    getAppVersion: () => {
        return ipcRenderer.sendSync("app-version");
    },
    messageWindow: (windowName, eventName, args) => {
        return ipcRenderer.send("notify-window", { name: windowName, event: eventName, args: args });
    },
    openBrowser: (path) => {
        return ipcRenderer.send("open-browser", path);
    },
    openWindowWithArgs: (windowName, eventName, args) => {
        return ipcRenderer.send("notify-window", { name: windowName, event: eventName, args: args, openIfClosed: true });
    },
    openExplorer: (path) => {
        return ipcRenderer.send("open-explorer", path);
    },
    // getSystem: (name) => {
    //     return ipcRenderer.sendSync("get-system", name);
    // },
});

contextBridge.exposeInMainWorld("dialog", {
    showOpenDialogSync: (options) => {
        return ipcRenderer.sendSync("open-dialog", options);
    },
    showMessageBoxSync: (options) => {
        return ipcRenderer.sendSync("show-message-box", options);
    },
    showSaveDialogSync: (options) => {
        return ipcRenderer.sendSync("show-save-dialog", options);
    },
});
