const { contextBridge, ipcRenderer } = require('electron')
//const dataAccess = require('./dataaccess/dataaccess');
const fs = require("fs");
console.log(fs);

contextBridge.exposeInMainWorld('api', {
  getMonsters: (callback) => dataAccess.getMonsters(callback)
})