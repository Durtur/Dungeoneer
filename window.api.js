// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.

const { contextBridge, ipcRenderer } = require('electron')
// const { ipcRenderer } = require('electron');
// const dataAccess = require("./dataaccess/dataAccess");



// dataAccess.initialize();

contextBridge.exposeInMainWorld('api', {
    getPath: (arg) => { return ipcRenderer.sendSync('app-path', arg)},
    
});







