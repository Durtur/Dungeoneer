// preload with contextIsolation enabled
const { contextBridge, ipcRenderer } = require('electron');
const dataAccess = require("../js/dataaccess");
const util = require("../js/util");
const ElementCreator = require("../js/lib/elementCreator");

const constants = dataAccess.getConstantsSync();


contextBridge.exposeInMainWorld('api', {
    util,
    constants
})


contextBridge.exposeInMainWorld('subscribe', {
    on: (event, handler) => ipcRenderer.on(event, handler),
    requestMapToolState : () => ipcRenderer.send('request-maptool-state')
})

contextBridge.exposeInMainWorld('dataAccess', {
    getSettings: (callback) => { dataAccess.getSettings(callback) },
    getParty: (callback) => { dataAccess.getParty(callback) }
})