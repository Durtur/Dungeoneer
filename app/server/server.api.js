// preload with contextIsolation enabled
const { contextBridge, ipcRenderer } = require("electron");
const dataAccess = require("../js/dataaccess");
const AdminSoundManager = require("../js/soundManager");
const pathModule = require("path");
var soundManager;
dataAccess.getSettings((settings) => {
    soundManager = new AdminSoundManager(pathModule);
    soundManager.setSoundLibraryPath(settings.maptool.soundLibraryPath);
});

const util = require("./server.util");
const ElementCreator = require("../js/lib/elementCreator");
const diceRoller = require("../js/diceroller");

const constants = dataAccess.getConstantsSync();

contextBridge.exposeInMainWorld("api", {
    util,
    constants,
    diceRoller,
    extname: (path) => pathModule.extname(path),
    messageWindow: (windowName, eventName, args) => {
        return ipcRenderer.send("notify-window", { name: windowName, event: eventName, args: args });
    },
});

contextBridge.exposeInMainWorld("subscribe", {
    on: (event, handler) => ipcRenderer.on(event, handler),
    requestMapToolState: () => ipcRenderer.send("request-maptool-state"),
    notifyServerState: (args) => {
        ipcRenderer.send("maptool-server-state", args);
    },
});

contextBridge.exposeInMainWorld("dataAccess", {
    getSettings: (callback) => {
        dataAccess.getSettings(callback);
    },
    getParty: (callback) => {
        dataAccess.getParty(callback);
    },
    base64: async (path) => await dataAccess.base64(path),
});

contextBridge.exposeInMainWorld("soundManager", {
    getAvailableSounds: async () => {
        return await soundManager.getAvailableSounds();
    },
});
