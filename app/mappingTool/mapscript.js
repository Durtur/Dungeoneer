const { ipcRenderer, webFrame } = require('electron');


const Awesomplete = require(pathModule.join(app.getAppPath(), "app", "awesomplete", "awesomplete.js"));
const Geometry = require("./mappingTool/geometry");
const MapLibrary = require("./mappingTool/mapLibrary");
const SlideCanvas = require("./mappingTool/slideCanvas");
const Menu = require("./mappingTool/menu");
const SoundManager = require("./js/soundManager")
const soundManager = new SoundManager();
const dataAccess = require("./js/dataaccess");
const sidebarManager = require("./js/sidebarmanager");
const InfoTooltip = require("./mappingTool/infotooltip");
const info = new InfoTooltip();
const initiative = require("./js/initiative");
const dialog = require('electron').remote.dialog;
const marked = require('marked');
const TokenSelector = require('./js/tokenSelector');
const tokenSelector = new TokenSelector();
const saveManager = require("./mappingTool/saveManager");
const effectManager = require('./mappingTool/effectManager');

soundManager.initialize();

var pawnId = 1, effectId = 1;
var initialLoadComplete = false;
var cellSize = 35, originalCellSize = cellSize;
var canvasWidth = 400;
var canvasHeight = 400;
var zIndexPawnCap = 9;
var conditionList;

var pauseAlternativeKeyboardMoveMap = false;
var frameHistoryButtons = null;
var pendingMapLoad;
//Elements
var measurementsLayer = document.getElementById("measurements");
var measurementsLayerContext = measurementsLayer.getContext("2d");
var gridLayer = document.getElementById("grid");
var gridLayerContext = gridLayer.getContext("2d");
var tokenLayer = document.getElementById("tokens");
//

var overlayLoop, backgroundLoop;

var LAST_KEY, lastKeyNull; //Last pressed key
//Grid 
var gridMoveOffsetX = 0, gridMoveOffsetY = 0, canvasMoveRate = 2;
var resetMoveIncrementTimer;

var mapContainers, foregroundCanvas, backgroundCanvas, overlayCanvas;
//Tokens
var loadedMonsters = [], partyArray, loadedMonstersFromMain = [];
var settings, fogOfWarEnabled = true, filtered = false, lastBackgroundFilter, effectFilePath;
var addPawnImagePaths;
//Measurements
var visibilityLayerVisible = false;
var lastMeasuredPoint = null;


var MAX_BG_ZOOM = 10, MIN_BG_ZOOM = 0.1;
//Visibility

var effects = [];
var pawns = (function () {
    var medium, large, huge, gargantuan, colossal, all;
    var lastLocationPlayers = { x: 3, y: 3 };
    var lastLocationMonsters = { x: 18, y: 3 };
    var addQueue = [];
    var monsters = [];
    var lightSources = [];
    var players = [];

    return {
        medium: medium,
        large: large,
        huge: huge,
        gargantuan: gargantuan,
        colossal: colossal,
        all: all,
        lastLocationPlayers: lastLocationPlayers,
        lastLocationMonsters: lastLocationMonsters,
        monsters: monsters,
        players: players,
        lightSources: lightSources,
        addQueue: addQueue

    }

})();

function newPawnId() {
    return `pawn${pawnId++}`;
}

function loadSettings() {
    dataAccess.getSettings(function (data) {

        settings = data.maptool;
        if (!settings.colorTokenBases) {
            document.getElementById("background_color_button_add_pawn").value = "rgba(255, 255, 255, 0)";
        }

        var hueSelector = document.getElementById("fog_of_war_hue_selector")
        if (settings.fogOfWarHue) {
            hueSelector.value = settings.fogOfWarHue;
        } else {
            settings.fogOfWarHue = hueSelector.value;
        }
        if (!settings.transparentWindow) document.body.style.backgroundColor = hueSelector.value;
        effectFilePath = defaultEffectPath;

        if (!settings.enableGrid) settings.snapToGrid = false;
        if (!settings.applyDarkvisionFilter) {
            setBackgroundFilter();
        } else {
            if (fovLighting.viewerHasDarkvision()) {
                setBackgroundFilter();
            }
        }
        var filterValue = settings.currentFilter ? settings.currentFilter : 0;
        var filterDd = document.getElementById("filter_tool");
        filterDd.selectedIndex = parseInt(filterValue);
        setBackgroundFilter();
        if (settings.currentMap) {
            setMapForeground(settings.currentMap, settings.gridSettings.mapSize);
        }

        if (settings.currentOverlay) {
            setMapOverlay(settings.currentOverlay, settings.gridSettings.mapOverlaySize);
        }

        if (settings.currentBackground) {
            setMapBackground(settings.currentBackground, settings.gridSettings.mapBackgroundSize);
        }
        if (settings.transparentWindow) {
            document.querySelector(".maptool_body").style.backgroundImage = null;
        } else if (settings.map_edge_style) {
            document.querySelector(".maptool_body").style.backgroundImage = "url('" + settings.map_edge_style + "')";
        }
        if (!partyArray)
            loadParty();
        onSettingsLoaded();
    });
}

function saveSettings() {
    dataAccess.getSettings(function (data) {
        data.maptool = settings;
        dataAccess.saveSettings(data);

    });
}

function setBackgroundFilter() {
    var filterDd = document.getElementById("filter_tool");
    filterValue = filterDd.options[filterDd.selectedIndex].value;
    if (filterValue == "none") {
        filtered = false;
        filterDd.classList.remove("toggle_button_toggled");
    } else {
        filtered = true;
        filterDd.classList.add("toggle_button_toggled");
    }

    if (fovLighting.viewerHasDarkvision() && settings.applyDarkvisionFilter) {
        filterValue = "grayscale(80%)";
    }
    $("#map_layer_container").css("filter", filterValue);

    settings.currentFilter = filterDd.selectedIndex;
    saveSettings();

}
function switchActiveViewer() {
    fovLighting.toggleDarkvision();
    refreshFogOfWar();
    setBackgroundFilter();

}

function switchMapLighting(index) {
    window.setTimeout(function () {
        var isLowLight = document.getElementById("map_lowlight_button").getAttribute("toggled") === "true";
        var isDarkness = document.getElementById("map_darkness_button").getAttribute("toggled") === "true";

        if (isLowLight) {
            fovLighting.setFogStyle(fovLighting.MapFogType.LowLight);
        } else if (isDarkness) {
            fovLighting.setFogStyle(fovLighting.MapFogType.Dark);
        } else {
            fovLighting.setFogStyle(fovLighting.MapFogType.None);
        }
        var visibilityLayerEnabled = document.getElementById("visiblity_tool").getAttribute("toggled") == "true";
        if (visibilityLayerEnabled) document.getElementById("visiblity_tool").click();
        refreshFogOfWar();
    }, 200);

}


function toggleVisibilityLayer() {
    var visibilityLayerEnabled = document.getElementById("visiblity_tool").getAttribute("toggled");

    turnAllToolboxButtonsOff();
    if (visibilityLayerEnabled == "false") {
        fovLighting.setVisibilityLayerVisible(true);
        visibilityLayerVisible = true;
        document.getElementById("line_tool").classList.add("hidden");
        document.getElementById("cone_tool").classList.add("hidden");
        document.getElementById("sphere_tool").classList.add("hidden");
        document.getElementById("cube_tool").classList.add("hidden");
        document.getElementById("rect_tool").classList.add("hidden");
        document.getElementById("sphere_fov_tool").classList.add("hidden");

        var visToolbox = [...document.getElementsByClassName("visibility_toolbox")];
        visToolbox.forEach((ele) => ele.classList.remove("hidden"));

        //Hide light effects that are in the normal layer
        var effectsToHide = [...document.getElementsByClassName("light_source_normal_layer")]
        effectsToHide.forEach((effect) => effect.classList.add("hidden"));

        var effectsToShow = [...document.getElementsByClassName("light_source_visibility_layer")]
        effectsToShow.forEach((effect) => effect.classList.remove("hidden"));

        if (fogOfWarEnabled)
            fogOfWarEnabled = false;
    } else {
        fovLighting.setVisibilityLayerVisible(false);
        visibilityLayerVisible = false;
        $("#map_layer_container").css("filter", lastBackgroundFilter);
        var visToolbox = [...document.getElementsByClassName("visibility_toolbox")];
        visToolbox.forEach((ele) => ele.classList.remove("hidden"));
        document.getElementById("line_tool").classList.remove("hidden");
        document.getElementById("cone_tool").classList.remove("hidden");
        document.getElementById("sphere_tool").classList.remove("hidden");
        document.getElementById("cube_tool").classList.remove("hidden");
        document.getElementById("rect_tool").classList.remove("hidden");
        document.getElementById("sphere_fov_tool").classList.remove("hidden");

        var visToolbox = [...document.getElementsByClassName("visibility_toolbox")];
        visToolbox.forEach((ele) => ele.classList.add("hidden"));

        //Hide light effects that are in the visibility layer
        var effectsToHide = [...document.getElementsByClassName("light_source_visibility_layer")]
        effectsToHide.forEach((effect) => effect.classList.add("hidden"));

        var effectsToShow = [...document.getElementsByClassName("light_source_normal_layer")]
        effectsToShow.forEach((effect) => effect.classList.remove("hidden"));
        fogOfWarEnabled = true;
    }
    fovLighting.drawSegments();
    refreshFogOfWar();
}

function setTool(source, toolIndex) {

    for (var i = 0; i < toolbox.length; i++) {
        toolbox[i] = false;
    }
    if (source.getAttribute("toggled") === "false") {
        gridLayer.onmousedown = measurements.startMeasuring;
        toolbox[toolIndex] = true;
        gridLayer.style.cursor = "crosshair";
        tooltip.classList.add("hidden");
        document.onmousemove = null;
        document.onmouseup = null;
        measurementTargetOrigin = null;
        measurementTargetDestination = null;
        measurementPaused = false;
        measurements.clearMeasurements();
        if (toolIndex != 0) {
            gridLayer.style.zIndex = 5;
        }
    } else {
        gridLayer.style.cursor = "auto";
    }
}
var toolbox = [false, false, false, false, false];

function refreshPawns() {
    pawns.small = $(".pawn_small");
    pawns.medium = $(".pawn_medium");
    pawns.large = $(".pawn_large");
    pawns.huge = $(".pawn_huge");
    pawns.gargantuan = $(".pawn_gargantuan");
    pawns.colossal = $(".pawn_colossal");
    pawns.all = $(".pawn");

}

function refreshPawnToolTips() {
    refreshPawnToolTipsHelper(pawns.players);
    if (loadedMonsters == null) return;
    refreshPawnToolTipsHelper(loadedMonsters);
}

function refreshPawnToolTipsHelper(arr, monster) {
    for (var i = 0; i < arr.length; i++) {
        element = arr[i][0];
        var changed = element.getAttribute("data-state_changed");
        if (changed) {

            flyingHeight = parseInt(element.flying_height);
            element.title = arr[i][1];
            if (flyingHeight != 0) element.title += "\n Flying: " + flyingHeight + " ft"
            if (element.dead == "true") {

                element.get().title += "\n Dead/Unconscious"
                element.get().classList.add("pawn_dead");
            } else {

                element.get().classList.remove("pawn_dead");
            }
            element.setAttribute("data-state_changed", null);
        }

    }
}

function onPawnsMoved() {
    updateHowlerListenerLocation();
}

// #region commands
function notifySelectedPawnsChanged() {
    let mainWindow = remote.getGlobal('mainWindow');

    if (mainWindow) mainWindow.webContents.send('notify-maptool-selection-changed',
        { selected: selectedPawns.filter(x => x.index_in_main_window).map(x => x.index_in_main_window) });

    updateHowlerListenerLocation();
}


function notifyTokenAdded(tokenIndex, name) {
    let mainWindow = remote.getGlobal('mainWindow');
    if (mainWindow) mainWindow.webContents.send('notify-token-added-in-maptool', [tokenIndex, name]);
}

function requestNotifyUpdateFromMain() {
    let mainWindow = remote.getGlobal('mainWindow');
    if (mainWindow) mainWindow.webContents.send('update-all-pawns');
}


ipcRenderer.on("load-map", function (evt, arg) {
    if (!initialLoadComplete) {
        pendingMapLoad = arg;
    } else {
        saveManager.loadMapFromPath(arg);
    }
});
ipcRenderer.on("intiative-updated",
    function (evt, arg) {

        if (arg.order) {
            arg.order.forEach(x => {
                if (!x.isPlayer)
                    x.name = "???";
            });
            return initiative.setOrder(arg.order);
        }
        if (arg.round_increment) {

            initiative.setRoundCounter(arg.round_increment);
            var curr = initiative.currentActor();
            Util.showDisappearingTitleAndSubtitle(curr.current.name, `Next up: ${curr.next}`, curr.current.color);
            return;
        }
        if (arg.empty) return initiative.empty();
    })
ipcRenderer.on('notify-party-array-updated', function (evt, arg) {
    loadParty();
});
ipcRenderer.on('notify-effects-changed', function (evt, arg) {
    effectManager.createEffectMenus();
});

ipcRenderer.on("notify-main-reloaded", function () {
    pawns.players.forEach(pawn => raiseConditionsChanged(pawn[0]))

});

ipcRenderer.on('condition-list-changed', function (evt, arg) {

    var pawn = arg.isPlayer ? pawns.players.find(x => x[1] == arg.index)[0]
        : [...document.querySelectorAll(".pawn_numbered")].filter(pw => pw.index_in_main_window == arg.index)[0];

    if (pawn) {
        removeAllPawnConditions(pawn, true);
        arg.conditions.forEach(cond => setPawnCondition(pawn, conditionList.filter(x => x.name.toLowerCase() == cond.toLowerCase())[0], true))
    }
});


ipcRenderer.on('monster-health-changed', function (evt, arg) {
    var index = parseInt(arg.index);

    var pawn = null;
    for (var i = 0; i < loadedMonstersFromMain.length; i++) {

        if (loadedMonstersFromMain[i].index_in_main_window == index) {
            pawn = loadedMonstersFromMain[i];
            break;
        }
    }
    if (!pawn) return;
    var woundEle = pawn.querySelector(".token_status");
    constants.creatureWounds.forEach(woundType => woundEle.classList.remove(woundType.className));
    var woundType = constants.creatureWounds.find(x => arg.healthPercentage < x.percentage);

    if (woundType) {
        woundEle.classList.add(woundType.className);

    }

    if (arg.dead) {
        pawn.dead = "true";
    } else {
        pawn.dead = "false";
    }
    pawn.setAttribute("data-state_changed", 1);
    refreshPawnToolTips();


});

ipcRenderer.on('notify-map-tool-mob-changed', function (evt, arg) {
    var list = JSON.parse(arg);

    list.forEach(param => {
        var pawn = loadedMonstersFromMain.find(x => x.index_in_main_window == param.rowIndex);
        if (!pawn) return;
        pawn.setAttribute("data-mob_size", param.remaining);

        pawn.setAttribute("data-mob_dead_count", parseInt(param.dead));
        refreshMobBackgroundImages(pawn);
        resizePawns();
    });

})

ipcRenderer.on('settings-changed', function (evt, arg) {
    console.log("Settings changed, applying...");

    dataAccess.getSettings(function (data) {
        settings = data.maptool;
        resizeAndDrawGrid();
    });
});

ipcRenderer.on('monster-list-cleared', function (evt, arg) {

    loadedMonstersFromMain.forEach(function (element) {
        if (element.getAttribute("data-mob_size") != null)
            return;

        element.index_in_main_window = "";
        element.classList.remove("pawn_numbered");
    });
    loadedMonstersFromMain = [];
});


ipcRenderer.on("next-player-round", function (evt, params) {

    var player = params.player;
    var forcedPerpspectiveDD = document.getElementById("fov_perspective_dropdown");
    if (forcedPerpspectiveDD.selectedIndex == 1) return; //all players
    if (player != null) {
        for (var i = 0; i < forcedPerpspectiveDD.options.length; i++) {
            if (forcedPerpspectiveDD.options[i].value == player) {
                forcedPerpspectiveDD.selectedIndex = i;
                break;
            }
        }

    } else {
        forcedPerpspectiveDD.selectedIndex = 0;
    }

    onPerspectiveChanged();

});

function onPerspectiveChanged() {
    fovLighting.setPerspective();
    updateHowlerListenerLocation();
}
ipcRenderer.on("notify-map-tool-monsters-loaded", function (evt, arg) {
    console.log("Loading monsters")
    remote.getCurrentWindow().focus();
    var monsterArray = JSON.parse(arg);

    var counterArray = [];
    var inArray = false, indexInArray = 0;;
    monsterArray.forEach(function (element) {
        for (var i = 0; i < counterArray.length; i++) {
            if (counterArray[i][0] == element.name) {
                inArray = true;
                indexInArray = i;
                break;
            }
        }
        if (inArray) {
            counterArray[indexInArray][1]++;
        } else {
            counterArray.push([element.name, 1]);
        }
        inArray = false;
    });
    counterArray.sort(function (a, b) {
        return b[1] - a[1];
    });


    var color;

    for (var i = monsterArray.length - 1; i >= 0; i--) {
        for (var j = 0; j < counterArray.length; j++) {
            if (counterArray[j][0] == monsterArray[i].name) {
                color = monsterColorPalette[j];
                if (color == null) color = 'rgba(255,255,255,0.45)';
            }
        }
        var newMonster = {
            color: settings.colorTokenBases ? color : "rgba(100,100,100,0)",
            name: monsterArray[i].name,
            size: monsterArray[i].size,
            indexInMain: monsterArray[i].index,
            monsterId: monsterArray[i].monsterId,
            isMob: monsterArray[i].isMob == true,
            mobCountDead: 0,
            mobSize: monsterArray[i].mobSize
        }

        pawns.addQueue.push(newMonster)
    }
    document.getElementById("add_pawn_from_tool_toolbar").classList.remove("hidden");


});

function suspendAllAnimations() {
    $(".pawn, .sfx_effect, .light_effect").addClass("animation_paused");
}

function resumeAllAnimations() {
    $(".pawn, .sfx_effect, .light_effect").removeClass("animation_paused");
}



function reloadMap() {
    if (pawns.all.length > pawns.players.length && !window.confirm("Do you wish to reload the window?"))
        return;
    location.reload();
}
document.addEventListener("DOMContentLoaded", function () {

    backgroundLoop = new SlideCanvas(document.getElementById("background"));
    overlayLoop = new SlideCanvas(document.getElementById("overlay"));
    var mapContainer = document.querySelector("#map_layer_container");
    var overlayContainer = document.querySelector("#overlay_layer_container");
    mapContainers = [mapContainer, overlayContainer];
    backgroundCanvas = document.querySelector("#background");
    foregroundCanvas = document.querySelector("#foreground");
    overlayCanvas = document.querySelector("#overlay");

    mapContainers.forEach(container => {
        container.data_bg_scale = 1;
        container.data_transform_x = 0;
        container.data_transform_y = 0;
    });

    foregroundCanvas.data_transform_x = 0;
    foregroundCanvas.data_transform_y = 0;
    loadSettings();
    updateHowlerListenerLocation();
    let window2 = remote.getGlobal('mainWindow');
    if (window2) window2.webContents.send('maptool-initialized');
    var bgSize = parseInt($("#foreground").css("background-size"));
    var slider = document.getElementById("foreground_size_slider");
    slider.value = bgSize;

    //Drag drop
    document.addEventListener('drop', (event) => {
        event.preventDefault();
        event.stopPropagation();
        console.log(event.dataTransfer.files)
        if (event.dataTransfer.files?.length > 0) {
            var f = event.dataTransfer.files[0];
            console.log('File Path of dragged files: ', f.path)
            var path = f.path;
            var extension = pathModule.extname(path).replaceAll(".", "");
            console.log(extension);
            if (saveManager.supportedMapTypes().includes(extension))
                saveManager.loadMapFromPath(path);

        }

    });
    document.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });


    document.addEventListener("visibilitychange", function () {
        if (document.hidden) {
            suspendAllAnimations();
        } else {
            resumeAllAnimations();
        }
    }, false);

    $("#background_color_button_add_pawn").spectrum({
        preferredFormat: "rgb",
        allowEmpty: false,
        showAlpha: true,
        showInput: true
    });
    $("#background_color_button_change_pawn").spectrum({
        preferredFormat: "rgb",
        allowEmpty: false,
        showAlpha: true,
        showInput: true,
        chooseText: "Set as base",
        cancelText: "Cancel",
        change: pawnBgColorChosen
    });

    function pawnBgColorChosen(color) {
        newColor = color;
        selectedPawns.forEach(element => element.style.backgroundColor = newColor);
    }

    document.getElementById("icon_load_button_add_pawn").onclick = async function () {
        var info = { name: document.getElementById("add_pawn_name").value }
        await tokenSelector.getNewTokenPaths(true, imagePaths => {
            if (imagePaths == null) return;
            addPawnImagePaths = imagePaths;

        }, info);

    }


    dataAccess.getConditions(function (data) {

        data.sort(function (a, b) {
            if (a.name < b.name) return -1;
            if (b.name < a.name) return 1;
            return 0;
        });
        conditionList = data;
        var parentNode = document.getElementById("conditions_menu");
        var newButton = document.createElement("button");
        newButton.classList.add("button_style");
        newButton.onclick = removeAllConditionsHandler;
        newButton.innerHTML = "Clear all";
        parentNode.appendChild(newButton);
        var input = parentNode.querySelector(".conditions_menu_input");
        var list = conditionList.map(x => x.name).sort();
        new Awesomplete(input, { list: list, autoFirst: true, minChars: 0, maxItems: 25 })
        input.addEventListener('awesomplete-selectcomplete', function (e) {
            var condition = e.text.value;
            input.value = "";

            var condition = conditionList.find(c => c.name == condition);
            createConditionButton(condition.name)
            selectedPawns.forEach(function (pawn) {
                setPawnCondition(pawn, condition);
                raiseConditionsChanged(pawn);
            });
        });

    });


    populateSizeDropdown();
    function populateSizeDropdown() {
        var parent = document.getElementById("add_pawn_size");
        var count = 0;
        creaturePossibleSizes.sizes.forEach(size => {
            var newOption = document.createElement("option");
            newOption.setAttribute("value", count);
            if (size == "medium") newOption.setAttribute("selected", true)
            newOption.innerHTML = size;
            count++;
            parent.appendChild(newOption);
        })
    }
});

function centerForegroundOnBackground() {

    var bgRect = backgroundCanvas.getBoundingClientRect();
    var foregroundRect = foregroundCanvas.getBoundingClientRect();
    var mapContainer = mapContainers[0];
    var middleX = (bgRect.width / mapContainer.data_bg_scale) / 2;
    var middleY = (bgRect.height / mapContainer.data_bg_scale) / 2;

    var newX = middleX - (foregroundRect.width / 2) / mapContainer.data_bg_scale;
    var newY = middleY - (foregroundRect.height / 2) / mapContainer.data_bg_scale;
    moveForeground(newX, newY);
}

function moveForeground(x, y) {
    var oldRect = foregroundCanvas.getBoundingClientRect();
    foregroundCanvas.data_transform_x = x;
    foregroundCanvas.data_transform_y = y;
    foregroundCanvas.style.transform = `translate(${x}px, ${y}px)`
    var newRect = foregroundCanvas.getBoundingClientRect();
    gridMoveOffsetX += newRect.x - oldRect.x;
    gridMoveOffsetY += newRect.y - oldRect.y;
}

function moveMap(x, y) {
    mapContainers.forEach(container => {
        container.data_transform_x = x;
        container.data_transform_y = y;
        container.style.setProperty("--bg-translate-x", x);
        container.style.setProperty("--bg-translate-y", y);
    });


}

var currentListenerPawn;
function updateHowlerListenerLocation() {
    var forcedPerpspectiveDD = document.getElementById("fov_perspective_dropdown");
    var currentPerspective = forcedPerpspectiveDD.options[forcedPerpspectiveDD.selectedIndex].value;
    var player = pawns.players.find(x => x[1] == currentPerspective);
    if (player) {
        currentListenerPawn = player[0];
        soundManager.setListenerCords(parseFloat(currentListenerPawn.style.left), parseFloat(currentListenerPawn.style.top), null);
    }
    else if (selectedPawns.length > 0) {
        currentListenerPawn = selectedPawns[0];
        soundManager.setListenerCords(parseFloat(currentListenerPawn.style.left), parseFloat(currentListenerPawn.style.top), null);
    } else {
        currentListenerPawn = null;
        soundManager.setListenerCords(window.innerWidth / 2, window.innerHeight / 2, null);
    }
}

function resetEverything() {
    if (currentlyDeletingSegments)
        document.getElementById("delete_segments_button").click();
    clearSelectedPawns();
    hideAllTooltips();
    effectManager.close();
    if (document.getElementById("move_effects_button").getAttribute("toggled") != "false")
        document.getElementById("move_effects_button").click();
    gridLayer.onmousedown = generalMousedowngridLayer;
    gridLayer.style.cursor = "auto";
    return turnAllToolboxButtonsOff();
}

function onSettingsLoaded() {
    refreshPawns();
    window.onresize = function () {
        window.requestAnimationFrame(resizeAndDrawGrid);
        updateHowlerListenerLocation();
    }
    console.log("Settings loaded");
    resizeForeground(settings.defaultMapSize ? settings.defaultMapSize : settings.gridSettings.mapSize ? settings.gridSettings.mapSize : window.innerWidth);
    setupGridLayer();
    resizeAndDrawGrid();
    refreshFogOfWar();
    Menu.initialize();

    effectManager.initialize();

    document.querySelector("body").onkeydown = function (event) {
        var keyIndex = [37, 38, 39, 40, 65, 87, 68, 83].indexOf(event.keyCode);

        var lastKey = LAST_KEY;
        LAST_KEY = event.key;
        window.clearTimeout(lastKeyNull)
        lastKeyNull = window.setTimeout(() => LAST_KEY = "", 1000);
        console.log(lastKey, event.key, currentlyDeletingSegments)
        if (event.key === "Escape") {
            return resetEverything;
            //Show global listener position
        } else if (event.key.toLowerCase() == "p" && lastKey.toLowerCase() == "l") {
            return soundManager.displayGlobalListenerPosition();
        } else if (event.key.toLowerCase() == "e" && lastKey.toLowerCase() == "d") {
            if (currentlyDeletingSegments) return;
            document.getElementById("delete_segments_button").click();
        } else if (event.ctrlKey && event.key.toLowerCase() == "s") {
            return saveManager.saveCurrentMap();
        } else if (event.ctrlKey && event.key.toLowerCase() == "o") {
            return saveManager.loadMapDialog();
        } else if (keyIndex < 0 || (keyIndex > 3 && pauseAlternativeKeyboardMoveMap)) {
            return;
        }
        window.clearInterval(resetMoveIncrementTimer);
        resetMoveIncrementTimer = window.setTimeout(function () {
            canvasMoveRate = 2;
        }, 600)

        var container = mapContainers[0];
        var bgX = container.data_transform_x;
        var bgY = container.data_transform_y;

        if (event.shiftKey) {
            bgX = foregroundCanvas.data_transform_x;
            bgY = foregroundCanvas.data_transform_y;
            if (event.keyCode == 37) {
                bgX -= canvasMoveRate;
            } else if (event.keyCode == 39) {
                bgX += canvasMoveRate;
            } else if (event.keyCode == 38) {
                bgY -= canvasMoveRate;
            } else if (event.keyCode == 40) {
                bgY += canvasMoveRate;
            }

            moveForeground(bgX, bgY)

            if (canvasMoveRate < 80) canvasMoveRate++;
            return;
        }
        //left
        var movementX = 0, movementY = 0;
        if (event.keyCode == 37 || event.keyCode == 65) {
            movementX = canvasMoveRate;
            //right
        } else if (event.keyCode == 39 || event.keyCode == 68) {
            movementX = -1 * canvasMoveRate;
            //up
        } else if (event.keyCode == 38 || event.keyCode == 87) {
            movementY = canvasMoveRate;

            //down
        } else if (event.keyCode == 40 || event.keyCode == 83) {
            movementY = -1 * canvasMoveRate;

        }
        if (canvasMoveRate < 80) canvasMoveRate++;

        bgY += movementY;
        bgX += movementX;
        gridMoveOffsetY += movementY;
        gridMoveOffsetX += movementX;

        moveMap(bgX, bgY);
        drawGrid();
        nudgePawns(movementX, movementY)

        fovLighting.nudgeSegments(movementX, movementY);
        fovLighting.drawSegments();
        window.requestAnimationFrame(refreshFogOfWar);

    }

    gridLayer.onwheel = function (event) {
        event.preventDefault();
        if (event.ctrlKey && previewPlacementElement) {
            effectManager.onPreviewPlacementResized(event);

        } else if (!event.shiftKey) {
            var dir = event.deltaY > 0 ? -0.1 : 0.1;

            zoomIntoMap(event, dir);

        }
    };

    gridLayer.onmousedown = generalMousedowngridLayer;

    document.getElementById("clear_foreground_button").onclick = function (e) {
        setMapForeground(null);
        settings.currentMap = null;
        settings.gridSettings.mapSize = null;
        saveSettings();
    };


    var iconLoadButtons = [...document.querySelectorAll(".icon_load_button")];
    iconLoadButtons.forEach(button => {
        button.onclick = setTokenImageHandler;
    })
    document.getElementById("next_facet_button").onclick = setTokenNextFacetHandler;

    initialLoadComplete = true;
    if (pendingMapLoad) {
        saveManager.loadMapFromPath(pendingMapLoad);
        pendingMapLoad = null;
    }
}

function getMapImageFromDialog() {
    return dialog.showOpenDialogSync(remote.getCurrentWindow(), {
        properties: ['openFile'],
        message: "Choose map",
        filters: [{ name: 'Images', extensions: constants.imgFilters }]
    })[0].replace(/\\/g, "/");
}

function getBackgroundFromFile(e) {
    var path = getMapImageFromDialog();
    if (path) {
        setMapBackground(path, settings.defaultMapSize);
    }
};

function getOverlayFromFile(e) {
    var path = getMapImageFromDialog();
    if (path) {
        setMapOverlay(path, settings.defaultMapSize);
    }
}

function getForegroundFromFile(e) {
    var path = getMapImageFromDialog();
    if (path) {
        setMapForeground(path, settings.defaultMapSize);
        settings.currentMap = path;
        settings.gridSettings.mapSize = null;
        saveSettings();
    }
};

function setMapBackground(path, width) {
    var btn = document.getElementById("background_button");
    settings.currentBackground = path;
    if (!path) {
        backgroundCanvas.style.backgroundImage = 'none';
        btn.innerHTML = "Image";
        return;
    }
    if (settings.matchSizeWithFileName) {
        width = getMapWidthFromFileName(path, width);
    }
    btn.innerHTML = pathModule.basename(path);
    backgroundCanvas.style.backgroundImage = 'url("' + path + '")';
    var img = new Image();
    settings.gridSettings.mapBackgroundSize = width;
    img.onload = function () {
        backgroundCanvas.heightToWidthRatio = img.height / img.width;
        resizeBackground(width ? width : img.width);
    }
    img.src = path;
}

function setMapOverlay(path, width) {
    var btn = document.getElementById("overlay_button");
    settings.currentOverlay = path;
    if (!path) {
        overlayCanvas.style.backgroundImage = 'none';
        btn.innerHTML = "Image";
        return;
    }
    if (settings.matchSizeWithFileName) {
        width = getMapWidthFromFileName(path, width);
    }
    btn.innerHTML = pathModule.basename(path);
    overlayCanvas.style.backgroundImage = 'url("' + path + '")';
    var img = new Image();
    settings.gridSettings.mapOverlaySize = width;
    img.onload = function () {
        overlayCanvas.heightToWidthRatio = img.height / img.width;
        resizeOverlay(width ? width : img.width);
    }
    img.src = path;
}

function getMapWidthFromFileName(path, width) {
    var basename = pathModule.basename(path);
    var idx = basename.lastIndexOf("[");
    var idx2 = basename.indexOf("]", idx);

    if (idx < 0 || idx2 < 0) return width;
    var str = basename.substring(idx, idx2);
    str = str.replace("[", "").replace("]", "");
    var whArr = str.split("x");
    return parseInt(whArr[0]) * cellSize || width;

}

function setMapForeground(path, width) {
    var btn = document.getElementById("foreground_button");
    if (!path) {
        foregroundCanvas.style.backgroundImage = 'none';
        btn.innerHTML = "Image";
        return;
    }

    foregroundCanvas.style.backgroundImage = 'url("' + path + '")';
    btn.innerHTML = pathModule.basename(path);
    var img = new Image();
    if (settings.matchSizeWithFileName) {
        width = getMapWidthFromFileName(path, width);
    }
    img.onload = function () {
        foregroundCanvas.heightToWidthRatio = img.height / img.width;

        var mapWidth = width ? width : img.width;
        var imgWidthToOldWidth = width ? mapWidth / img.width : 1;
        var height = img.height * imgWidthToOldWidth;

        foregroundCanvas.setAttribute("data-original_height", height);
        foregroundCanvas.setAttribute("data-original_width", mapWidth);

        foregroundCanvas.style.width = mapWidth + "px";
        foregroundCanvas.style.height = height + "px";
        document.getElementById("foreground_size_slider").value = mapWidth;
    }
    img.src = path;
    settings.currentMap = path;
}
var saveTimer;
function toggleSaveTimer() {
    clearTimeout(saveTimer);
    saveTimer = window.setTimeout(
        function () {
            settings.gridSettings = {}
            settings.gridSettings.cellSize = cellSize;
            settings.gridSettings.mapSize = parseFloat($("#foreground").css("width"));
            settings.gridSettings.mapBackgroundSize = parseFloat($("#background").css("width"));
            settings.gridSettings.mapOverlaySize = parseFloat($("#overlay").css("width"));
            saveSettings();
        }, 7000
    );
}

/***
 * Resizes map only
 */

function resizeForeground(newWidth) {
    var oldRect = foregroundCanvas.getBoundingClientRect();
    foregroundCanvas.style.width = newWidth + "px";
    foregroundCanvas.style.height = newWidth * foregroundCanvas.heightToWidthRatio + "px";

    document.getElementById("foreground_size_slider").value = newWidth;
    settings.gridSettings.mapSize = newWidth;
    var newRect = foregroundCanvas.getBoundingClientRect();
    console.log(oldRect.width, newRect.width)
    // fovLighting.resizeSegmentsFromMapSizeChanged(oldRect.width, oldRect.height, newRect.width, newRect.height);
    fovLighting.drawSegments();
}

function resizeBackground(newWidth) {
    backgroundCanvas.style.width = newWidth + "px";
    backgroundCanvas.style.height = newWidth * backgroundCanvas.heightToWidthRatio + "px";
    (document.getElementById("background_size_slider") || {}).value = newWidth;
    toggleSaveTimer();
}

function resizeOverlay(newWidth) {
    overlayCanvas.style.width = newWidth + "px";
    overlayCanvas.style.height = newWidth * overlayCanvas.heightToWidthRatio + "px";
    (document.getElementById("overlay_size_slider") || {}).value = newWidth;
    toggleSaveTimer();
}

function resetZoom() {
    var currentScale = mapContainers[0].data_bg_scale;
    var resizeAmount = (10 - currentScale * 10) / 10;
    zoomIntoMap({ x: 0, y: 0 }, resizeAmount);
}

var MAP_RESIZE_BUFFER = 0, LAST_MAP_RESIZE, onZoomCallback;
/***
 * Resizes map and other objects
 */
function zoomIntoMap(event, resizeAmount, onZoomed) {

    if (onZoomed)
        onZoomCallback = onZoomed;
    window.requestAnimationFrame(function (ts) {

        if (ts == LAST_MAP_RESIZE) {
            MAP_RESIZE_BUFFER += resizeAmount;
            return;
        }

        resizeAmount += MAP_RESIZE_BUFFER;
        MAP_RESIZE_BUFFER = 0;
        LAST_MAP_RESIZE = ts;

        var oldRect = foregroundCanvas.getBoundingClientRect();

        var backgroundSizeBeforeResize = mapContainers[0].data_bg_scale;
        var newSize = backgroundSizeBeforeResize + resizeAmount;

        if (newSize > MAX_BG_ZOOM) newSize = MAX_BG_ZOOM;
        if (newSize < MIN_BG_ZOOM) newSize = MIN_BG_ZOOM;
        mapContainers.forEach(container => {
            container.data_bg_scale = newSize;
            container.style.setProperty("--bg-scale", newSize);
        })

        soundManager.setListenerCords(null, null, (MAX_BG_ZOOM - newSize) * soundManager.multiplier());


        var newRect = foregroundCanvas.getBoundingClientRect();

        //Origin is top left
        var sizeRatioX = newRect.width / oldRect.width;
        var sizeRatioY = newRect.height / oldRect.height;


        var relativePositionX = event.x - oldRect.x;
        var relativePositionY = event.y - oldRect.y;

        var currentRelativePositionX = event.x - newRect.x;
        var currentRelativePositionY = event.y - newRect.y;

        var newXRelative = relativePositionX * sizeRatioX;
        var newYRelative = relativePositionY * sizeRatioY;


        var moveMapX = newXRelative - currentRelativePositionX;
        var moveMapY = newYRelative - currentRelativePositionY;

        var container = mapContainers[0]
        var bgX = container.data_transform_x;
        var bgY = container.data_transform_y;
        bgY -= moveMapY;
        bgX -= moveMapX;

        gridMoveOffsetX -= moveMapX;
        gridMoveOffsetY -= moveMapY;
        moveMap(bgX, bgY, moveMapX, moveMapY);

        newRect = foregroundCanvas.getBoundingClientRect();

        cellSize = originalCellSize * newSize;
        //Move pawns
        var cellsFromLeft, cellsFromTop;
        var backgroundOriginX = oldRect.left;
        var backgroundOriginY = oldRect.top;

        var newBackgroundOriginX = newRect.left;
        var newBackgroundOriginY = newRect.top;
        [pawns.all, effects].forEach(arr => {
            for (var i = 0; i < arr.length; i++) {
                var pawn = arr[i];
                var left = parseFloat(pawn.style.left);
                var top = parseFloat(pawn.style.top);

                cellsFromLeft = (left - backgroundOriginX)
                    / (originalCellSize * backgroundSizeBeforeResize);
                cellsFromTop = (top - backgroundOriginY)
                    / (originalCellSize * backgroundSizeBeforeResize);

                var x = (cellsFromLeft * cellSize + newBackgroundOriginX);
                var y = (cellsFromTop * cellSize + newBackgroundOriginY);
                pawn.style.top = y + "px";
                pawn.style.left = x + "px";
                if (pawn.sound) {
                    soundManager.adjustPlacement(pawn.id, x, y);
                }
            }
        });
        updateHowlerListenerLocation();
        resizeAndDrawGrid(null, event);
        fovLighting.resizeSegments({ x: backgroundOriginX, y: backgroundOriginY }, { x: newBackgroundOriginX, y: newBackgroundOriginY }, backgroundSizeBeforeResize);
        fovLighting.drawFogOfWar();
        if (onZoomCallback) {
            onZoomCallback();
            onZoomCallback = null;
        }
    });
}


function generalMousedowngridLayer(event) {


    if (event.button == 2) {
        clearSelectedPawns();
        showPopupMenuGeneral(event.x, event.y);
    } else if (event.button == 0) {
        clearSelectedPawns();
        if (event.ctrlKey) {
            clearSelectedPawns();
            startSelectingPawns(event);
        } else {
            startMovingMap(event);
        }

    } else if (event.button == 1) {
        startMovingMap(event);
    }
}

var GLOBAL_MOUSE_DOWN = false;
function recordMouseDown() {
    document.addEventListener("mousedown", function (e) {
        if (e.button == 1)
            GLOBAL_MOUSE_DOWN = true;
    })

    document.addEventListener("mouseup", function (e) {
        GLOBAL_MOUSE_DOWN = false;
    })
}

var GLOBAL_MOUSE_POSITION;
function recordMouseMove() {
    document.addEventListener("mousemove", recordMouse);
}
function recordMouse(e) {
    GLOBAL_MOUSE_POSITION = { x: e.x, y: e.y };
    if (GLOBAL_MOUSE_DOWN) {
        fovLighting.attemptToDeleteSegment({ x: GLOBAL_MOUSE_POSITION.x, y: GLOBAL_MOUSE_POSITION.y });
    }
}

function drawSegmentsOnMouseMove() {
    document.addEventListener("mousemove", fovLighting.drawSegments)
}



var currentlyDeletingSegments = false;
var lastgridLayerCursor;
function toggleDeleteSegments() {
    turnAllToolboxButtonsOff();

    gridLayer.style.cursor = "not-allowed";
    currentlyDeletingSegments = !currentlyDeletingSegments;
    if (currentlyDeletingSegments) {
        recordMouseMove();
        drawSegmentsOnMouseMove();
        gridLayer.onmousedown = function (event) {
            if (event.button == 2) {
                var bn = document.getElementById("delete_segments_button")
                bn.click();
                return;
            }

            fovLighting.attemptToDeleteSegment({ x: event.clientX, y: event.clientY });
            refreshFogOfWar();
        };
    } else {
        gridLayer.onmousedown = generalMousedowngridLayer;
        gridLayer.style.cursor = "auto";
        document.removeEventListener("mousemove", recordMouse, false);
        document.removeEventListener("mousemove", fovLighting.drawSegments, false);
    }

}

function turnAllToolboxButtonsOff() {
    var toggleButtons = document.querySelectorAll(".toolbox_button");
    for (var i = 0; i < toggleButtons.length; i++) {
        if (toggleButtons[i].getAttribute("toggled") == "true") {
            toggleButtons[i].click();
        }
    }
    gridLayer.onmousedown = generalMousedowngridLayer;
    currentlyMeasuring = false;
    gridLayer.style.zIndex = 4;
    stopMeasuring(null, true);
}
var measurementTargetOrigin = null, measurementTargetDestination = null;
var measurementOriginPosition;
var currentlyMeasuring = false;
var measurementPaused = false;

function snapPawnToGrid(elmnt) {

    var positionOnTranslatedGrid = {
        x: Math.round((elmnt.offsetLeft - gridMoveOffsetX) / cellSize) * cellSize,
        y: Math.round((elmnt.offsetTop - gridMoveOffsetY) / cellSize) * cellSize
    }
    var oldLeft = parseFloat(elmnt.style.left);
    var oldTop = parseFloat(elmnt.style.top);
    var diffX = oldLeft - (positionOnTranslatedGrid.x + gridMoveOffsetX);
    var diffY = oldTop - (positionOnTranslatedGrid.y + gridMoveOffsetY);
    elmnt.style.left = positionOnTranslatedGrid.x + gridMoveOffsetX + "px";
    elmnt.style.top = positionOnTranslatedGrid.y + gridMoveOffsetY + "px";
    if (elmnt.attached_objects)
        elmnt.attached_objects.forEach(obj => {
            var currX = parseFloat(obj.style.left);
            var currY = parseFloat(obj.style.top);
            currX -= diffX;
            currY -= diffY;
            obj.style.left = currX + "px";
            obj.style.top = currY + "px";
        });
}

function refreshMeasurementTooltip() {
    var tooltip = document.getElementById("tooltip");
    if (tooltip.classList.contains("hidden")) {
        return;
    }

    if (measurementTargetDestination != null && measurementTargetOrigin != null) {

        var destinationPoint = {
            x: parseInt(measurementTargetDestination.style.left),
            y: parseInt(measurementTargetDestination.style.top),
            z: cellSize / 5 * parseInt(measurementTargetDestination.flying_height)
        }
        var originPosition = {
            x: parseInt(measurementTargetOrigin.style.left),
            y: parseInt(measurementTargetOrigin.style.top),
            z: cellSize / 5 * parseInt(measurementTargetOrigin.flying_height)
        }

        tooltip.innerHTML = Math.round(
            Math.sqrt(
                Math.pow(destinationPoint.x - originPosition.x, 2) +
                Math.pow(destinationPoint.y - originPosition.y, 2) +
                Math.pow(destinationPoint.z - originPosition.z, 2)
            ) / cellSize * 5) + " ft";

    }

}
var lastMeasuredSphere, lastMeasuredCube, lastMeasuredCone;
var lastMeasuredLineDrawn, totalMeasuredDistance = 0;
function drawLineAndShowTooltip(originPosition, destinationPoint, event) {

    var measuredDistance = Math.round(
        Math.sqrt(
            Math.pow(destinationPoint.x - originPosition.x, 2) +
            Math.pow(destinationPoint.y - originPosition.y, 2) +
            Math.pow(destinationPoint.z - originPosition.z, 2)
        ) / cellSize * 5) + totalMeasuredDistance;


    if (lastMeasuredLineDrawn) {
        measurements.eraseModeOn();

        measurementsLayerContext.beginPath();
        measurementsLayerContext.moveTo(lastMeasuredLineDrawn.a.x, lastMeasuredLineDrawn.a.y);
        measurementsLayerContext.lineTo(lastMeasuredLineDrawn.b.x, lastMeasuredLineDrawn.b.y);
        measurementsLayerContext.stroke();
        measurements.eraseModeOff();
    } else {

        lastMeasuredLineDrawn = {};

    }
    measurementsLayerContext.beginPath();
    measurementsLayerContext.moveTo(originPosition.x, originPosition.y);
    measurementsLayerContext.lineTo(destinationPoint.x, destinationPoint.y);
    measurementsLayerContext.stroke();


    lastMeasuredLineDrawn.a = originPosition;
    lastMeasuredLineDrawn.b = destinationPoint;
    showToolTip(event, measuredDistance + " ft", "tooltip");
}

function showToolTip(event, text, tooltipId) {
    var tooltip = document.getElementById(tooltipId);

    tooltip.style.top = event.clientY - 50 + "px";;
    tooltip.style.left = event.clientX + "px";;
    tooltip.innerHTML = "0 ft";
    tooltip.innerHTML = text;
    tooltip.classList.remove("hidden");
}

function showMapSizeSlider(element) {
    var cont = document.getElementById("map_size_slider_container");
    cont.classList.contains("hidden") ? cont.classList.remove("hidden") : cont.classList.add("hidden")


}

function stopMeasuring(event, ignoreClick) {

    if (ignoreClick || event.button == 2) {
        if (measurementPaused && ignoreClick != null) {
            tooltip.classList.add("hidden");
            measurementPaused = false;
            return;
        } else if (segmentMeasurementPaused && ignoreClick != null) {
            segmentMeasurementPaused = false;
            lastMeasuredPoint = null;
            return;
        }

        if (document.onmousemove === null) {
            var toggleButtons = document.querySelectorAll(".toolbox_button");
            for (var i = 0; i < toggleButtons.length; i++) {
                if (toggleButtons[i].getAttribute("toggled") == "true") {
                    toggleButtons[i].click();
                }
            }
            document.onmousedown = null;
            gridLayer.onmousedown = generalMousedowngridLayer;
            currentlyMeasuring = false;
            currentlyAddingSegments = false;
            lastMeasuredPoint = null;
            gridLayer.style.zIndex = 4;
        }

        tooltip.classList.add("hidden");
        document.onmousemove = null;
        totalMeasuredDistance = 0;
        document.onmouseup = null;
        measurementTargetOrigin = null;
        measurementTargetDestination = null;
        measurementPaused = false;
        segmentMeasurementPaused = false;
        lastMeasuredPoint = null;
        measurements.clearMeasurements();
    } else if (event.button == 0 && visibilityLayerVisible && lastMeasuredPoint != null) {
        if (fovToolbox[0]) {

            fovLighting.addLineSegment(lastMeasuredPoint, { x: event.clientX, y: event.clientY });
        } else if (fovToolbox[1]) {
            fovLighting.addRectangleSegment(lastMeasuredPoint, { x: event.clientX, y: event.clientY });
        } else if (fovToolbox[2]) {
            fovLighting.addSphereSegment(lastMeasuredPoint, { x: event.clientX, y: event.clientY })
        }
        lastMeasuredPoint = { x: event.clientX, y: event.clientY }
    } else {
        if (event != null)
            lastMeasuredPoint = { x: event.clientX, y: event.clientY }
    }
}
function setLightSource(brightLight, dimLight, params) {
    selectedPawns.forEach(function (pawn) {
        if (params && params.darkvision) {
            pawn.sight_mode = "darkvision";
        } else {
            if (params && params.torch) {
                pawn.classList.add("light_source_torch")
            } else {
                pawn.classList.remove("light_source_torch")
            }
            pawn.sight_mode = "normal";

        }
        pawn.sight_radius_bright_light = brightLight;
        pawn.sight_radius_dim_light = dimLight;

        if (pawns.lightSources.indexOf(pawn) >= 0) {
            if (brightLight == 0 && dimLight == 0) {
                if (!isPlayerPawn(pawn))
                    pawns.lightSources.splice(pawns.lightSources.indexOf(pawn), 1);
            }
        } else {
            if (brightLight > 0 || dimLight > 0) {
                pawns.lightSources.push(pawn);
            }
        }

    })



    refreshFogOfWar();
}

function loadParty() {
    if (partyArray == null) partyArray = [];
    if (!settings.addPlayersAutomatically) return;
    dataAccess.getParty(function (data) {
        var newPartyArray = [];
        var alreadyInParty;
        data = data.members;
        for (var i = 0; i < data.length; i++) {
            if (data[i].active) {
                alreadyInParty = false;
                for (var j = 0; j < partyArray.length; j++) {
                    if (data[i].character_name == partyArray[j][0]) {
                        alreadyInParty = true;
                        break;
                    }
                }
                if (!alreadyInParty) {
                    newPartyArray.push(
                        {
                            name: data[i].character_name,
                            id: data[i].id,
                            size: "medium",
                            color: Util.hexToRGBA(data[i].color, 0.4),
                            bgPhoto: null,
                            darkVisionRadius: data[i].darkvision
                        }
                    );
                    partyArray.push([data[i].character_name, "medium"]);
                }

            }
        }


        generatePawns(newPartyArray, false);
        fillForcedPerspectiveDropDown();

    });
}

function fillForcedPerspectiveDropDown() {
    var dropDown = document.getElementById("fov_perspective_dropdown");
    console.log(dropDown.childNodes)
    while (dropDown.childNodes.length > 4) {
        dropDown.removeChild(dropDown.lastChild);
    }
    partyArray.forEach(function (array) {
        var option = document.createElement("option");
        option.setAttribute("value", array[0]);
        option.innerHTML = array[0];
        dropDown.appendChild(option);
    })

}


/**
 * 
 * @param {*} pawnArray [name , size] or name [name, size, color, bgphoto, indexInMain, darkVisionRadius]
 */
var lastIndexInsertedMonsters = 1;
var lastColorIndex = 0;
function generatePawns(pawnArray, monsters, optionalSpawnPoint) {
    var newPawn, lastPoint, rotate, sightRadiusBright, sightRadiusDim, sightMode;
    console.log("Generating ", pawnArray)
    if (monsters) {
        lastPoint = pawns.lastLocationMonsters;
        rotate = parseInt(settings.defaultMonsterTokenRotate);
    } else {
        lastPoint = pawns.lastLocationPlayers;
        rotate = parseInt(settings.defaultPlayerTokenRotate);
    }

    for (var i = 0; i < pawnArray.length; i++) {
        var pawn = pawnArray[i];
        newPawn = document.createElement("div");
        newPawn.classList.add("pawn");


        newPawn.title = pawn.name.substring(0, 1).toUpperCase() + pawn.name.substring(1);
        newPawn.dnd_name = pawn.name.substring(0, 1).toUpperCase() + pawn.name.substring(1);
        if (!monsters) {
            if (pawn.darkVisionRadius != "") {
                sightMode = "darkvision";
                sightRadiusBright = pawn.darkVisionRadius;
                sightRadiusDim = 0;

            } else {
                sightMode = "normal";
                sightRadiusBright = 0;
                sightRadiusDim = 0;
            }
            pawns.lightSources.push(newPawn);
            pawns.players.push([newPawn, pawn.name])
            if (settings.colorTokenBases) {
                newPawn.style.backgroundColor = pawn.color || colorPalette[lastColorIndex++];
            } else {
                newPawn.style.backgroundColor = "transparent";

            }
        } else {
            if (addingFromMainWindow) {
                var index = pawn.indexInMain ? pawn.indexInMain : lastIndexInsertedMonsters++;
                removeDuplicatePawnNumbers(index);
                newPawn.setAttribute("index_in_main_window", index);
                newPawn.index_in_main_window = index;
                newPawn.classList.add("pawn_numbered");

            }
            var id = newPawnId();
            newPawn.id = id;
            newPawn.get = () => document.getElementById(id);
            pawns.monsters.push(newPawn);
            loadedMonsters.push([newPawn, pawn.name]);

            newPawn.style.backgroundColor = pawn.color;
        }

        newPawn.dead = "false";
        newPawn.classList.add("pawn_" + pawn.size.toLowerCase());

        if (pawn.size.toLowerCase() == "small") {
            newPawn.classList.add("pawn_small");
        } else {
            newPawn.classList.add("pawn_" + pawn.size.toLowerCase());
        }

        var sizeIndex = creaturePossibleSizes.sizes.indexOf(pawn.size.toLowerCase());
        newPawn.dnd_hexes = creaturePossibleSizes.hexes[sizeIndex];
        newPawn.attached_objects = [];
        newPawn.dnd_size = creaturePossibleSizes.sizes[sizeIndex];
        if (newPawn.dnd_hexes <= 0) newPawn.dnd_hexes = 1;

        if (pawn.isMob) {
            newPawn.setAttribute("data-mob_size", pawn.mobSize);
            newPawn.setAttribute("data-mob_dead_count", pawn.mobCountDead);
            newPawn.classList.add("pawn_mob");
            var newPawnImg = document.createElement("div");
            newPawnImg.className = "mob_token_container";
            newPawn.appendChild(newPawnImg);
            setPawnMobBackgroundImages(newPawn, pawn.monsterId)

        } else {
            var newPawnImg = document.createElement("div");
            newPawnImg.className = "token_photo";
            newPawn.appendChild(newPawnImg);

            var newPawnStatus = document.createElement("div");
            newPawnStatus.className = "token_status";
            newPawn.appendChild(newPawnStatus);

            //Checka hvort gefið hafi verið input fæll
            optionalPaths = pawn.bgPhoto;
            if (optionalPaths != null) {
                setPawnBackgroundFromPathArray(newPawn, optionalPaths);
            } else {
                monsters ?
                    setPawnImageWithDefaultPath(newPawn, pawn.monsterId)
                    : setPlayerPawnImage(newPawn, pawn.id)
            }
        }

        rotatePawn(newPawn, rotate)
        newPawn.sight_radius_bright_light = sightRadiusBright;
        newPawn.sight_radius_dim_light = sightRadiusDim;
        newPawn.sight_mode = sightMode;

        newPawn.flying_height = 0;
        newPawn["data-dnd_conditions"] = [];
        if (optionalSpawnPoint) {
            newPawn.style.top = optionalSpawnPoint.y + "px";
            newPawn.style.left = optionalSpawnPoint.x + "px";

        } else {
            newPawn.style.top = lastPoint.y * cellSize + "px";
            newPawn.style.left = lastPoint.x * cellSize + "px";
        }

        lastPoint.y++;
        if (i % 7 == 0 && i > 0) {
            lastPoint.x++;
            lastPoint.y -= 8;
        }

        tokenLayer.appendChild(newPawn);
    };
    refreshPawns();
    resizePawns();
    addPawnListeners();

    return newPawn;
}

function removeDuplicatePawnNumbers(index) {
    var pawns = [...document.getElementsByClassName("pawn_numbered")];
    pawns.forEach(function (pawn) {
        if (pawn.index_in_main_window === index) {
            pawn.classList.remove("pawn_numbered");
            pawn.index_in_main_window = "";
        }
    });

}

function addToPawnBackgrounds(element, paths) {
    var currentPaths = element.getElementsByClassName("token_photo")[0].getAttribute("data-token_facets");
    currentPaths = JSON.parse(currentPaths);
    paths.forEach(path => {
        path = path.replace(/\\/g, "/");
        if (!currentPaths.find(x => x == path))
            currentPaths.push(path);
    })
    element.getElementsByClassName("token_photo")[0].setAttribute("data-token_facets", JSON.stringify(currentPaths))
}
function setPawnBackgroundFromPathArray(element, paths) {
    var pathString;
    var tokenPaths = [];
    if (typeof paths == "string") {
        pathString = Util.cssify(paths);
        tokenPaths.push(pathString)
    } else {
        var rand = Math.round(Math.random() * (paths.length - 1));
        paths.forEach(path => {
            path = Util.cssify(path);
            tokenPaths.push(path);
        })
        pathString = Util.cssify(paths[rand]);
    }
    element.getElementsByClassName("token_photo")[0].style.backgroundImage = pathString;
    element.getElementsByClassName("token_photo")[0].setAttribute("data-token_facets", JSON.stringify(tokenPaths))
}

async function setPlayerPawnImage(pawnElement, path) {
    var tokenPath;
    var path = await dataAccess.getTokenPath(path);

    if (path != null) {
        path = path.replace(/\\/g, "/")
        tokenPath = `url('${path}')`;
        pawnElement.getElementsByClassName("token_photo")[0].setAttribute("data-token_facets", JSON.stringify([path]));
    } else {
        tokenPath = " url('mappingTool/tokens/default.png')";
    }

    pawnElement.getElementsByClassName("token_photo")[0].style.backgroundImage = tokenPath;
}

async function setPawnImageWithDefaultPath(pawnElement, path) {
    var tokenPath;
    var possibleNames = [];
    var i = 0;
    while (true) {
        var pawnPath = await dataAccess.getTokenPath(path + i);

        if (pawnPath != null) {
            possibleNames.push(pawnPath);
            i++;
        } else {
            break;
        }
    }

    if (possibleNames.length > 0) {
        tokenPath = "url('" + possibleNames.pickOne().replace(/\\/g, "/") + "')";
    } else {
        tokenPath = " url('mappingTool/tokens/default.png')";
    }

    pawnElement.getElementsByClassName("token_photo")[0].style.backgroundImage = tokenPath;
}

async function setPawnMobBackgroundImages(pawn, path) {
    var possibleNames = [];
    var i = 0;
    while (true) {
        var pawnPath = await dataAccess.getTokenPath(path + i);
        if (pawnPath != null) {
            possibleNames.push(pawnPath);
            i++;
        } else {
            break;
        }
    }

    if (possibleNames.length == 0) {
        possibleNames = ["mappingTool/tokens/default.png"]
    }
    pawn.setAttribute("data-token_paths", JSON.stringify(possibleNames));
    refreshMobBackgroundImages(pawn);
}

function refreshMobBackgroundImages(pawn) {

    var shouldBeDead = parseInt(pawn.getAttribute("data-mob_dead_count"));
    var mobSize = parseInt(pawn.getAttribute("data-mob_size")) + shouldBeDead;

    var tokenPaths = JSON.parse(pawn.getAttribute("data-token_paths"));
    var mobsToAdd = mobSize - pawn.querySelectorAll(".mob_token").length;

    var container = pawn.querySelector(".mob_token_container");
    if (mobsToAdd < 0) {
        for (var i = 0; i > mobsToAdd; i--) {
            var token = pawn.querySelector(".mob_token");
            if (!token) break;
            token.parentNode.removeChild(token);
        }
    } else {
        for (var i = 0; i < mobsToAdd; i++) {
            var ele = document.createElement("div");
            ele.className = "mob_token";
            ele.style.backgroundImage = "url('" + pickOne(tokenPaths).replace(/\\/g, "/") + "')";
            container.appendChild(ele);
            var base = document.createElement("div");
            base.classList = "dead_marker";
            ele.appendChild(base);
        }

    }

    var allTokens = [...pawn.querySelectorAll(".mob_token")];
    if (allTokens.length == 0) return removePawn(pawn);
    //Make them dead  

    var alivePawns = allTokens.filter(x => !x.classList.contains("mob_token_dead"));

    for (var i = 0; i < shouldBeDead; i++) {
        var next = alivePawns.pop();

        if (!next) break;
        next.classList.add("mob_token_dead");
        var currLocation = next.getBoundingClientRect();
        next.parentNode.removeChild(next);

        next.style.transform = `rotate(${pawn.deg || 0}deg)`;
        next.dnd_width = pawn.dnd_hexes * 5;
        next.dnd_height = pawn.dnd_hexes * 5;
        effects.push(next);
        next.classList.add("sfx_effect");
        next.style.top = currLocation.top + "px";
        next.style.left = currLocation.left + "px";
        tokenLayer.appendChild(next);

    }
    effectManager.resizeEffects();
    if ([...pawn.querySelectorAll(".mob_token")].length == 0) {
        return removePawn(pawn);
    }

    var deltaMax = 2;
    var rowSize = Math.floor(Math.sqrt(mobSize));
    var colSize = Math.ceil(Math.sqrt(mobSize));
    var stepBaseY = 80 / rowSize;
    var stepBaseX = 80 / colSize;
    var rowShift = rowSize * stepBaseX + 10;
    var stepX = 5;
    var stepY = 5;

    alivePawns.forEach(ele => {
        ele.style.top = stepY + randToDelta() + "%";
        ele.style.left = stepX + randToDelta() + "%";
        stepX += stepBaseX;
        if (stepX >= rowShift) {
            stepX = 0;
            stepY += stepBaseY;
        }
    });

    refreshMobSize(pawn);

    function randToDelta() {
        return Math.floor(Math.random() * deltaMax) + 1 * (Math.random() > 0.5 ? 1 : -1);
    }
}

function refreshMobSize(pawnElement) {
    var sizePerCreature = pawnElement.dnd_hexes * cellSize;
    pawnElement.style.width = sizePerCreature * parseInt(pawnElement.getAttribute("data-mob_size")) + "px";
}

function removeAllConditionsHandler(event) {
    selectedPawns.forEach(function (pawn) {
        pawn["data-dnd_conditions"] = [];
        var conditions = [...pawn.getElementsByClassName("condition_effect")];
        while (conditions.length > 0) {
            var condition = conditions.pop();
            condition.parentNode.removeChild(condition);
        }
        hideAllTooltips();
        raiseConditionsChanged(pawn);
    });

}

function setPawnCondition(pawnElement, condition, originMainWindow = false) {
    var conditionString = condition.name;
    if (!conditionString || pawnElement["data-dnd_conditions"].indexOf(conditionString) > -1)
        return;
    pawnElement["data-dnd_conditions"].push(conditionString);

    var newDiv = document.createElement("div");
    var para = document.createElement("p");

    newDiv.classList.add("condition_effect");
    newDiv.appendChild(para);
    if (condition.condition_color_value) {
        newDiv.style.webkitTextFillColor = condition.condition_color_value
        if (!condition.condition_background_location) {
            newDiv.style.backgroundColor = lightenColor(condition.condition_color_value)
        }
    }
    if (condition.condition_background_location) {
        newDiv.style.backgroundColor = "rgba(0,0,0,0)";
        newDiv.style.backgroundImage = "url('" + condition.condition_background_location.replace(/\\/g, "/") + "')";
    }

    var text = document.createElement("div");
    text.innerHTML = marked("## " + condition.name + "\n\n" + condition.description);
    if (condition.condition_background_location) {
        var img = document.createElement("img");
        img.setAttribute("src", condition.condition_background_location);
        text.prepend(img);
    }
    text.className = "condition_text";
    newDiv.appendChild(text);

    newDiv.setAttribute("data-dnd_condition_full_name", conditionString);
    pawnElement.querySelector(".token_status").appendChild(newDiv);
    if (!originMainWindow)
        raiseConditionsChanged(pawnElement);
}

function removeAllPawnConditions(pawnElement, originMainWindow = false) {
    removePawnConditionHelper(pawnElement, null, true, originMainWindow);
}

function removePawnCondition(pawnElement, conditionString) {
    removePawnConditionHelper(pawnElement, conditionString, false)

}
function removePawnConditionHelper(pawnElement, conditionObj, deleteAll, originMainWindow = false) {

    if (deleteAll) {
        pawnElement["data-dnd_conditions"] = [];
    } else {
        var currentArr = pawnElement["data-dnd_conditions"];
        pawnElement["data-dnd_conditions"] = currentArr.filter(x => { return x != conditionObj.name });
    }

    var allConditions = [...pawnElement.getElementsByClassName("condition_effect")];

    allConditions.forEach(function (condition) {
        if (deleteAll || condition.getAttribute("data-dnd_condition_full_name") == conditionObj.name) {

            condition.parentNode.removeChild(condition);
        }
    });
    if (!originMainWindow)
        raiseConditionsChanged(pawnElement);

}

function raiseConditionsChanged(pawn) {

    let window2 = remote.getGlobal('mainWindow');
    if (window2) window2.webContents.send('condition-list-changed', pawn["data-dnd_conditions"],
        pawn.index_in_main_window ? pawn.index_in_main_window : pawn.title);

}

function rotatePawn(pawn, degrees) {
    if (pawn.deg == null) {
        pawn.deg = degrees;
    } else {
        pawn.deg += degrees;
    }
    var isMob = pawn.getAttribute("data-mob_size") != null;
    var element = isMob ? pawn.querySelector(".mob_token_container") : pawn.querySelector(".token_photo")

    element.style.setProperty("--pawn-rotate", pawn.deg + "deg");

}

function enlargeReducePawn(direction) {

    selectedPawns.forEach(element => enlargeReduceHelper(element, direction));

    refreshPawns();
    resizePawns();
    function enlargeReduceHelper(element, direction) {
        var sizeIndex = creaturePossibleSizes.sizes.indexOf(element.dnd_size);
        var currentSize = creaturePossibleSizes.sizes[sizeIndex];
        if (direction > 0) {
            if (sizeIndex >= creaturePossibleSizes.hexes.length - 1) return;
            sizeIndex++;
        } else {
            if (sizeIndex <= 0) return;
            sizeIndex--;
        }
        var newSize = creaturePossibleSizes.sizes[sizeIndex];

        element.classList.remove("pawn_" + currentSize);
        element.classList.add("pawn_" + newSize);
        element.dnd_hexes = creaturePossibleSizes.hexes[sizeIndex];
        element.dnd_size = creaturePossibleSizes.sizes[sizeIndex];
    }

}

function elevatePawn() {
    selectedPawns.forEach((pawn) => elevatePawnHelper(pawn))


    function elevatePawnHelper(element) {
        var currentZIndex = parseInt(element.style.zIndex);

        if (isNaN(currentZIndex)) currentZIndex = 5;
        if (currentZIndex < zIndexPawnCap) {
            element.style.zIndex = currentZIndex + 1;
        }
    }

}

function removeSelectedPawn() {
    while (selectedPawns.length > 0) {
        removePawn(selectedPawns.pop());
    }


}

function removePawn(element) {
    var isPlayer = isPlayerPawn(element);
    if (!isPlayer) {
        var indexInLoadedMonsters = -1;
        for (var i = 0; i < loadedMonsters.length; i++) {
            if (loadedMonsters[i][0] === element) {
                indexInLoadedMonsters = i;
            }
        }

        if (loadedMonstersFromMain.indexOf(element) >= 0) {
            loadedMonstersFromMain.splice(loadedMonstersFromMain.indexOf(element), 1);
        }

        loadedMonsters.splice(indexInLoadedMonsters - 1, 1);
        pawns.monsters.splice(pawns.monsters.indexOf(element), 1);
    }
    element.parentNode.removeChild(element);
}
function killOrRevivePawn() {
    var btn = document.getElementById("kill_or_revive_button")
    var revivePawn = btn.innerHTML == "Revive";
    for (var i = 0; i < selectedPawns.length; i++) {
        killOrReviveHelper(selectedPawns[i]);
    }
    refreshPawnToolTips();

    function killOrReviveHelper(pawnElement) {
        var isPlayer = isPlayerPawn(pawnElement);

        if (revivePawn) {
            if (pawnElement.dead == "false")
                return;
            pawnElement.dead = "false";
            if (!isPlayer) {
                if (loadedMonstersFromMain.indexOf(pawnElement) >= 0) {
                    let window2 = remote.getGlobal('mainWindow');
                    if (window2) window2.webContents.send('monster-revived', { name: pawnElement.dnd_name, index: pawnElement.index_in_main_window });
                }
            }
        } else {
            if (pawnElement.dead == "true")
                return;
            pawnElement.dead = "true";
            if (!isPlayer) {
                if (loadedMonstersFromMain.indexOf(pawnElement) >= 0) {
                    let window2 = remote.getGlobal('mainWindow');
                    if (window2) window2.webContents.send('monster-killed', [pawnElement.dnd_name, pawnElement.index_in_main_window]);
                }
            }
        }
        pawnElement.setAttribute("data-state_changed", 1);
    }
}
function closeAddPawnDialogue() {
    document.getElementById("popup_dialogue_add_pawn").classList.add("hidden");
    pauseAlternativeKeyboardMoveMap = false;
    gridLayer.onmousedown = generalMousedowngridLayer;
    gridLayer.style.cursor = "auto";

}


var addingFromMainWindow = false;
function startAddingFromQueue() {
    var tooltip = document.getElementById("tooltip");
    addingFromMainWindow = true;
    tooltip.classList.remove("hidden");
    tooltip.innerHTML = "Creature #" + pawns.addQueue[0].indexInMain;

    document.onmousemove = function (e) {
        tooltip.style.top = e.clientY - 50 + "px";
        tooltip.style.left = e.clientX + "px";
    }
    gridLayer.style.cursor = "copy";
    gridLayer.onmousedown = function (e) {
        if (e.button == 0) {
            popQueue(e);
        } else {
            stopAddingFromQueue()
        }

    }

    function popQueue(e) {
        var radiusOfPawn = creaturePossibleSizes.hexes[creaturePossibleSizes.sizes.indexOf(pawns.addQueue[0].size)];
        var offset = (radiusOfPawn * cellSize) / 2;

        var pawn = generatePawns([pawns.addQueue[0]], true, { x: e.clientX - offset, y: e.clientY - offset });
        loadedMonstersFromMain.push(pawn);
        requestNotifyUpdateFromMain();
        pawns.addQueue.splice(0, 1);
        if (pawns.addQueue.length == 0) {
            document.getElementById("add_pawn_from_tool_toolbar").classList.add("hidden");
            var button = document.getElementById("add_from_queue_toggle_button");
            button.setAttribute("toggled", "false");
            button.classList.remove("toggle_button_toggled");
            button.classList.add("button_style");

            return stopAddingFromQueue()
        }
        tooltip.innerHTML = "Creature #" + pawns.addQueue[0].indexInMain;


    }

    function stopAddingFromQueue() {
        gridLayer.onmousedown = generalMousedowngridLayer;
        gridLayer.style.cursor = "auto";
        document.onmousemove = null;
        tooltip.classList.add("hidden");
        addingFromMainWindow = false;
    }
}

function setTokenNextFacetHandler(e) {
    selectedPawns.forEach(pawn => {
        var pawnPhoto = pawn.getElementsByClassName("token_photo")[0];
        var images = JSON.parse(pawnPhoto.getAttribute("data-token_facets"));
        var currentIndex = parseInt(pawnPhoto.getAttribute("data-token_current_facet")) || 0;
        currentIndex++;
        if (currentIndex >= images.length) currentIndex = 0;

        pawnPhoto.style.backgroundImage = `url('${images[currentIndex]}')`;
        pawnPhoto.setAttribute("data-token_current_facet", currentIndex)

    })

}
async function setTokenImageHandler(e) {
    var input = document.getElementById("icon_load_button");
    var facetButton = document.getElementById("add_token_facet_button");

    await tokenSelector.getNewTokenPaths(true, imagePaths => {
        if (imagePaths == null) return;

        if (e.target == input) {
            selectedPawns.forEach(element => setPawnBackgroundFromPathArray(element, imagePaths));
        } else if (e.target == facetButton) {
            selectedPawns.forEach(element => addToPawnBackgrounds(element, imagePaths));
        }
    });
};


function addPawnHandler(e) {

    var pawnSizeDropDown = document.getElementById("add_pawn_size");
    var pawnName = document.getElementById("add_pawn_name").value;

    var sizeIndex = pawnSizeDropDown.options[pawnSizeDropDown.selectedIndex].value.toLowerCase();
    var pawnSize = creaturePossibleSizes.sizes[sizeIndex];
    var dndSize = creaturePossibleSizes.hexes[sizeIndex];

    var color = document.getElementById("background_color_button_add_pawn").value;

    generatePawns([{
        name: pawnName,
        size: pawnSize,
        color: color,
        bgPhoto: addPawnImagePaths

    }], true,
        { x: e.clientX - (dndSize * cellSize) / 2, y: e.clientY - (dndSize * cellSize) / 2 })

    notifyTokenAdded(lastIndexInsertedMonsters, pawnName)
}

function showPopupMenuPawn(x, y) {
    document.getElementById("popup_menu_general").classList.add("hidden");

    var popup = document.getElementById("popup_menu_pawn");
    var killButton = document.getElementById("kill_or_revive_button");
    if (selectedPawns[0].dead == "true") {
        killButton.innerHTML = "Revive";
    } else {
        killButton.innerHTML = "Kill";
    }
    document.getElementById("background_color_button_change_pawn").value = selectedPawns[0].backgroundColor;

    var hasFacets = 1, isMob = -1;
    selectedPawns.forEach(pawn => {
        if (!pawn.querySelector(".token_photo")?.getAttribute("data-token_facets"))
            hasFacets = 0;
        if (pawn.classList.contains("pawn_mob"))
            isMob = 1;
    });
    Util.showOrHide("pawn_token_menu_button", -1 * isMob);
    Util.showOrHide("next_facet_button", hasFacets);


    popup.classList.remove("hidden");
    popup.style.left = x + "px";
    popup.style.top = y + "px";
    document.onclick = function (e) {
        document.getElementById("popup_menu_pawn").classList.add("hidden");
        document.onclick = null;
    }
}

function showPopupDialogAddPawn(event) {
    pauseAlternativeKeyboardMoveMap = true;
    var dialogue = document.getElementById("popup_dialogue_add_pawn");
    var oiriginDialogue = document.getElementById("popup_menu_general");
    dialogue.style.top = parseInt(oiriginDialogue.style.top) + "px";
    dialogue.style.left = parseInt(oiriginDialogue.style.left) + "px";
    dialogue.classList.remove("hidden");
    gridLayer.style.cursor = "copy";
    gridLayer.onmousedown = function (e) {
        if (e.button == 0) {
            addPawnHandler(e);
        } else {
            closeAddPawnDialogue();
        }
    }
}

function hideAllTooltips() {
    Util.showOrHide("vision_tooltip_category", -1);
    Util.showOrHide("tooltip", -1);
    Util.showOrHide("tooltip2", -1);
    Util.showOrHide("popup_menu_add_effect", -1);
    Util.showOrHide("popup_dialogue_add_pawn", -1);
    Util.showOrHide("conditions_menu", -1);
    gridLayer.style.cursor = "auto";

    //clearSelectedPawns();

}
function showLightSourceTooltip(event) {
    Util.showOrHide("vision_tooltip_category", 1);
    var tooltip = document.getElementById("vision_tooltip_category");
    document.getElementById("popup_menu_pawn").classList.add("hidden");
    tooltip.style.left = event.clientX + "px";
    tooltip.style.top = event.clientY + "px";
    window.setTimeout(function () {
        document.onclick = function (event) {
            hideAllTooltips();
            document.onclick = null;
        }

    }, 200)
}

function createConditionButton(condition) {
    var menuWindow = document.getElementById("conditions_menu");
    var btn = document.createElement("button");
    btn.className = "button_style condition_button";
    btn.onclick = function (e) {
        var name = e.target.innerHTML;

        selectedPawns.forEach(pawn => removePawnCondition(pawn, conditionList.find(x => x.name == name)));
        e.target.parentNode.removeChild(e.target);

    }
    btn.innerHTML = condition;
    menuWindow.appendChild(btn);
}

function showConditionsMenu(event) {
    var oldGridLayerOnClick = gridLayer.onclick;
    Util.showOrHide("conditions_menu", 1);
    Util.showOrHide("popup_menu_pawn", -1);
    var menuWindow = document.getElementById("conditions_menu");
    document.getElementById("popup_menu_pawn").classList.add("hidden");
    menuWindow.style.left = event.clientX + "px";
    menuWindow.style.top = event.clientY + "px";
    var buttons = [...menuWindow.getElementsByClassName("condition_button")];
    buttons.forEach(button => button.parentNode.removeChild(button));
    var conditionsAdded = [];
    selectedPawns.forEach(function (pawn) {
        if (!pawn["data-dnd_conditions"]) return;
        pawn["data-dnd_conditions"].forEach(function (condition) {
            if (conditionsAdded.find(x => x == condition)) return;
            createConditionButton(condition);
            conditionsAdded.push(condition);
        });
    });
    menuWindow.querySelector("input").focus();
    window.setTimeout(function () {
        gridLayer.onclick = function (event) {
            hideAllTooltips();
            gridLayer.onclick = oldGridLayerOnClick;
        }

    }, 200)

}


function showPopupMenuGeneral(x, y) {
    document.getElementById("popup_menu_pawn").classList.add("hidden");
    var popup = document.getElementById("popup_menu_general");

    popup.classList.remove("hidden");
    popup.style.left = x + "px";
    popup.style.top = y + "px";
    document.onclick = function (e) {

        document.getElementById("popup_menu_general").classList.add("hidden");
        document.onclick = null;
    }
}

function startSelectingPawns(e) {
    if (currentlyMeasuring) return;
    gridLayer.style.cursor = "crosshair";
    var originX = e.clientX;
    var originY = e.clientY;

    setupSelectionPainting();
    pos3 = e.clientX;
    pos4 = e.clientY;

    gridLayer.onmousedown = function (event) {
        measurements.clearMeasurements();
        generalMousedowngridLayer(event);
        gridLayer.onmousedown = generalMousedowngridLayer;
    }
    document.onmouseup = function (event) {
        measurements.clearMeasurements();
        document.onmouseup = null;
        document.onmousemove = null;
        gridLayer.style.cursor = "auto";
        window.setTimeout(function () {
            measurements.clearMeasurements();
        }, 100)
    };


    document.onmousemove = displaySelectionAndSelectPawns;
    var oldSelectionRectangle;
    function displaySelectionAndSelectPawns(event) {
        window.requestAnimationFrame(function () {
            if (oldSelectionRectangle != null) {
                measurementsLayerContext.beginPath();
                measurements.eraseModeOn();
                measurementsLayerContext.setLineDash([2, 2]);
                measurementsLayerContext.rect(oldSelectionRectangle.originX, oldSelectionRectangle.originY, oldSelectionRectangle.width, oldSelectionRectangle.height);
                measurementsLayerContext.stroke();
                measurementsLayerContext.globalCompositeOperation = 'source-over'
                measurementsLayerContext.lineWidth = 2;

            } else {
                oldSelectionRectangle = {};
            }
            var width = event.clientX - originX;
            var height = event.clientY - originY;
            selectPawns(originX, originY, width, height);
            measurementsLayerContext.beginPath();
            measurementsLayerContext.moveTo(originX, originY);
            measurementsLayerContext.rect(originX, originY, width, height);
            measurementsLayerContext.stroke();
            oldSelectionRectangle.originX = originX;
            oldSelectionRectangle.originY = originY;
            oldSelectionRectangle.width = width;
            oldSelectionRectangle.height = height;
        });

    }
    function selectPawns(aX, aY, distX, distY) {

        var pawnX, pawnY;
        for (var i = 0; i < pawns.all.length; i++) {
            var pawn = pawns.all[i];
            var offset = parseFloat(pawn.dnd_hexes) * cellSize / 2;

            pawnX = parseFloat(pawn.style.left) + offset;
            pawnY = parseFloat(pawn.style.top) + offset;

            if (Geometry.insideRect(aX, aY, aX + distX, aY + distY, pawnX, pawnY)) {
                selectPawn(pawn);
            } else {
                deselectPawn(pawn);

            }

        };
    }
}
function isSelectedPawn(pawn) {
    for (var i = 0; i < selectedPawns.length; i++) {
        if (selectedPawns[i] == pawn)
            return i;
    }
    return -1;
}


function startMovingMap(e) {
    if (currentlyMeasuring) return;
    gridLayer.style.cursor = "-webkit-grabbing";

    var dragMoveTimestamp;
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = function (event) {
        document.onmouseup = null;
        document.onmousemove = null;
        gridLayer.style.cursor = "auto";
    };
    document.onmousemove = dragMoveMap;
    function dragMoveMap(e) {
        draggingMap = true;
        e = e || window.event;
        e.preventDefault();
        window.requestAnimationFrame(function (timestamp) {
            if (dragMoveTimestamp == timestamp) {
                return
            } else {
                dragMoveTimestamp = timestamp;
            }
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            // Move bg
            var container = mapContainers[0];
            var bgX = container.data_transform_x;
            var bgY = container.data_transform_y;
            bgY -= pos2;
            bgX -= pos1;
            gridMoveOffsetX -= pos1;
            gridMoveOffsetY -= pos2;
            moveMap(bgX, bgY);
            nudgePawns(-pos1, -pos2);
            fovLighting.nudgeSegments(-pos1, -pos2);
            fovLighting.drawSegments();
            drawGrid();
            window.requestAnimationFrame(refreshFogOfWar);

        })

    }
}


function isLightEffect(pawnElement) {
    for (var i = 0; i < pawns.lightSources.length; i++) {
        if (pawns.lightSources[i] == pawnElement) {
            return true;

        }
    }
    return false;
}
function isPlayerPawn(pawnElement) {
    for (var i = 0; i < pawns.players.length; i++) {
        if (pawns.players[i][0] == pawnElement) {
            return true;

        }
    }
    return false;
}
var selectedPawns = [];
function dragPawn(elmnt) {
    var posX = 0, posY = 0, pos3 = 0, pos4 = 0, originPosition = { x: elmnt.offsetLeft, y: elmnt.offsetTop }, oldLine;
    elmnt.onmousedown = dragMouseDown;
    var tooltip = document.getElementById("tooltip");
    var distance;
    var offsetX, offsetY;

    function dragMouseDown(e) {
        if (elmnt.data_overload_click) return elmnt.data_overload_click(e);
        //Line tool
        if (toolbox[0]) {
            if (measurementTargetOrigin == null) {
                measurementTargetOrigin = e.target;
            } else if (measurementTargetOrigin != e.target) {
                measurementTargetDestination = e.target;
                drawLineAndShowTooltip(
                    measurementOriginPosition,
                    {
                        x: e.clientX,
                        y: e.clientY,
                        z: cellSize / 5 * parseInt(e.target.flying_height),
                    }, e
                );
                measurementPaused = true;
                return;
            }
            return measurements.startMeasuring(e);
        }
        if (e.buttons == 1) {
            //Multiple select
            if (e.ctrlKey) {
                if (isPawn(e.target)) {
                    if (isSelectedPawn(e.target) < 0) {
                        selectPawn(e.target);
                    } else {
                        deselectPawn(e.target);
                    }

                }
                gridLayer.onmousedown = function (event) {

                    clearSelectedPawns();
                    gridLayer.onmousedown = generalMousedowngridLayer;
                }
            } else {

                if (isSelectedPawn(e.target) < 0)
                    clearSelectedPawns();
                setupMeasurements();
                originPosition = { x: elmnt.offsetLeft, y: elmnt.offsetTop };
                measurementsLayerContext.moveTo(originPosition.x + offsetX, originPosition.y + offsetY);
                showToolTip(e, "0 ft", "tooltip")
                e = e || window.event;
                e.preventDefault();

                // get the mouse cursor position at startup:
                pos3 = e.clientX;
                pos4 = e.clientY;
                document.onmouseup = closeDragElement;
                // call a function whenever the cursor moves:
                document.onmousemove = elementDrag;


            }

        } else if (e.buttons == 2) {

            if (selectedPawns.length == 1)
                clearSelectedPawns();
            if (isPawn(e.target) && isSelectedPawn(e.target) < 0) {
                selectedPawns.push(e.target);
                e.target.classList.add("pawn_selected")
            }

            showPopupMenuPawn(e.clientX, e.clientY);
        }
    }

    var eleDragTimestamp, eleMovedEventDelay;
    function elementDrag(e) {
        window.requestAnimationFrame(function (ts) {
            if (ts == eleDragTimestamp) {
                return
            }
            eleDragTimestamp = ts;

            e.preventDefault();
            // calculate the new cursor position:
            posX = pos3 - e.clientX;
            posY = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            window.clearTimeout(eleMovedEventDelay);
            eleMovedEventDelay = window.setTimeout(onPawnsMoved, eleMovedEventDelay)

            //Multiple move
            if (selectedPawns.length > 0) {
                for (var i = 0; i < selectedPawns.length; i++) {

                    var pwn = selectedPawns[i];
                    pwn.style.top = (pwn.offsetTop - posY) + "px";
                    pwn.style.left = (pwn.offsetLeft - posX) + "px";
                    pwn.attached_objects.forEach(obj => {
                        obj.style.top = (obj.offsetTop - posY) + "px";
                        obj.style.left = (obj.offsetLeft - posX) + "px";
                        if (obj.sound)
                            soundManager.adjustPlacement(obj.id, (obj.offsetLeft - posX), (obj.offsetTop - posY));
                    });
                }
                tooltip.style.top = (selectedPawns[0].offsetTop - posY - 40) + "px";
                tooltip.style.left = (selectedPawns[0].offsetLeft - posX) + "px";
                distance = Math.round(
                    Math.sqrt(
                        Math.pow(selectedPawns[0].offsetLeft - originPosition.x, 2) +
                        Math.pow(selectedPawns[0].offsetTop - originPosition.y, 2)
                    ) / cellSize * 5);
                tooltip.innerHTML = distance + " ft";
            } else {


                tooltip.style.top = (elmnt.offsetTop - posY - 40) + "px";
                tooltip.style.left = (elmnt.offsetLeft - posX) + "px";
                elmnt.style.top = (elmnt.offsetTop - posY) + "px";
                elmnt.style.left = (elmnt.offsetLeft - posX) + "px";
                elmnt.attached_objects.forEach(obj => {
                    obj.style.top = (obj.offsetTop - posY) + "px";
                    obj.style.left = (obj.offsetLeft - posX) + "px";
                    if (obj.sound)
                        soundManager.adjustPlacement(obj.id, (obj.offsetLeft - posX), (obj.offsetTop - posY));
                });
            }
            //Clear old
            if (oldLine != null) {
                measurements.eraseModeOn();
                measurementsLayerContext.beginPath();
                measurementsLayerContext.moveTo(oldLine.a.x, oldLine.a.y);
                measurementsLayerContext.lineTo(oldLine.b.x, oldLine.b.y);
                measurementsLayerContext.stroke();
                measurements.eraseModeOff();
            } else {
                oldLine = {};
            }


            measurementsLayerContext.beginPath();
            offsetX = ((cellSize / 2) * elmnt.dnd_hexes);
            offsetY = ((cellSize / 2) * elmnt.dnd_hexes);
            measurementsLayerContext.moveTo(originPosition.x + offsetX, originPosition.y + offsetY);
            measurementsLayerContext.lineTo(elmnt.offsetLeft + offsetX, elmnt.offsetTop + offsetY);
            measurementsLayerContext.stroke();
            var a = {
                x: originPosition.x + offsetX,
                y: originPosition.y + offsetY
            }
            var b = {
                x: elmnt.offsetLeft + offsetX,
                y: elmnt.offsetTop + offsetY
            }
            oldLine.a = a;
            oldLine.b = b;
            distance = Math.round(
                Math.sqrt(
                    Math.pow(elmnt.offsetLeft - originPosition.x, 2) +
                    Math.pow(elmnt.offsetTop - originPosition.y, 2)
                ) / cellSize * 5);
            tooltip.innerHTML = distance + " ft";

        })


    }

    function closeDragElement(e) {
        if (settings.snapToGrid) {
            if (selectedPawns.length == 0) {
                snapPawnToGrid(elmnt);
            } else {
                selectedPawns.forEach(pwn => {
                    snapPawnToGrid(pwn);
                })
            }
        }

        document.onmouseup = null;
        document.onmousemove = null;
        refreshFogOfWar();
        measurements.clearMeasurements();
        originPosition = { x: elmnt.offsetLeft, y: elmnt.offsetTop }
        tooltip.classList.add("hidden");
    }
}

function feetToPixels(distFeet) {
    return distFeet * cellSize / 5;
}

var hideTooltipTimer;
function addPawnListeners() {
    for (var i = 0; i < pawns.all.length; i++) {
        dragPawn(pawns.all[i])
        if (pawns.all[i].deg == null) pawns.all[i].deg = 0;
        pawns.all[i].onwheel = function (event) {
            if (event.shiftKey) {
                if (event.deltaY > 0) {
                    rotatePawn(event.target, 3);
                } else {
                    rotatePawn(event.target, -3);
                }

            } else if (event.ctrlKey) {
                if (event.deltaY > 0) {
                    event.target.flying_height += 5;
                } else {
                    event.target.flying_height -= 5;
                }
                if (event.target.flying_height < 40 && event.target.flying_height > -40) {
                    if (event.target.flying_height == 0) {
                        event.target.style.filter = " drop-shadow(20px 20px 10px rgba(0,0,0,0.5));"
                    } else {
                        event.target.style.filter = "drop-shadow(" + event.target.flying_height + "px " + event.target.flying_height + "px 5px rgba(0,0,0,0.7))";
                    }

                }

                refreshMeasurementTooltip();

                event.target.setAttribute("data-state_changed", 1);
                refreshPawnToolTips();
                showToolTip(event, "Flying height: " + event.target.flying_height + " ft", "tooltip2");

                window.clearTimeout(hideTooltipTimer);
                hideTooltipTimer = window.setTimeout(function () {
                    document.getElementById("tooltip2").classList.add("hidden");
                }, 1000)
            }
        };
    }


}
function nudgePawns(x, y) {

    [pawns.all, effects].forEach(arr => {
        for (var i = 0; i < arr.length; i++) {
            var pawn = arr[i];
            var posX = parseFloat(pawn.style.left) + x;
            var posY = parseFloat(pawn.style.top) + y;
            pawn.style.top = posY + "px";
            pawn.style.left = posX + "px";
            if (pawn.sound) {
                soundManager.adjustPlacement(pawn.id, posX, posY);
            }
        }

    });
    updateHowlerListenerLocation();

}

function resizePawns() {

    resizeHelper(pawns.all);
}

function getPawnOrigin(pawn) {
    var rect = pawn.getBoundingClientRect();

    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
}

function clearSelectedPawns() {

    while (selectedPawns.length > 0) {
        selectedPawns.pop().classList.remove("pawn_selected");
    }
}

var pawnSelectNotify_timeout;
function selectPawn(pawn) {
    var selected = isSelectedPawn(pawn);
    if (selected >= 0)
        return;
    selectedPawns.push(pawn);
    pawn.classList.add("pawn_selected");
    window.clearTimeout(pawnSelectNotify_timeout);
    pawnSelectNotify_timeout = window.setTimeout(() => {
        notifySelectedPawnsChanged();
    }, 500);
}

function deselectPawn(pawn) {
    var selected = isSelectedPawn(pawn);
    if (selected < 0)
        return;

    selectedPawns.splice(selected, 1);
    pawn.classList.remove("pawn_selected");


}
function isPawn(element) {
    return element.classList.contains("pawn");
}
function resizeHelper(arr) {
    for (var i = 0; i < arr.length; i++) {
        var pawn = arr[i];
        var mobSize = pawn.getAttribute("data-mob_size");
        var rowCount = Math.floor(Math.sqrt(mobSize));
        var colCount = Math.ceil(Math.sqrt(mobSize));
        if (mobSize) {
            mobSize = parseInt(mobSize);
            pawn.style.height = pawn.dnd_hexes * rowCount * cellSize + "px";
            pawn.style.width = pawn.dnd_hexes * colCount * cellSize + "px";
            var mobTokens = [...pawn.querySelectorAll(".mob_token")];
            mobTokens.forEach(token => {
                token.style.height = pawn.dnd_hexes * cellSize + "px";
                token.style.width = pawn.dnd_hexes * cellSize + "px";
            });
        } else {
            pawn.style.height = pawn.dnd_hexes * cellSize + "px";
            pawn.style.width = pawn.dnd_hexes * cellSize + "px";
        }



    }
}
function setupGridLayer() {
    gridLayerContext.strokeStyle = "rgba('10','10','10','0.2')";
    gridLayerContext.lineWidth = 1;
}

function setupSelectionPainting() {
    measurementsLayerContext.lineWidth = 3;
    measurementsLayerContext.setLineDash([]);
    measurementsLayerContext.fillStyle = "transparent";
    measurementsLayerContext.strokeStyle = "#eee";
}

function setupMeasurements() {
    measurementsLayerContext.lineWidth = 3;
    measurementsLayerContext.setLineDash([15, 15]);
    measurementsLayerContext.fillStyle = "rgba(0, 0, 0, 0.469)";
    measurementsLayerContext.strokeStyle = "#eee";
}

function setupFOVMeasurements() {
    measurementsLayerContext.lineWidth = 5;
    measurementsLayerContext.setLineDash([]);
    measurementsLayerContext.fillStyle = "rgba(200, 200, 0, 0.469)";
    measurementsLayerContext.strokeStyle = "#2222aa";
}


/* #region draw functions */

var gridResize_Timestamp;
function resizeAndDrawGrid(timestamp, event) {
    if (timestamp) {
        if (gridResize_Timestamp == timestamp)
            return
        gridResize_Timestamp = timestamp;
    }

    var fovLayerSegments = document.getElementById("fog_of_war_segments");

    canvasHeight = window.innerHeight;
    canvasWidth = window.innerWidth;
    fovLighting.addWindowBorderToSegments();

    //Resize fovlayer to window height and widht
    fovLighting.resizeCanvas(canvasWidth, canvasHeight);


    fovLayerSegments.setAttribute('width', canvasWidth);
    fovLayerSegments.setAttribute('height', canvasHeight);
    measurementsLayer.setAttribute('width', canvasWidth);
    measurementsLayer.setAttribute('height', canvasHeight);
    gridLayer.setAttribute('width', canvasWidth);
    gridLayer.setAttribute('height', canvasHeight);


    toggleSaveTimer();
    resizePawns();
    effectManager.resizeEffects();
    refreshFogOfWar(timestamp);
    drawGrid();
    if (previewPlacementElement)
        adjustPreviewPlacement(event);
}


function drawGrid() {
    if (!settings.enableGrid) {
        clearGrid();
        gridLayerContext.stroke();
        fovLighting.drawSegments();
        return;
    }
    fovLighting.drawSegments();
    clearGrid();
    var ctx = gridLayerContext;
    ctx.strokeStyle = 'rgba(0,0,0,0.9)';;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.setLineDash([2]);


    var startPointX = gridMoveOffsetX % cellSize;
    var startPointY = gridMoveOffsetY % cellSize;


    for (var i = startPointY; i < canvasHeight; i += cellSize) {
        ctx.moveTo(0, i);
        ctx.lineTo(canvasWidth, i);
    }

    for (var i = startPointX; i < canvasWidth; i += cellSize) {
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvasHeight);
    }
    gridLayerContext.stroke();
}
var fogOfWarLastRefreshed_Timestamp;
function refreshFogOfWar(timestamp) {
    if (timestamp && timestamp == fogOfWarLastRefreshed_Timestamp) {
        return
    }
    fogOfWarLastRefreshed_Timestamp = timestamp;
    if (fogOfWarEnabled) {
        fovLighting.drawFogOfWar();
    } else {
        fovLighting.clearFogOfWar();
    }
    fovLighting.drawSegments();

}


function clearGrid() {
    gridLayerContext.save();
    gridLayerContext.setTransform(1, 0, 0, 1, 0, 0);
    gridLayerContext.clearRect(0, 0, gridLayer.width, gridLayer.height);
    gridLayerContext.restore();
}

/* #endregion */
