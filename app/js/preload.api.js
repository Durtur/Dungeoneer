// preload with contextIsolation enabled
const { contextBridge, ipcRenderer } = require('electron');
const dataAccess = require("../js/dataaccess");

contextBridge.exposeInMainWorld('dialog', {
    showOpenDialogSync: (options) => { return ipcRenderer.sendSync('open-dialog', options) },
    showMessageBoxSync: (options) => { return ipcRenderer.sendSync("show-message-box", options) },
    showSaveDialogSync: (options) => { return ipcRenderer.sendSync("show-save-dialog", options) }
})



