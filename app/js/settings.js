
const { ipcRenderer } = require('electron');
const dataAccess = require("./js/dataaccess");

var pathModule = require('path');
const THEME_PATH = pathModule.join(app.getAppPath(), 'app', 'css', 'themes');
const { readdir } = require('fs').promises;

var playerPlaques = document.querySelector("#showPlayerPlaques");
var autoRoll = document.querySelector("#autoRollInitiative");
var roundCounter = document.querySelector("#roundCounterIntitiative");
var addPlayersAutomatically = document.querySelector("#addPlayersAutomatically");
var snapToGrid = document.querySelector("#snapToGrid");
var enableGrid = document.getElementById("enableGrid");
var mobControllerEnabled = document.getElementById("mobControllerEnabled");
var transparentMaptoolWindow = document.getElementById("transparentWindow");
var syncToCombatPanel = document.querySelector("#syncToCombatPanel");
var applyDarkvisionFilter = document.querySelector("#applyDarkvisionFilter");
var diceRoller = document.querySelector("#diceRoller");
var generator = document.querySelector("#generator");
var lootRoller = document.querySelector("#lootRoller");
var mapToolCheckBox = document.querySelector("#mapTool");
var saveRoller = document.querySelector("#saveRoller");
var colorTokenBases = document.querySelector("#colorTokenBases");
var defaultMonsterTokenRotate = document.querySelector("#defaultMonsterTokenRotate");
var defaultPlayerTokenRotate = document.querySelector("#defaultPlayerTokenRotate");
var defaultMapSizeX = document.getElementById("defaultMapsizeX");

var doneSaving = false;

var oldSettings;
ipcRenderer.on('settings-window-save-and-close', function (evt, arg) {
    saveSettings(true);
});

document.addEventListener("DOMContentLoaded", function () {
    dataAccess.getSettings(function (data) {
        oldSettings = data;
        playerPlaques.checked = data.playerPlaques;
        autoRoll.checked = data.autoInitiative;
        roundCounter.checked = data.countRounds;
        defaultMonsterTokenRotate.value = data.maptool.defaultMonsterTokenRotate || 90;
        defaultPlayerTokenRotate.value = data.maptool.defaultPlayerTokenRotate || -90;
        addPlayersAutomatically.checked = data.maptool.addPlayersAutomatically;
        applyDarkvisionFilter.checked = data.maptool.applyDarkvisionFilter;
        snapToGrid.checked = data.maptool.snapToGrid
        enableGrid.checked = data.maptool.enableGrid;
        syncToCombatPanel.checked = data.maptool.syncToCombatPanel
        diceRoller.checked = data.enable.diceRoller;
        generator.checked = data.enable.generator;
        lootRoller.checked = data.enable.lootRoller;
        mobControllerEnabled.checked = data.enable.mobController;
        mapTool.checked = data.enable.mapTool;
        colorTokenBases.checked = data.maptool.colorTokenBases;
        if (transparentMaptoolWindow)
            transparentMaptoolWindow.checked = data.maptool.transparentWindow;
        saveRoller.checked = data.enable.saveRoller;
        defaultMapSizeX.value = data.maptool.defaultMapSize ? data.maptool.defaultMapSize : "";
        hideOrShowMapTool(true);
        hideOrShowGridSettings(true);
        addHeaderHandlers();
        readThemes();

    });

});

async function readThemes(){
    var themes = await readdir(THEME_PATH);
    console.log(themes)
    console.log()
}

function addHeaderHandlers() {
    var allHeaders = [...document.getElementsByClassName("settings_header")];
    allHeaders.forEach(header => header.onclick = hideOrShowContent);
    allHeaders.forEach(function (header) {
        var parentNode = header.parentNode;
        parentNode.setAttribute("data-open", "false");
    })
    function hideOrShowContent(event) {
        var parentNode = event.target.parentNode;
        var isOpen = parentNode.getAttribute("data-open");

        var contentNode = parentNode.getElementsByClassName("header_content")[0];

        if (isOpen == "true") {
            contentNode.classList.add("hidden")
            parentNode.setAttribute("data-open", "false")
        } else {
            contentNode.classList.remove("hidden")
            parentNode.setAttribute("data-open", "true")
        }
    }
}
function notifySettingsChanged() {
    let mainWindow = remote.getGlobal('mainWindow');
    let maptoolWindow = remote.getGlobal('maptoolWindow');
    if (mainWindow) mainWindow.webContents.send('settings-changed');
    if (maptoolWindow) maptoolWindow.webContents.send('settings-changed');
}

function saveSettings(closeImmediately) {
    var data;
    try {
        data = {};
        if (oldSettings != null) data = oldSettings;

        data.playerPlaques = playerPlaques.checked;
        data.autoInitiative = autoRoll.checked;
        data.countRounds = roundCounter.checked;
        data.maptool.defaultMonsterTokenRotate = defaultMonsterTokenRotate.value || 90;
        data.maptool.defaultPlayerTokenRotate = defaultPlayerTokenRotate.value || -90;


        data.maptool.addPlayersAutomatically = addPlayersAutomatically.checked;
        data.maptool.snapToGrid = snapToGrid.checked;
        data.maptool.enableGrid = enableGrid.checked;
        data.maptool.syncToCombatPanel = syncToCombatPanel.checked;
        data.maptool.applyDarkvisionFilter = applyDarkvisionFilter.checked;
        data.maptool.transparentWindow = transparentMaptoolWindow?.checked;
        data.maptool.defaultMapSize = {};
        data.maptool.defaultMapSize = defaultMapSizeX.value != "" ? defaultMapSizeX.value : null;
        data.maptool.colorTokenBases = colorTokenBases.checked;
        data.enable.saveRoller = saveRoller.checked;
        data.enable.diceRoller = diceRoller.checked;
        data.enable.generator = generator.checked;
        data.enable.mobController = mobControllerEnabled.checked;
        data.enable.lootRoller = lootRoller.checked;
        data.enable.mapTool = mapToolCheckBox.checked;
    } catch (err) {
        data = loadDefaultSettings();
    }


    dataAccess.saveSettings(data, function (err) {
        $('#save_success').finish().fadeIn("fast").delay(2500).fadeOut("slow");
        var bg = document.querySelector("#save_msg_bg");
        bg.style.display = "flex";
        notifySettingsChanged();
        if (closeImmediately) {
            doneSaving = true;
            remote.getCurrentWindow().close()
        } else {
            setTimeout(function () { remote.getCurrentWindow().close() }, 1000);
        }



    })


}
window.addEventListener('beforeunload', (event) => {
    if (!doneSaving) {
        event.preventDefault();
        event.returnValue = '';
        saveSettings(true);
    }

});


function hideOrShowMapTool() {
    var mapToolSection = document.getElementById("mapToolSection");
    if (mapTool.checked) {
        mapToolSection.classList.remove("hidden");
    } else {
        mapToolSection.classList.add("hidden");
    }
}

function hideOrShowGridSettings() {

    if (enableGrid.checked) {
        snapToGrid.parentElement.parentElement.classList.remove("hidden");
    } else {
        snapToGrid.checked = false;
        snapToGrid.parentElement.parentElement.classList.add("hidden");
    }
}