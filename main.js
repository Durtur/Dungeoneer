const electron = require('electron')
const { app, Menu } = require('electron')
const { ipcMain } = require('electron')
var fs = require('fs');
const pathModule = require('path');
const { autoUpdater } = require('electron-updater');

app.allowRendererProcessReuse = false;
var instanceLock = app.requestSingleInstanceLock();
console.log(`intance lock ${instanceLock}`)
autoUpdater.logger = require("electron-log")
autoUpdater.logger.transports.file.level = "info"
// Module to control application life.
//const app = electron.app
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow

const path = require('path')
const url = require('url')
const settingsPath = path.join(app.getPath("userData"), "data", "settings", "settings.json");

databaseWindow = null;
maptoolBackdropWindow = null;
generatorWindow = null;
mainWindow = null;
settingsWindow = null;
aboutWindow = null;
mapToolAddWindow = null;
maptoolWindow = null;
maptoolExtraWindow = null;
massTokenImporterWindow = null;
massStatblockImporterWindow = null;
var updatePending = false;


const template = [
  {
    label: 'Edit',
    submenu: [
      {
        label: 'Settings',
        click() { openSettingsWindow(); }
      },
      { type: 'separator' },
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'pasteandmatchstyle' },
      { role: 'delete' },
      { role: 'selectall' }
    ]
  },
  {
    label: 'View',
    submenu: [

      { role: 'forcereload' },
      { role: 'toggledevtools' },
      { type: 'separator' },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ]
  },
  // { role: 'windowMenu' }
  {
    label: 'Window',
    submenu: [
      { role: 'minimize' },
      { role: 'zoom' },
      { role: 'close' }
    ]
  }
]

if (process.platform === 'darwin') {
  template.unshift({
    label: app.getName(),
    submenu: [
      { role: 'about' },
      { type: 'separator' },
      { role: 'services', submenu: [] },
      { type: 'separator' },
      { role: 'hide' },
      { role: 'hideothers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit' }
    ]
  })

  // Edit menu
  template[1].submenu.push(
    { type: 'separator' },
    {
      label: 'Speech',
      submenu: [
        { role: 'startspeaking' },
        { role: 'stopspeaking' }
      ]
    }
  )

  // Window menu
  template[3].submenu = [
    { role: 'close' },
    { role: 'minimize' },
    { role: 'zoom' },
    { type: 'separator' },
    { role: 'front' }
  ]
}

if (!instanceLock) {
  app.quit()
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
      if (commandLine)
        mainWindow.webContents.send("ipc-log", commandLine);
      checkIfCommandLineIncludesMap(commandLine);
    }
  })
}

const supportedFileTypes = ['.dungeoneer_map', ".dd2vtt"];
function checkIfCommandLineIncludesMap(cmdLine) {
  var path = cmdLine.find(x => supportedFileTypes.includes(pathModule.extname(x).toLowerCase()));
  mainWindow.webContents.send("ipc-log", path);
  if (path) {
    openMapToolWindow(() => {
      mainWindow.webContents.send("ipc-log", "Maptool opened");
      maptoolWindow.webContents.send("load-map", path);
    });

  }
}

const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu)
app.on('open-file', (event, path) => {
  event.preventDefault();
  console.log(path);
});

ipcMain.on('open-database-window', function () {
  if (databaseWindow) {
    databaseWindow.focus();
    return;
  }

  databaseWindow = new BrowserWindow({
    height: 600,
    resizable: true,
    title: "Database",
    width: 1200,
    frame: false,
    icon: "./app/css/img/icon.png",
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true
    }
  });

  databaseWindow.loadURL('file://' + __dirname + '/app/database.html');

  databaseWindow.on('closed', function () {
    databaseWindow = null;
  });
});


ipcMain.on('open-settings-window', function () {
  openSettingsWindow();
});

ipcMain.on('open-add-maptool-stuff-window', function () {
  openAddMapToolStuffWindow();
});

ipcMain.on('open-about-window', function () {
  openAboutWindow();
});

ipcMain.on('open-statblock-importer', function () {
  openMassStatblockImporterWindow();
});

ipcMain.on('open-token-importer', function () {
  openMassTokenImporterWindow();
});

ipcMain.on("open-maptool-backdrop-window", function () {
  if (maptoolBackdropWindow) {
    maptoolBackdropWindow.focus();
    return;
  }

  maptoolBackdropWindow = new BrowserWindow({
    height: 600,
    resizable: true,
    width: 1200,
    frame: false,
    icon: "./app/css/img/icon.png",
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true
    }
  });


  maptoolBackdropWindow.loadURL('file://' + __dirname + '/app/maptoolBackdrop.html');
  maptoolBackdropWindow.maximize();
  maptoolBackdropWindow.on('closed', function () {
    maptoolBackdropWindow = null;
  });

})

ipcMain.on('open-maptool-window', () => openMapToolWindow());

function openMapToolWindow(callback) {
  if (maptoolWindow) {
    maptoolWindow.focus();
    if (callback) callback();
    return;
  }

  createMapToolWindow(function (window) {
    maptoolWindow = window;
    window.maximize();
    window.loadURL('file://' + __dirname + '/app/mappingTool.html');
    window.on('closed', function () {
      maptoolWindow = null;
    });

    window.webContents.once('dom-ready', () => {
      if (callback)
        callback();
    })

  })
}

ipcMain.on('open-maptool-extra-window', function () {
  if (maptoolExtraWindow) {
    maptoolExtraWindow.focus();
    return;
  }

  createMapToolWindow(function (window) {
    maptoolExtraWindow = window;
    window.maximize();
    window.loadURL('file://' + __dirname + '/app/mappingTool.html');
    window.on('closed', function () {
      maptoolExtraWindow = null;
    });

  })
});


ipcMain.on('open-generator-window', function () {
  if (generatorWindow) {
    generatorWindow.focus();
    return;
  }

  generatorWindow = new BrowserWindow({
    height: 600,
    resizable: true,
    width: 1200,
    frame: false,
    icon: "./app/css/img/icon.png",
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true
    }
  });

  generatorWindow.loadURL('file://' + __dirname + '/app/generators.html');

  generatorWindow.on('closed', function () {
    generatorWindow = null;
  });
});

function openAddMapToolStuffWindow() {
  if (mapToolAddWindow) {
    mapToolAddWindow.focus();
    return;
  }

  mapToolAddWindow = new BrowserWindow({
    height: 620,
    resizable: true,
    width: 1200,
    frame: false,
    icon: "./app/css/img/icon.png",
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true
    }
  });

  mapToolAddWindow.loadURL('file://' + __dirname + '/app/addMapToolStuff.html');

  mapToolAddWindow.on('closed', function () {
    mapToolAddWindow = null;
  });
}

function openMassStatblockImporterWindow(){
  if (massStatblockImporterWindow) {
    massStatblockImporterWindow.focus();
    return;
  }
  massStatblockImporterWindow = new BrowserWindow({
    height: 800,
    resizable: true,
    width: 1050,
    frame: false,
    icon: "./app/css/img/icon.png",
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true
    }
  });
  massStatblockImporterWindow.loadURL('file://' + __dirname + '/app/statblockImporter.html');

  massStatblockImporterWindow.on('closed', function () {
    massStatblockImporterWindow = null;
  });
}

function openMassTokenImporterWindow() {
  if (massTokenImporterWindow) {
    massTokenImporterWindow.focus();
    return;
  }
  massTokenImporterWindow = new BrowserWindow({
    height: 800,
    resizable: true,
    width: 750,
    frame: false,
    icon: "./app/css/img/icon.png",
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true
    }
  });
  massTokenImporterWindow.loadURL('file://' + __dirname + '/app/tokenImporter.html');

  massTokenImporterWindow.on('closed', function () {
    massTokenImporterWindow = null;
  });
}

function openAboutWindow() {
  if (aboutWindow) {
    aboutWindow.focus();
    return;
  }

  aboutWindow = new BrowserWindow({
    height: 600,
    resizable: true,
    width: 680,
    frame: false,
    icon: "./app/css/img/icon.png",
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true
    }
  });

  aboutWindow.loadURL('file://' + __dirname + '/app/about.html');

  aboutWindow.on('closed', function () {
    aboutWindow = null;
  });
}

function openSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    height: 620,
    resizable: true,
    width: 500,
    frame: false,
    icon: "./app/css/img/settings.png",
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true
    }
  });


  settingsWindow.loadURL('file://' + __dirname + '/app/settings.html');

  settingsWindow.on('closed', function () {
    settingsWindow = null;
  });
}

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let loading;

function createWindow() {
  // Create the browser window.
  loading = new BrowserWindow({
    width: 200, height: 200, show: false, frame: false, transparent: true, icon: "./app/css/img/icon.png", webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true
    }
  });

  loading.once('show', () => {
    mainWindow = new BrowserWindow(
      {
        width: 1250, frame: false, height: 850, icon: "./app/css/img/icon.png", show: false,
        webPreferences: {
          nodeIntegration: true,
          enableRemoteModule: true
        }
      }
    );

    mainWindow.webContents.once('dom-ready', () => {

      mainWindow.show()
      loading.hide()
      loading.close()
      autoUpdater.checkForUpdatesAndNotify();

    })

    // Emitted when the window is closed.
    mainWindow.on('closed', function () {
      // Dereference the window object, usually you would store windows
      // in an array if your app supports multi windows, this is the time
      // when you should delete the corresponding element.
      mainWindow = null
      app.quit();
      if (updatePending)
        autoUpdater.quitAndInstall();

    })
    // long loading html
    mainWindow.loadURL(url.format({
      pathname: path.join(__dirname, 'app/index.html'),
      protocol: 'file:',

      slashes: true
    }))
  })


  loading.loadURL(url.format({
    pathname: path.join(__dirname, 'app/loading.html'),
    protocol: 'file:',

    slashes: true
  }))
  loading.show();
}


autoUpdater.on('update-available', () => {
  mainWindow.webContents.send('update_available');
});

ipcMain.on('notify-party-array-updated', function (evt, arg) {
  ipcMain.send('notify-party-array-updated');
});


autoUpdater.on('update-available', () => {
  mainWindow.webContents.send('update_available');
});
autoUpdater.on('update-downloaded', () => {
  mainWindow.webContents.send('update_downloaded');
  updatePending = true;
});

ipcMain.on('open-autofill', function () {
  ipcMain.send('open-autofill');

});

function createMapToolWindow(callback) {

  fs.readFile(settingsPath, function (err, data) {
    if (err) {
      console.log(err);
      data = { maptool: { transparentWindow: false } };
    } else {
      data = JSON.parse(data);
      if (data == null || data.maptool == null) {
        data = { maptool: { transparentWindow: false } };
      }
    }
    transparentWindow = (data.maptool.transparentWindow ? data.maptool.transparentWindow : false)
    console.log("Creating maptool window. Transparent: " + transparentWindow);
    callback(new BrowserWindow({
      height: 600,
      resizable: true,
      width: 1200,
      icon: "./app/css/img/icon.png",
      frame: false,
      transparent: transparentWindow,
      webPreferences: {
        nodeIntegration: true,
        enableRemoteModule: true
      }
    }));

  });

}





// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (updatePending) autoUpdater.quitAndInstall();
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})


