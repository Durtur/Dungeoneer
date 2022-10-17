const Awesomplete = require(pathModule.join(
    window.api.getAppPath(),
    "app",
    "awesomplete",
    "awesomplete.js"
));
const Geometry = require("./mappingTool/geometry");
const MapLibrary = require("./mappingTool/mapLibrary");
var mapLibrary = new MapLibrary();
const SlideCanvas = require("./mappingTool/slideCanvas");
const Menu = require("./mappingTool/menu");
const TokenDialog = require("./mappingTool/tokenDialog");
const tokenDialog = new TokenDialog();

const Recents = require("./mappingTool/recents");
var recentMaps = new Recents();
const SoundManager = require("./js/soundManager");

const dataAccess = require("./js/dataaccess");
const sidebarManager = require("./js/sidebarManager");
const InfoTooltip = require("./mappingTool/infotooltip");
const info = new InfoTooltip();
const initiative = require("./js/initiative");
const marked = require("marked");
const TokenSelector = require("./js/tokenSelector");
const tokenSelector = new TokenSelector();
const saveManager = require("./mappingTool/saveManager");
const effectManager = require("./mappingTool/effectManager");

const DEFAULT_TOKEN_PATH = "./mappingTool/tokens/default.png";
const DEFAULT_TOKEN_PATH_JS_RELATIVE = pathModule.join(
    __dirname,
    "mappingTool",
    "tokens",
    "default.png"
);
var conditionList;
var RUN_ARGS_MAP = null;
var soundManager = new SoundManager(pathModule);

var frameHistoryButtons = null;
var pendingMapLoad;

function loadSettings() {
    dataAccess.getSettings(function (data) {
        settings = data.maptool;

        if (!settings.colorTokenBases) {
            document.getElementById("background_color_button_add_pawn").value =
                "rgba(255, 255, 255, 0)";
        }

        var hueSelector = document.getElementById("fog_of_war_hue_selector");
        if (settings.fogOfWarHue) {
            hueSelector.value = settings.fogOfWarHue;
        } else {
            settings.fogOfWarHue = hueSelector.value;
        }
        if (!settings.transparentWindow)
            document.body.style.backgroundColor = hueSelector.value;
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
        if (settings.currentMap && !RUN_ARGS_MAP) {
            setMapForeground(
                settings.currentMap,
                settings.gridSettings.mapSize
            );
        }

        if (settings.currentOverlay) {
            setMapOverlay(
                settings.currentOverlay,
                settings.gridSettings.mapOverlaySize
            );
        }

        if (settings.currentBackground) {
            setMapBackground(
                settings.currentBackground,
                settings.gridSettings.mapBackgroundSize
            );
        }
        if (settings.transparentWindow) {
            document.querySelector(".maptool_body").style.backgroundImage =
                null;
        } else if (settings.map_edge_style) {
            document.querySelector(".maptool_body").style.backgroundImage =
                "url('" + settings.map_edge_style + "')";
        }
        if (!partyArray) loadParty();
        onSettingsLoaded();
    });
}

function saveSettings() {
    console.log("Saving settings");
    console.log(settings);
    dataAccess.getSettings(function (data) {
        data.maptool = settings;
        dataAccess.saveSettings(data);
    });
}

// #region commands
function notifySelectedPawnsChanged() {
    window.api.messageWindow("mainWindow", "notify-maptool-selection-changed", {
        selected: selectedPawns
            .filter((x) => x.index_in_main_window)
            .map((x) => x.index_in_main_window),
    });

    updateHowlerListenerLocation();
}

// function notifyTokenAdded(tokenIndex, name) {
//     window.api.messageWindow('mainWindow', 'notify-token-added-in-maptool', [tokenIndex, name]);
// }

function requestNotifyUpdateFromMain() {
    window.api.messageWindow("mainWindow", "update-all-pawns");
}

function reloadMap() {
    if (
        pawns.all.length > pawns.players.length &&
        !window.confirm("Do you wish to reload the window?")
    )
        return;
    location.reload();
}
document.addEventListener("DOMContentLoaded", function () {
    loadSettings();
    updateHowlerListenerLocation();
    window.api.messageWindow("mainWindow", "maptool-initialized");
    serverNotifier.notifyServer("request-state", null);
    serverNotifier.mapToolInit();
    var bgSize = parseInt($("#foreground").css("background-size"));
    var slider = document.getElementById("foreground_size_slider");
    slider.value = bgSize;
    window.setTimeout(() => {
        backgroundLoop.onSlideChanged = (state) => {
            serverNotifier.notifyServer("backgroundLoop", state);
        };

        overlayLoop.onSlideChanged = (state) => {
            serverNotifier.notifyServer("overlayLoop", state);
        };
    });
    //Drag drop
    document.addEventListener("drop", (event) => {
        event.preventDefault();
        event.stopPropagation();
        console.log(event.dataTransfer.files);
        if (event.dataTransfer.files?.length > 0) {
            var f = event.dataTransfer.files[0];

            var path = f.path;
            var extension = pathModule.extname(path).replaceAll(".", "");

            if (saveManager.supportedMapTypes().includes(extension))
                saveManager.loadMapFromPath(path);
        }
    });
    document.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.stopPropagation();
    });

    $("#background_color_button_add_pawn").spectrum({
        preferredFormat: "rgb",
        allowEmpty: false,
        showAlpha: true,
        showInput: true,
    });
    $("#background_color_button_change_pawn").spectrum({
        preferredFormat: "rgb",
        allowEmpty: false,
        showAlpha: true,
        showInput: true,
        chooseText: "Set as base",
        cancelText: "Cancel",
        change: pawnBgColorChosen,
    });

    function pawnBgColorChosen(color) {
        selectedPawns.forEach((element) => {
            element.style.backgroundColor = color;
            serverNotifier.notifyServer("token-color", {
                id: element.id,
                color: color + "",
            });
        });
    }

    dataAccess.getConditions(async function (data) {
        data.sort(function (a, b) {
            if (a.name < b.name) return -1;
            if (b.name < a.name) return 1;
            return 0;
        });
        conditionList = data;
        serverNotifier.notifyServer(
            "condition-list",
            await serverNotifier.getConditionsForExport()
        );

        var parentNode = document.getElementById("conditions_menu");
        var newButton = document.createElement("button");
        newButton.classList.add("button_style");
        newButton.onclick = removeAllConditionsHandler;
        newButton.innerHTML = "Clear all";
        parentNode.appendChild(newButton);
        var input = parentNode.querySelector(".conditions_menu_input");
        var list = conditionList.map((x) => x.name).sort();

        new Awesomplete(input, {
            list: ["<Clear all>", ...list],
            autoFirst: true,
            minChars: 0,
            maxItems: 25,
        });
        input.addEventListener("awesomplete-selectcomplete", function (e) {
            var condition = e.text.value;
            input.value = "";
            if (condition == "<Clear all>") {
                return removeAllConditionsHandler(e);
            }
            var condition = conditionList.find((c) => c.name == condition);
            createConditionButton(condition.name);
            selectedPawns.forEach(function (pawn) {
                setPawnCondition(pawn, condition);
            });
        });
    });
    resetGridLayer();
    tokenDialog.initialize();

    document.getElementById("foreground_cells_input").oninput = function (e) {
        if (!e.target.value) return;
        var value = parseFloat(e.target.value);

        var desiredWidth = originalCellSize * value;
        resizeForeground(desiredWidth);
    };

    document.getElementById("background_cells_input").oninput = function (e) {
        if (!e.target.value) return;
        var value = parseFloat(e.target.value);
        var desiredWidth = originalCellSize * value;
        resizeBackground(desiredWidth);
    };

    document.getElementById("overlay_cells_input").oninput = function (e) {
        if (!e.target.value) return;
        var value = parseFloat(e.target.value);
        var desiredWidth = originalCellSize * value;
        resizeOverlay(desiredWidth);
    };
});

async function clientHideSelectedPawn() {
    var hide = selectedPawns[0].client_hidden;
    hide = !hide;
    if (hide && !SERVER_RUNNING) return;
    selectedPawns.forEach(async (pawn) => {
        if (pawn.client_hidden == hide) return;
        pawn.client_hidden = hide;
        if (pawn.client_hidden) {
            pawn.classList.add("token_client_hidden");
            serverNotifier.notifyServer("pawn-removed", pawn.id);
        } else {
            pawn.classList.remove("token_client_hidden");
            serverNotifier.notifyServer(
                "token-add",
                await saveManager.exportPawn([pawn, pawn.dnd_name])
            );
        }
    });
}

function resetEverything() {
    if (currentlyDeletingSegments)
        document.getElementById("delete_segments_button").click();
    clearSelectedPawns();
    hideAllTooltips();
    effectManager.close();
    if (
        document
            .getElementById("move_effects_button")
            .getAttribute("toggled") != "false"
    )
        document.getElementById("move_effects_button").click();
    resetGridLayer();
    gridLayer.style.cursor = "auto";
    return turnAllToolboxButtonsOff();
}

function onSettingsChanged() {
    if (settings.roundTimer) {
        if (roundTimer) {
            roundTimer.destroy();
        }
        roundTimer = new Timer(settings.roundTimer, () => {
            serverNotifier.notifyServer("round-timer", roundTimer.getState());
        });
        roundTimer.render();
        roundTimer.onclicked((e) => roundTimer.reset());
    }
}

var PAWN_HOT_KEYS;
function mapHotKeys() {
    PAWN_HOT_KEYS = {};
    var buttons = document.querySelectorAll("button[data-hotkey]");
    buttons.forEach((button) => {
        var hotKey = button
            .getAttribute("data-hotkey")
            .replace("(", "")
            .replace(")", "")
            .trim();
        PAWN_HOT_KEYS[hotKey.toLowerCase()] = () => button.click();
    });
}

async function onSettingsLoaded() {
    soundManager.initialize();
    mapHotKeys();
    soundManager.setSoundLibraryPath(settings.soundLibraryPath);
    resizeForeground(
        settings.defaultMapSize
            ? settings.defaultMapSize
            : settings.gridSettings.mapSize
            ? settings.gridSettings.mapSize
            : window.innerWidth
    );
    map.init();

    recentMaps.initialize(document.querySelector("#recent_maps_button>ul"));
    mapLibrary.initialize();
    Menu.initialize();

    effectManager.initialize();
    onSettingsChanged();
    serverNotifier.notifyServer(
        "effects-set",
        await serverNotifier.getEffectsForExport()
    );
    serverNotifier.notifyServer(
        "tokens-set",
        await serverNotifier.getTokensForExport()
    );
    fovLighting.publishChanged();
    backgroundLoop.notifyChanges();
    overlayLoop.notifyChanges();
    document.querySelector("body").onkeydown = function (event) {
        if (document.activeElement.tagName == "INPUT") return;
        var keyIndex = [37, 38, 39, 40, 65, 87, 68, 83].indexOf(event.keyCode);

        var lastKey = LAST_KEY;
        LAST_KEY = event.key;
        window.clearTimeout(lastKeyNull);
        lastKeyNull = window.setTimeout(() => (LAST_KEY = ""), 1000);
        if (selectedPawns.length > 0) {
            var pawnHandler = PAWN_HOT_KEYS[event.key.toLowerCase()];
            if (pawnHandler) return pawnHandler();
        }
        if (event.key === "Escape") {
            return resetEverything;
            //Show global listener position
        } else if (
            event.key.toLowerCase() == "p" &&
            lastKey.toLowerCase() == "l"
        ) {
            return soundManager.displayGlobalListenerPosition();
        } else if (
            event.key.toLowerCase() == "e" &&
            lastKey.toLowerCase() == "d"
        ) {
            if (currentlyDeletingSegments) return;
            document.getElementById("delete_segments_button").click();
        } else if (event.ctrlKey && event.key.toLowerCase() == "s") {
            return saveManager.saveCurrentMap();
        } else if (event.ctrlKey && event.key.toLowerCase() == "o") {
            return saveManager.loadMapDialog();
        } else if (
            keyIndex < 0 ||
            (keyIndex > 3 && pauseAlternativeKeyboardMoveMap)
        ) {
            return;
        }

        window.clearInterval(resetMoveIncrementTimer);
        resetMoveIncrementTimer = window.setTimeout(function () {
            canvasMoveRate = 2;
        }, 600);

        var bgX = foregroundCanvas.data_transform_x || 0;
        var bgY = foregroundCanvas.data_transform_y || 0;

        if (event.shiftKey) {
            if (event.keyCode == 37) {
                bgX -= canvasMoveRate;
            } else if (event.keyCode == 39) {
                bgX += canvasMoveRate;
            } else if (event.keyCode == 38) {
                bgY -= canvasMoveRate;
            } else if (event.keyCode == 40) {
                bgY += canvasMoveRate;
            }

            moveForeground(bgX, bgY);

            if (canvasMoveRate < 80) canvasMoveRate++;
            return;
        }
        //Normal read map handlers
        map.onkeydown(event);
    };

    gridLayer.onwheel = function (event) {
        if (event.ctrlKey && previewPlacementElement) {
            return effectManager.onPreviewPlacementResized(event);
        }

        return map.onzoom(event);
    };

    document.getElementById("clear_foreground_button").onclick = function (e) {
        setMapForeground(null);
        settings.currentMap = null;
        settings.gridSettings.mapSize = null;
        saveSettings();
    };

    var iconLoadButtons = [...document.querySelectorAll(".icon_load_button")];
    iconLoadButtons.forEach((button) => {
        button.onclick = setTokenImageHandler;
    });
    document.getElementById("next_facet_button").onclick =
        setTokenNextFacetHandler;

    initialLoadComplete = true;
    if (pendingMapLoad) {
        saveManager.loadMapFromPath(pendingMapLoad);
        pendingMapLoad = null;
    }
}

function getMapImageFromDialog(pathKey) {
    var localStoragePath = `default_path_${pathKey}`;
    var defaultPath = localStorage.getItem(localStoragePath);
    var path = window.dialog.showOpenDialogSync({
        properties: ["openFile"],
        message: "Choose map",
        defaultPath: defaultPath || "",
        filters: [{ name: "Images", extensions: constants.imgFilters }],
    })[0];
    localStorage.setItem(localStoragePath, path);
    return path.replace(/\\/g, "/");
}

function getBackgroundFromFile(e) {
    var path = getMapImageFromDialog("background");
    if (path) {
        setMapBackground(path, settings.defaultMapSize);
    }
}

function getOverlayFromFile(e) {
    var path = getMapImageFromDialog("overlay");
    if (path) {
        setMapOverlay(path, settings.defaultMapSize);
    }
}

function getForegroundFromFile(e) {
    var path = getMapImageFromDialog("foreground");
    if (path) {
        setMapForeground(path, settings.defaultMapSize);
        settings.currentMap = path;
        settings.gridSettings.mapSize = null;
        saveSettings();
    }
}

function getMapWidthFromFileName(path, width) {
    var basename = pathModule.basename(path);
    var idx = basename.lastIndexOf("[");
    var idx2 = basename.indexOf("]", idx);

    if (idx < 0 || idx2 < 0) return width;
    var str = basename.substring(idx, idx2);
    str = str.replace("[", "").replace("]", "");
    var whArr = str.split("x");
    return parseInt(whArr[0]) * originalCellSize || width;
}

var saveTimer;
function toggleSaveTimer() {
    clearTimeout(saveTimer);
    saveTimer = window.setTimeout(function () {
        settings.gridSettings = {};
        settings.gridSettings.cellSize = cellSize;
        settings.gridSettings.mapSize = parseFloat(
            $("#foreground").css("width")
        );
        settings.gridSettings.mapBackgroundSize = parseFloat(
            $("#background").css("width")
        );
        settings.gridSettings.mapOverlaySize = parseFloat(
            $("#overlay").css("width")
        );
        saveSettings();
    }, 7000);
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
        if (e.button == 1) GLOBAL_MOUSE_DOWN = true;
    });

    document.addEventListener("mouseup", function (e) {
        GLOBAL_MOUSE_DOWN = false;
    });
}

var GLOBAL_MOUSE_POSITION;
function recordMouseMove() {
    document.addEventListener("mousemove", recordMouse);
}
function recordMouse(e) {
    GLOBAL_MOUSE_POSITION = { x: e.x, y: e.y };
    if (GLOBAL_MOUSE_DOWN) {
        fovLighting.attemptToDeleteSegment({
            x: GLOBAL_MOUSE_POSITION.x,
            y: GLOBAL_MOUSE_POSITION.y,
        });
    }
}

function drawSegmentsOnMouseMove() {
    document.addEventListener("mousemove", fovLighting.drawSegments);
}

function toggleDeleteSegments() {
    turnAllToolboxButtonsOff();

    gridLayer.style.cursor = "not-allowed";
    currentlyDeletingSegments = !currentlyDeletingSegments;
    if (currentlyDeletingSegments) {
        recordMouseMove();
        drawSegmentsOnMouseMove();
        gridLayer.onmousedown = function (event) {
            if (event.button == 2) {
                var bn = document.getElementById("delete_segments_button");
                bn.click();
                return;
            }

            fovLighting.attemptToDeleteSegment({
                x: event.clientX,
                y: event.clientY,
            });
            refreshFogOfWar();
        };
    } else {
        resetGridLayer();
        gridLayer.style.cursor = "auto";
        document.removeEventListener("mousemove", recordMouse, false);
        document.removeEventListener(
            "mousemove",
            fovLighting.drawSegments,
            false
        );
    }
}

function turnAllToolboxButtonsOff() {
    var toggleButtons = document.querySelectorAll(".toolbox_button");
    for (var i = 0; i < toggleButtons.length; i++) {
        if (toggleButtons[i].getAttribute("toggled") == "true") {
            toggleButtons[i].click();
        }
    }
    resetGridLayer();
    currentlyMeasuring = false;
    gridLayer.style.zIndex = 4;
    stopMeasuring(null, true);
}

function showMapSizeSlider(element) {
    var cont = document.getElementById("map_size_slider_container");
    cont.classList.contains("hidden")
        ? cont.classList.remove("hidden")
        : cont.classList.add("hidden");
}

function setLightSource(brightLight, dimLight, params) {
    selectedPawns.forEach(function (pawn) {
        if (params && params.darkvision) {
            pawn.sight_mode = "darkvision";
        } else {
            if (params && params.torch) {
                pawn.classList.add("light_source_torch");
            } else {
                pawn.classList.remove("light_source_torch");
            }
            pawn.sight_mode = "normal";
        }
        pawn.sight_radius_bright_light = brightLight;
        pawn.sight_radius_dim_light = dimLight;

        if (pawns.lightSources.indexOf(pawn) >= 0) {
            if (brightLight == 0 && dimLight == 0) {
                if (!isPlayerPawn(pawn))
                    pawns.lightSources.splice(
                        pawns.lightSources.indexOf(pawn),
                        1
                    );
            }
        } else {
            if (brightLight > 0 || dimLight > 0) {
                pawns.lightSources.push(pawn);
            }
        }
    });

    refreshFogOfWar();
}

function loadParty() {
    if (partyArray == null) partyArray = [];
    if (!settings.addPlayersAutomatically) return;
    dataAccess.getParty(async function (data) {
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
                    newPartyArray.push({
                        name: data[i].character_name,
                        id: data[i].id,
                        size: "medium",
                        color: Util.hexToRGBA(data[i].color, 0.4),
                        bgPhoto: null,
                        darkVisionRadius: data[i].darkvision,
                    });
                    partyArray.push([
                        data[i].character_name,
                        "medium",
                        data[i].id,
                    ]);
                }
            }
        }

        await generatePawns(newPartyArray, false);
        fillForcedPerspectiveDropDown();
    });
}

function fillForcedPerspectiveDropDown() {
    var dropDown = document.getElementById("fov_perspective_dropdown");
    console.log(dropDown);
    while (dropDown.firstChild) dropDown.removeChild(dropDown.firstChild);

    createOption("All");
    createOption("Players");
    partyArray.forEach(function (array) {
        createOption(array[0]);
    });
    function createOption(value) {
        var option = document.createElement("option");
        option.setAttribute("value", value);
        option.innerHTML = value;
        dropDown.appendChild(option);
    }
}

async function setPlayerPawnImage(pawnElement, path) {
    var tokenPath;
    var path = await dataAccess.getTokenPath(path);
    var imgEle = pawnElement.getElementsByClassName("token_photo")[0];
    if (path != null) {
        path = path.replace(/\\/g, "/");
        tokenPath = `url('${path}')`;
    } else {
        tokenPath = " url('mappingTool/tokens/default.png')";
    }
    imgEle.setAttribute("data-token_facets", JSON.stringify([path]));
    imgEle.setAttribute("data-token_current_facet", 0);

    imgEle.style.backgroundImage = tokenPath;
    onBackgroundChanged(pawnElement);
}

///Sets pawn image from library. Returns true if any image existed.
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
    possibleNames = possibleNames.map((x) => x.replace(/\\/g, "/"));
    if (possibleNames.length > 0) {
        tokenPath = possibleNames.pickOne();
    } else {
        tokenPath = DEFAULT_TOKEN_PATH;
    }
    var imgEle = pawnElement.getElementsByClassName("token_photo")[0];
    imgEle.setAttribute("data-token_facets", JSON.stringify(possibleNames));
    imgEle.setAttribute(
        "data-token_current_facet",
        possibleNames.indexOf(tokenPath)
    );
    imgEle.style.backgroundImage = `url('${tokenPath}')`;
    return tokenPath != DEFAULT_TOKEN_PATH;
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

function removeSelectedPawn() {
    while (selectedPawns.length > 0) {
        map.removePawn(selectedPawns.pop());
    }
}

function killOrRevivePawn() {
    var btn = document.getElementById("kill_or_revive_button");
    var revivePawn = btn.innerHTML == "Revive";
    for (var i = 0; i < selectedPawns.length; i++) {
        killOrReviveHelper(selectedPawns[i]);
    }
    refreshPawnToolTips();

    function killOrReviveHelper(pawnElement) {
        var isPlayer = isPlayerPawn(pawnElement);

        if (revivePawn) {
            if (pawnElement.dead == "false") return;
            pawnElement.dead = "false";
            if (!isPlayer) {
                if (pawnElement.index_in_main_window) {
                    window.api.messageWindow("mainWindow", "monster-revived", {
                        name: pawnElement.dnd_name,
                        index: pawnElement.index_in_main_window,
                    });
                }
            }
        } else {
            if (pawnElement.dead == "true") return;
            pawnElement.dead = "true";
            if (!isPlayer) {
                if (pawnElement.index_in_main_window) {
                    window.api.messageWindow("mainWindow", "monster-killed", [
                        pawnElement.dnd_name,
                        pawnElement.index_in_main_window,
                    ]);
                }
            }
        }
        var arg = { dead: !revivePawn, elementId: pawnElement.id };
        serverNotifier.notifyServer("monster-health-changed", arg);
        pawnElement.setAttribute("data-state_changed", 1);
    }
}

function startAddingFromQueue() {
    var tooltip = document.getElementById("tooltip");

    tooltip.classList.remove("hidden");
    tooltip.innerHTML = "Creature #" + pawns.addQueue[0].index_in_main_window;
    var button = document.getElementById("add_from_queue_toggle_button");
    button.innerText = "Placing creatures";
    button.setAttribute("toggled", "true");
    document.onmousemove = function (e) {
        tooltip.style.top = e.clientY - 75 + "px";
        tooltip.style.left = e.clientX + 75 + "px";
    };
    gridLayer.style.cursor = "copy";
    gridLayer.onmousedown = function (e) {
        console.log(e);
        if (e.button == 0) {
            popQueue(e);
        } else {
            stopAddingFromQueue();
        }
    };

    async function popQueue(e) {
        var radiusOfPawn =
            creaturePossibleSizes.hexes[
                creaturePossibleSizes.sizes.indexOf(pawns.addQueue[0].size)
            ];
        var offset = (radiusOfPawn * cellSize) / 2;
        var popped = pawns.addQueue[0];
        pawns.addQueue.splice(0, 1);

        popped.spawnPoint = { x: e.clientX - offset, y: e.clientY - offset };
        await generatePawns([popped], true);

        requestNotifyUpdateFromMain();

        if (pawns.addQueue.length == 0) {
            document
                .getElementById("add_pawn_from_tool_toolbar")
                .classList.add("hidden");
            var button = document.getElementById(
                "add_from_queue_toggle_button"
            );

            return stopAddingFromQueue();
        }
        tooltip.innerHTML =
            "Creature #" + pawns.addQueue[0].index_in_main_window;
    }

    function stopAddingFromQueue() {
        resetGridLayer();
        button.setAttribute("toggled", "false");
        gridLayer.style.cursor = "auto";
        document.onmousemove = null;
        tooltip.classList.add("hidden");
        button.innerText = "Start adding creatures";
    }
}

function setTokenNextFacetHandler(e) {
    selectedPawns.forEach((pawn) => {
        var pawnPhoto = pawn.getElementsByClassName("token_photo")[0];
        var images = JSON.parse(pawnPhoto.getAttribute("data-token_facets"));
        if (images == null || images.length == 0) return;
        var currentIndex =
            parseInt(pawnPhoto.getAttribute("data-token_current_facet")) || 0;

        var oldIndex = currentIndex;
        currentIndex++;
        if (currentIndex >= images.length) currentIndex = 0;
        if (oldIndex == currentIndex) return;
        setPawnToken(pawn, Util.cssify(images[currentIndex]));
        pawnPhoto.setAttribute("data-token_current_facet", currentIndex);
        onBackgroundChanged(pawn);
    });
}

function setScaleIfSaved(pawn, path) {
    var scale = localStorage.getItem(`token_scale${path}`);
    if (scale) {
        map.setTokenScale(pawn, scale);
    } else {
        //Check if file name contains _ScaleXX_,
        var found = path.toLowerCase().match(/_scale.+_/g);
        if (found && found.length > 0) {
            var number = found[0].replace(/\D/g, "");
            number = parseInt(number);
            var fileScale = number/100;
            if(fileScale > 0 && fileScale < 10){
                map.setTokenScale(pawn, fileScale);
            }
        }else{
            map.setTokenScale(pawn, 1);
        }
    }
}

async function onBackgroundChanged(pawn) {
    var imgEle = pawn.getElementsByClassName("token_photo")[0];
    var facets = JSON.parse(imgEle.getAttribute("data-token_facets"));
    var current = parseInt(
        imgEle.getAttribute("data-token_current_facet") || 0
    );
    var path = facets[current];

    var base64img = await Util.toBase64(path);
    setScaleIfSaved(pawn, path);

    //Notify clients
    serverNotifier.notifyServer("token-image", {
        id: pawn.id,
        base64: base64img,
    });
}

async function setTokenImageHandler(e) {
    var input = document.getElementById("icon_load_button");
    var facetButton = document.getElementById("add_token_facet_button");

    await tokenSelector.getNewTokenPaths(true, (imagePaths) => {
        if (imagePaths == null) return;

        if (e.target == input) {
            selectedPawns.forEach((element) =>
                setPawnBackgroundFromPathArray(element, imagePaths)
            );
        } else if (e.target == facetButton) {
            selectedPawns.forEach((element) =>
                addToPawnBackgrounds(element, imagePaths)
            );
        }
    });
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
    var showHideBtn = document.getElementById("hide_in_clients_btn");
    if (selectedPawns[0].client_hidden) {
        showHideBtn.innerHTML = "Reveal in clients";
    } else {
        showHideBtn.innerHTML = "Hide in clients";
    }
    document.getElementById("background_color_button_change_pawn").value =
        selectedPawns[0].backgroundColor;

    var hasFacets = 1,
        isMob = -1;
    selectedPawns.forEach((pawn) => {
        if (
            !pawn
                .querySelector(".token_photo")
                ?.getAttribute("data-token_facets")
        )
            hasFacets = 0;
        if (pawn.classList.contains("pawn_mob")) isMob = 1;
    });
    Util.showOrHide("pawn_token_menu_button", -1 * isMob);
    Util.showOrHide("next_facet_button", hasFacets);

    popup.classList.remove("hidden");
    popup.style.left = x + "px";
    popup.style.top = y + "px";
    document.onclick = function (e) {
        document.getElementById("popup_menu_pawn").classList.add("hidden");
        document.onclick = null;
    };
}

function showPopupDialogAddPawn() {
    pauseAlternativeKeyboardMoveMap = true;
    tokenDialog.show();
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
        };
    }, 200);
}

function createConditionButton(condition) {
    var menuWindow = document.getElementById("conditions_menu");
    var btn = document.createElement("button");
    btn.className = "button_style condition_button";
    btn.onclick = function (e) {
        var name = e.target.innerHTML;

        selectedPawns.forEach((pawn) =>
            removePawnCondition(
                pawn,
                conditionList.find((x) => x.name == name)
            )
        );
        e.target.parentNode.removeChild(e.target);
    };
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
    buttons.forEach((button) => button.parentNode.removeChild(button));
    var conditionsAdded = [];
    selectedPawns.forEach(function (pawn) {
        if (!pawn["data-dnd_conditions"]) return;
        pawn["data-dnd_conditions"].forEach(function (condition) {
            if (conditionsAdded.find((x) => x == condition)) return;
            createConditionButton(condition);
            conditionsAdded.push(condition);
        });
    });
    window.setTimeout(() => menuWindow.querySelector("input").focus(), 100);
    window.setTimeout(function () {
        gridLayer.onclick = function (event) {
            hideAllTooltips();
            gridLayer.onclick = oldGridLayerOnClick;
        };
    }, 200);
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
    };
}
