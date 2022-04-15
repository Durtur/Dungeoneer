
var cellSize = 35, originalCellSize = cellSize;
const UNITS_PER_GRID = 5;
var canvasWidth = 400;
var canvasHeight = 400;
var zIndexPawnCap = 9;
var measurementTargetOrigin = null, measurementTargetDestination = null;
var measurementOriginPosition;
var currentlyMeasuring = false;
var measurementPaused = false;

var TOKEN_ACCESS;

var pawnId = 1, effectId = 1;
var pauseAlternativeKeyboardMoveMap = false;
//Elements
var measurementsLayer = document.getElementById("measurements");
var measurementsLayerContext = measurementsLayer.getContext("2d");
var gridLayer = document.getElementById("grid");
var gridLayerContext = gridLayer.getContext("2d");
var tokenLayer = document.getElementById("tokens");
//
var roundTimer;
var overlayLoop, backgroundLoop;

var LAST_KEY, lastKeyNull; //Last pressed key
//Grid 
var gridMoveOffsetX = 0, gridMoveOffsetY = 0, canvasMoveRate = 2;
var resetMoveIncrementTimer;

var mapContainers, foregroundCanvas, backgroundCanvas, overlayCanvas;


//Tokens
var loadedMonsters = [], partyArray, loadedMonstersFromMain = [];
var settings, effectFilePath;;

var fogOfWarEnabled = true, filtered = false, lastBackgroundFilter;

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
    players.clear = function () {
        while (players.length > 0)
            players.pop();
    }
    players.add = function (element) {
        this.push(element);
        players.onchange();
    }

    players.onchange = function () {
        serverNotifier.notifyServer("players-changed", players.map(x => x[1]));
    }

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

window.onresize = function () {
    window.requestAnimationFrame(resizeAndDrawGrid);
    updateHowlerListenerLocation();
}

document.addEventListener("DOMContentLoaded", function () {


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

    resetGridLayer();
    backgroundLoop = new SlideCanvas(document.getElementById("background"), "background_loop_menu");
    overlayLoop = new SlideCanvas(document.getElementById("overlay"), "overlay_loop_menu");
    document.addEventListener("visibilitychange", function () {
        if (document.hidden) {
            suspendAllAnimations();
        } else {
            resumeAllAnimations();
        }
    }, false);
});

function newPawnId() {
    return `pawn${pawnId++}`;
}


function setBackgroundFilter() {
    var filterDd = document.getElementById("filter_tool");
    if (!filterDd) return;
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
    document.querySelector("#map_layer_container").style.filter = filterValue;

    settings.currentFilter = filterDd.selectedIndex;
    saveSettings();
}

//Overriden in map.admin
function saveSettings() { }
function toggleSaveTimer() { }
async function setPlayerPawnImage() { }
async function setPawnImageWithDefaultPath(pawnElement, path) { }
function hideAllTooltips() { }
function onBackgroundChanged() { }




function suspendAllAnimations() {
    [".pawn", ".sfx_effect", ".light_effect"].forEach(cls => {
        [...document.querySelectorAll(cls)].forEach(ele => ele.classList.add("animation_paused"))
    });

}

function resumeAllAnimations() {
    [".pawn", ".sfx_effect", ".light_effect"].forEach(cls => {
        [...document.querySelectorAll(cls)].forEach(ele => ele.classList.remove("animation_paused"))
    });

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

function onMonsterHealthChanged(arg) {
    console.log(arg)
    var index = parseInt(arg.index);

    var pawn = loadedMonsters.find(x => x[0].index_in_main_window == index);

    console.log(pawn)
    if (!pawn) return;
    pawn = pawn[0];
    pawn.data_health_percentage = arg.healthPercentage;
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
    serverNotifier.notifyServer("monster-health-changed", arg);
}

function setTool(event, source, toolIndex) {
    event.stopImmediatePropagation();
    for (var i = 0; i < toolbox.length; i++) {
        toolbox[i] = false;
    }
    document.onmousemove = null;
    document.onmouseup = null;
    measurementTargetOrigin = null;
    measurementTargetDestination = null;
    measurementPaused = false;
    console.log(`Set tool ${toolIndex}`, source.getAttribute("toggled"))
    measurements.clearMeasurements();
    if (source.getAttribute("toggled") === "false") {
        source.setAttribute("toggled", "true");

        gridLayer.onmousedown = measurements.startMeasuring;
        gridLayer.ontouchstart = measurements.startMeasuring;
        toolbox[toolIndex] = true;
        gridLayer.style.cursor = "crosshair";
        tooltip.classList.add("hidden");

        if (toolIndex != 0) {
            gridLayer.style.zIndex = 5;
        }
    } else {
        source.setAttribute("toggled", "false");
        gridLayer.style.cursor = "auto";
        stopMeasuring(null, true);
        //toggle button handler will then set to false

        window.setTimeout(() => {
            source.setAttribute("toggled", "false");
            measurements.clearMeasurements();
        }, 300);

    }
}



function setMapOverlayAsBase64(path, width, height) {
    setOverlayHelper(path, width, height)
}

function setOverlayHelper(path, width, height) {
    overlayCanvas.style.backgroundImage = path;
    overlayCanvas.setAttribute("data-original_height", height);
    overlayCanvas.setAttribute("data-original_width", width);
    overlayCanvas.heightToWidthRatio = height / width;
    overlayCanvas.style.width = width + "px";
    overlayCanvas.style.height = height + "px";
    settings.gridSettings.mapOverlaySize = width;


    toggleSaveTimer();
    serverNotifier.notifyServer("overlay", serverNotifier.getOverlayState());
    onOverlayResized(width);
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
        if (!width) width = img.width;
        setOverlayHelper('url("' + path + '")', width, overlayCanvas.heightToWidthRatio * width);

    }
    img.src = path;

}

function setMapForegroundAsBase64(path, width, height) {
    setForegroundHelper(path, width, height)
}


function setForegroundHelper(path, width, height) {
    foregroundCanvas.style.backgroundImage = path;
    foregroundCanvas.setAttribute("data-original_height", height);
    foregroundCanvas.setAttribute("data-original_width", width);
    foregroundCanvas.heightToWidthRatio = height / width;
    foregroundCanvas.style.width = width + "px";
    foregroundCanvas.style.height = height + "px";
    settings.gridSettings.mapSize = width;

    settings.gridSettings.foregroundHeight = height;

    toggleSaveTimer();
    serverNotifier.notifyServer("foreground", serverNotifier.getForegroundState());
    onForegroundResized(width);
}

function setMapForeground(path, width) {
    var btn = document.getElementById("foreground_button");
    if (!path) {
        foregroundCanvas.style.backgroundImage = 'none';
        btn.innerHTML = "Image";
        return;
    }
    if (btn)
        btn.innerHTML = pathModule.basename(path);
    var img = new Image();
    if (settings.matchSizeWithFileName) {
        width = getMapWidthFromFileName(path, width);

    }
    img.onload = function () {
        var mapWidth = width ? width : img.width;
        var imgWidthToOldWidth = width ? mapWidth / img.width : 1;
        var height = img.height * imgWidthToOldWidth;
        setForegroundHelper('url("' + path + '")', mapWidth, height);
    }
    img.src = path;
    settings.currentMap = path;

}

function setMapBackgroundAsBase64(path, width, height) {
    setMapBackgroundHelper(path, width, height);
}


function setMapBackgroundHelper(path, width, height) {
    console.log(width, height)
    settings.gridSettings.mapBackgroundSize = width;
    backgroundCanvas.heightToWidthRatio = height / width;

    backgroundCanvas.style.backgroundImage = path;
    resizeBackground(width);
    serverNotifier.notifyServer("background", serverNotifier.getBackgroundState());
}

function setMapBackground(path, desiredWidth) {
    var btn = document.getElementById("background_button");
    settings.currentBackground = path;
    if (!path) {
        backgroundCanvas.style.backgroundImage = 'none';
        btn.innerHTML = "Image";
        serverNotifier.notifyServer("background", null);
        return;
    }
    if (settings.matchSizeWithFileName) {
        desiredWidth = getMapWidthFromFileName(path, desiredWidth);
    }
    btn.innerHTML = pathModule.basename(path);
    var img = new Image();

    img.onload = function () {
        var ratio = img.height / img.width;
        if (!desiredWidth) desiredWidth = img.width;
        setMapBackgroundHelper('url("' + path + '")', desiredWidth, ratio * desiredWidth);

    }
    img.src = path;
}


function resizeForeground(newWidth) {
    foregroundCanvas.style.width = newWidth + "px";
    foregroundCanvas.style.height = newWidth * foregroundCanvas.heightToWidthRatio + "px";
    onForegroundResized(newWidth);
    window.clearTimeout(serverNotifier.timeouts.foreground);
    serverNotifier.timeouts.foreground = window.setTimeout(() => serverNotifier.notifyServer("foreground-size", { width: newWidth }), 1000);

}

function onForegroundResized(newWidth) {
    (document.getElementById("foreground_size_slider") || {}).value = newWidth;
    settings.gridSettings.mapSize = newWidth;
    fovLighting.drawSegments();
    var inp = document.getElementById("foreground_cells_input");
    if (inp) {
        var cells = newWidth / originalCellSize;
        inp.value = cells.toFixed(2);
    }
    toggleSaveTimer();
}

function resizeBackground(newWidth) {
    console.log(`Resize background ${newWidth}`)
    backgroundCanvas.style.width = newWidth + "px";
    backgroundCanvas.style.height = newWidth * backgroundCanvas.heightToWidthRatio + "px";


    window.clearTimeout(serverNotifier.timeouts.background)
    serverNotifier.timeouts.background = window.setTimeout(() => serverNotifier.notifyServer("background-size", { width: newWidth }), 1000);
    onBackgroundResized(newWidth);

}

function onBackgroundResized(newWidth) {
    (document.getElementById("background_size_slider") || {}).value = newWidth;
    var inp = document.getElementById("background_cells_input");
    if (inp) {
        var cells = newWidth / originalCellSize;
        inp.value = cells.toFixed(2);
    }
    toggleSaveTimer();
}

function resizeOverlay(newWidth) {
    overlayCanvas.style.width = newWidth + "px";
    overlayCanvas.style.height = newWidth * overlayCanvas.heightToWidthRatio + "px";

    window.clearTimeout(serverNotifier.timeouts.overlay)
    serverNotifier.timeouts.overlay = window.setTimeout(() => serverNotifier.notifyServer("overlay-size", { width: newWidth }), 1000);
    onOverlayResized(newWidth);

}

function onOverlayResized(newWidth) {
    (document.getElementById("overlay_size_slider") || {}).value = newWidth;
    var inp = document.getElementById("overlay_cells_input");
    if (inp) {
        var cells = newWidth / originalCellSize;
        inp.value = cells.toFixed(2);
    }
    toggleSaveTimer();
}


var toolbox = [false, false, false, false, false];

function refreshPawns() {
    pawns.small = document.querySelectorAll(".pawn_small");
    pawns.medium = document.querySelectorAll(".pawn_medium");
    pawns.large = document.querySelectorAll(".pawn_large");
    pawns.huge = document.querySelectorAll(".pawn_huge");
    pawns.gargantuan = document.querySelectorAll(".pawn_gargantuan");
    pawns.colossal = document.querySelectorAll(".pawn_colossal");
    pawns.all = document.querySelectorAll(".pawn");

}

function refreshPawnToolTips() {
    refreshPawnToolTipsHelper(pawns.players);
    if (loadedMonsters == null) return;
    refreshPawnToolTipsHelper(loadedMonsters);
}

function refreshPawnToolTipsHelper(arr, monster) {
    for (var i = 0; i < arr.length; i++) {
        var element = arr[i][0];
        var changed = element.getAttribute("data-state_changed");
        if (!changed)
            continue;

        flyingHeight = parseInt(element.flying_height);
        element.title = arr[i][1];
        if (flyingHeight != 0) element.title += "\n Flying: " + flyingHeight + " ft"
        if (element.dead == "true") {
            element.title += "\n Dead/Unconscious"
            element.classList.add("pawn_dead");
        } else {
            element.classList.remove("pawn_dead");
        }
        element.setAttribute("data-state_changed", null);


    }
}


function onPawnsMoved() {
    updateHowlerListenerLocation();
}



function moveForeground(x, y) {
    foregroundCanvas.data_transform_x = x;
    foregroundCanvas.data_transform_y = y;
    foregroundCanvas.style.transform = `translate(${x}px, ${y}px)`
    serverNotifier.notifyServer("foreground-translate", { x: foregroundCanvas.data_transform_x, y: foregroundCanvas.data_transform_y });
}

function moveMap(x, y) {
    mapContainers.forEach(container => {
        container.data_transform_x = x;
        container.data_transform_y = y;
        container.style.setProperty("--bg-translate-x", x);
        container.style.setProperty("--bg-translate-y", y);
    });


}



function startMovingMap(e) {
    if (currentlyMeasuring || (e.touches && e.touches.length > 1)) return;
    gridLayer.style.cursor = "-webkit-grabbing";

    var dragMoveTimestamp;
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    var clientX = e.touches ? e.touches[0].clientX : e.clientX;
    var clientY = e.touches ? e.touches[0].clientY : e.clientY;
    pos3 = clientX;
    pos4 = clientY;
    console.log(pos3, pos4);
    document.onmouseup = function (event) {
        document.onmouseup = null;
        document.onmousemove = null;
        document.ontouchmove = null;
        gridLayer.style.cursor = "auto";
    };

    document.ontouchmove = dragMoveMap;
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
            clientX = e.touches ? e.touches[0].clientX : e.clientX;
            clientY = e.touches ? e.touches[0].clientY : e.clientY;

            pos1 = pos3 - clientX;
            pos2 = pos4 - clientY;
            pos3 = clientX;
            pos4 = clientY;

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
            map.drawGrid();
            window.requestAnimationFrame(refreshFogOfWar);

        })

    }
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

        moveMap(bgX, bgY);

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
    var clientX = event.clientX || event.touches[0].clientX;
    var clientY = event.clientY || event.touches[0].clientY;
    tooltip.style.top = clientY - 100 + "px";;
    tooltip.style.left = clientX + "px";;
    tooltip.innerHTML = "0 ft";
    tooltip.innerHTML = text;
    tooltip.classList.remove("hidden");
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

function enlargeReduceSelectedPawns(direction) {
    selectedPawns.forEach(element => enlargeReducePawn(element, direction));

}

function enlargeReducePawn(element, direction) {
    console.log(`Enlarge reduce ${direction}`, element)
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
    if (serverNotifier.isServer())
        serverNotifier.notifyServer("token-size", { id: element.id, direction: direction });

    refreshPawns();
    resizePawns();
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
    if (condition.background_image) {
        newDiv.style.backgroundColor = "rgba(0,0,0,0)";
        newDiv.style.backgroundImage = condition.background_image;
    }

    var text = document.createElement("div");
    text.classList = "column";
    var h2 = document.createElement("h2");
    h2.innerHTML = condition.name;
    var p = document.createElement("p");
    p.innerHTML = condition.description;
    text.appendChild(h2);
    text.appendChild(p);

    if (condition.condition_background_location) {
        var img = document.createElement("img");
        img.setAttribute("src", condition.condition_background_location);
        text.prepend(img);
    }
    text.className = "condition_text";
    newDiv.appendChild(text);
    newDiv.setAttribute("data-dnd_condition_full_name", conditionString);
    pawnElement.querySelector(".token_status").appendChild(newDiv);
    raiseConditionsChanged(pawnElement, originMainWindow);
}

function refreshMobSize(pawnElement) {
    var sizePerCreature = pawnElement.dnd_hexes * cellSize;
    pawnElement.style.width = sizePerCreature * parseInt(pawnElement.getAttribute("data-mob_size")) + "px";
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
            ele.style.backgroundImage = Util.cssify(tokenPaths.pickOne());

            container.appendChild(ele);
            var base = document.createElement("div");
            base.classList = "dead_marker";
            ele.appendChild(base);
        }

    }

    var allTokens = [...pawn.querySelectorAll(".mob_token")];
    if (allTokens.length == 0) return map.removePawn(pawn);
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
        return map.removePawn(pawn);
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
                    toggleButtons[i].setAttribute("toggled", "false");
                }
            }
            document.onmousedown = null;
            resetGridLayer();
            currentlyMeasuring = false;
            currentlyAddingSegments = false;
            lastMeasuredPoint = null;
            gridLayer.style.zIndex = 4;
        }

        for (var i = 0; i < toolbox.length; i++) {
            toolbox[i] = false;
        }
        tooltip.classList.add("hidden");
        document.onmousemove = null;
        document.onmouseup = null;
        document.ontouchmove = null;
        document.ontouchend = null;
        totalMeasuredDistance = 0;
        measurementTargetOrigin = null;
        measurementTargetDestination = null;
        measurementPaused = false;
        segmentMeasurementPaused = false;
        lastMeasuredPoint = null;
        hideAllTooltips();
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

function refreshMeasurementTooltip() {
    var tooltip = document.getElementById("tooltip");
    if (tooltip.classList.contains("hidden")) {
        return;
    }

    if (measurementTargetDestination != null && measurementTargetOrigin != null) {

        var destinationPoint = {
            x: parseInt(measurementTargetDestination.style.left),
            y: parseInt(measurementTargetDestination.style.top),
            z: cellSize / UNITS_PER_GRID * parseInt(measurementTargetDestination.flying_height)
        }
        var originPosition = {
            x: parseInt(measurementTargetOrigin.style.left),
            y: parseInt(measurementTargetOrigin.style.top),
            z: cellSize / UNITS_PER_GRID * parseInt(measurementTargetOrigin.flying_height)
        }

        tooltip.innerHTML = Math.round(
            Math.sqrt(
                Math.pow(destinationPoint.x - originPosition.x, 2) +
                Math.pow(destinationPoint.y - originPosition.y, 2) +
                Math.pow(destinationPoint.z - originPosition.z, 2)
            ) / cellSize * 5) + " ft";

    }

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
function setPawnBackgroundFromPathArray(element, paths, cssify = true) {
    var pathString;
    var tokenPaths = [];
    if (typeof paths == "string") {
        pathString = cssify ? Util.cssify(paths) : paths;
        tokenPaths.push(pathString)
    } else {
        var rand = Math.round(Math.random() * (paths.length - 1));
        paths.forEach(path => {

            tokenPaths.push(path);
        })
        pathString = Util.cssify(paths[rand]);
    }
    var imgEle = element.getElementsByClassName("token_photo")[0]
    imgEle.style.backgroundImage = pathString;
    imgEle.setAttribute("data-token_facets", JSON.stringify(tokenPaths));
    imgEle.setAttribute("data-token_current_facet", rand);
    onBackgroundChanged(element);
}



function setPawnToken(pawn, url) {
    var pawnPhoto = pawn.getElementsByClassName("token_photo")[0];
    pawnPhoto.style.backgroundImage = url;
}


function isPlayerPawn(pawnElement) {
    for (var i = 0; i < pawns.players.length; i++) {
        if (pawns.players[i][0] == pawnElement) {
            return true;

        }
    }
    return false;
}

function resetGridLayer() {
    gridLayer.oncontextmenu = function (e) { e.preventDefault(); e.stopPropagation(); }
    gridLayer.onmousedown = generalMousedowngridLayer;
    gridLayer.ontouchstart = startMovingMap;
    gridLayer.style.cursor = "auto";
}


var selectedPawns = [];
function dragPawn(elmnt) {
    var posX = 0, posY = 0, pos3 = 0, pos4 = 0, originPosition = { x: elmnt.offsetLeft, y: elmnt.offsetTop }, oldLine;
    elmnt.onmousedown = dragMouseDown;
    elmnt.ontouchstart = dragMouseDown;
    var tooltip = document.getElementById("tooltip");
    var distance;
    var offsetX, offsetY;

    function dragMouseDown(e) {
        console.log(e)
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
                        z: cellSize / UNITS_PER_GRID * parseInt(e.target.flying_height),
                    }, e
                );
                measurementPaused = true;
                return;
            }
            return measurements.startMeasuring(e);
        }
        if (e.buttons == 1 || e.touches) {
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
                    resetGridLayer();
                }
            } else {

                if (isSelectedPawn(e.target) < 0)
                    clearSelectedPawns();
                setupMeasurements();
                originPosition = { x: parseFloat(elmnt.style.left), y: parseFloat(elmnt.style.top) };
                measurementsLayerContext.moveTo(originPosition.x + offsetX, originPosition.y + offsetY);
                showToolTip(e, "0 ft", "tooltip")
                e = e || window.event;
                e.preventDefault();

                // get the mouse cursor position at startup:
                pos3 = e.clientX || e.touches[0].clientX;
                pos4 = e.clientY || e.touches[0].clientY;
                document.onmouseup = closeDragElement;
                document.ontouchend = closeDragElement;
                // call a function whenever the cursor moves:
                document.onmousemove = elementDrag;
                document.ontouchmove = elementDrag;


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
            var clientX = e.clientX || e.touches[0].clientX;
            var clientY = e.clientY || e.touches[0].clientY;
            posX = pos3 - clientX;
            posY = pos4 - clientY;
            pos3 = clientX;
            pos4 = clientY;
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

                    if (!obj)
                        return;
                    obj.style.top = (obj.offsetTop - posY) + "px";
                    obj.style.left = (obj.offsetLeft - posX) + "px";
                    if (obj.sound)
                        soundManager.adjustPlacement(obj.id, (obj.offsetLeft - posX), (obj.offsetTop - posY));
                });
            }

            // serverNotifier.notifyServer("object-moved", selectedPawns.map(pawn => {
            //     return {
            //         pos: map.objectGridCoords(pawn),
            //         id: pawn.id
            //     }
            // }).concat({
            //     pos: map.objectGridCoords(elmnt),
            //     id: elmnt.id

            // }));
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
                map.snapToGrid(elmnt);
            } else {
                selectedPawns.forEach(pwn => {
                    map.snapToGrid(pwn);
                })
            }
        }

        document.onmouseup = null;
        document.onmousemove = null;
        refreshFogOfWar();
        measurements.clearMeasurements();
        originPosition = { x: elmnt.offsetLeft, y: elmnt.offsetTop }
        tooltip.classList.add("hidden");
        serverNotifier.notifyServer("object-moved", selectedPawns.map(pawn => {
            return {
                pos: map.objectGridCoords(pawn),
                id: pawn.id,
                distance: tooltip.innerHTML,
                idx: elmnt.index_in_main_window
            }
        }).concat({
            pos: map.objectGridCoords(elmnt),
            id: elmnt.id,
            distance: tooltip.innerHTML,
            idx: elmnt.index_in_main_window

        }));

    }
}

function onPerspectiveChanged() {
    fovLighting.setPerspective();
    updateHowlerListenerLocation();
}


var hideTooltipTimer;
function addPawnListeners() {
    for (var i = 0; i < pawns.all.length; i++) {
        var pawn = pawns.all[i];
        if (serverNotifier.isServer() || (TOKEN_ACCESS != null && TOKEN_ACCESS.find(x => x.element_id == pawn.id || x.element_id == "all"))) {
            allowAccess(pawn);

        } else {
            pawn.classList.remove("pawn_accessed");
            pawn.onmousedown = null;
            pawn.ontouchstart = null;
            pawn.onwheel = null;
        }
    }

    function allowAccess(pawn) {
        dragPawn(pawn)
        pawn.classList.add("pawn_accessed");
        if (pawn.deg == null) pawn.deg = 0;
        pawn.onwheel = function (event) {
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





function isSelectedPawn(pawn) {
    for (var i = 0; i < selectedPawns.length; i++) {
        if (selectedPawns[i] == pawn)
            return i;
    }
    return -1;
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

var currentListenerPawn;
function updateHowlerListenerLocation() {
    var forcedPerpspectiveDD = document.getElementById("fov_perspective_dropdown");
    if (forcedPerpspectiveDD.selectedIndex < 0) {
        currentListenerPawn = null;
        soundManager.setListenerCords(window.innerWidth / 2, window.innerHeight / 2, null);
        return;
    }
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
        resetGridLayer();
        return false;
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


function resizePawns() {

    resizeHelper(pawns.all);
}



var lastIndexInsertedMonsters = 1;
var lastColorIndex = 0;
async function generatePawns(pawnArray, monsters, optionalSpawnPoint) {
    var newPawn, lastPoint, rotate, sightRadiusBright, sightRadiusDim, sightMode;
    console.log("Generating ", pawnArray, monsters)
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
        var id = pawn.id || newPawnId();
        newPawn.id = id;
        newPawn.get = () => document.getElementById(id);

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
            pawns.players.add([newPawn, pawn.name]);


        } else {
            if (addingFromMainWindow || pawn.index_in_main_window) {
                var index = pawn.index_in_main_window ? pawn.index_in_main_window : lastIndexInsertedMonsters++;
                removeDuplicatePawnNumbers(index);
                newPawn.setAttribute("index_in_main_window", index);
                newPawn.index_in_main_window = index;
                newPawn.classList.add("pawn_numbered");

            }

            pawns.monsters.push(newPawn);
            loadedMonsters.push([newPawn, pawn.name]);
        }
        if (settings.colorTokenBases) {
            newPawn.style.backgroundColor = pawn.color;
        } else {
            newPawn.style.backgroundColor = "transparent";

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


            optionalPaths = pawn.bgPhoto || pawn.bgPhotoBase64;
            if (optionalPaths != null) {
                setPawnBackgroundFromPathArray(newPawn, optionalPaths, pawn.bgPhotoBase64 == null);
            } else {
                monsters ?
                    await setPawnImageWithDefaultPath(newPawn, pawn.monsterId)
                    : await setPlayerPawnImage(newPawn, pawn.id)
            }
        }

        rotatePawn(newPawn, pawn.deg || rotate)
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
        if (serverNotifier.isServer()) {
            serverNotifier.notifyServer("token-add", await saveManager.exportPawn([newPawn, pawn.name]));
        }
    };
    refreshPawns();
    resizePawns();
    addPawnListeners();

    return newPawn;
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
    map.drawGrid();
    if (previewPlacementElement)
        adjustPreviewPlacement(event);
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

    raiseConditionsChanged(pawnElement, originMainWindow);

}

function raiseConditionsChanged(pawn, originMainWindow) {

    var idx = pawn.getAttribute("index_in_main_window");

    if (serverNotifier.isServer()) {
        serverNotifier.notifyServer("token-conditions", { id: pawn.id, conditionList: pawn["data-dnd_conditions"] })
        if (!originMainWindow)
            window.api.messageWindow('mainWindow', 'condition-list-changed', {
                conditionList: pawn["data-dnd_conditions"],
                index: idx ? idx : pawn.title
            });
    }
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


function switchActiveViewer() {
    fovLighting.toggleDarkvision();
    refreshFogOfWar();
    setBackgroundFilter();

}

/* #endregion */

var map = function () {
    function init() {
        refreshPawns();
        setupGridLayer();
        resizeAndDrawGrid();
        refreshFogOfWar();
    }

    function onzoom(event) {
        if (!event.shiftKey) {
            var dir = event.deltaY > 0 ? -0.1 : 0.1;

            zoomIntoMap(event, dir);

        }
    }
    function onkeydown() {
        var container = mapContainers[0];
        var bgX = container.data_transform_x;
        var bgY = container.data_transform_y;
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
        map.drawGrid();
        nudgePawns(movementX, movementY)

        fovLighting.nudgeSegments(movementX, movementY);
        fovLighting.drawSegments();
        window.requestAnimationFrame(refreshFogOfWar);
    }


    function clearGrid() {
        gridLayerContext.save();
        gridLayerContext.setTransform(1, 0, 0, 1, 0, 0);
        gridLayerContext.clearRect(0, 0, gridLayer.width, gridLayer.height);
        gridLayerContext.restore();
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


    //Returns grid coordinates of an element
    function objectGridCoords(pawn) {


        var left = parseFloat(pawn.style.left);
        var top = parseFloat(pawn.style.top);
        return toGridCoords(left, top);

    }

    function toGridCoords(x, y) {
        var rect = foregroundCanvas.getBoundingClientRect();
        var backgroundOriginX = rect.left;
        var backgroundOriginY = rect.top;
        var cellsFromLeft = (x - backgroundOriginX)
            / (cellSize);
        var cellsFromTop = (y - backgroundOriginY)
            / (cellSize);
        return { x: cellsFromLeft, y: cellsFromTop }
    }

    function pixelsFromGridCoords(cellsX, cellsY) {
        var rect = foregroundCanvas.getBoundingClientRect();
        var backgroundOriginX = rect.left;
        var backgroundOriginY = rect.top;
        return { x: cellsX * cellSize + backgroundOriginX, y: cellsY * cellSize + backgroundOriginY }
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
        serverNotifier.notifyServer("pawn-removed", element.id)
    }

    function removeAllPawns() {
        [...document.querySelectorAll(".pawn")].forEach(x => x.parentNode.removeChild(x));
        loadedMonsters = [];
        pawns.players.clear();
    }

    function moveObject(elmnt, point, userAction = true) {
        var oldX = parseFloat(elmnt.style.left);
        var oldY = parseFloat(elmnt.style.top);
        var diffX = oldX - point.x;
        var diffY = oldY - point.y;
        elmnt.style.left = point.x + "px";
        elmnt.style.top = point.y + "px";

        if (elmnt.attached_objects)
            elmnt.attached_objects.forEach(obj => {
                console.log(obj);
                if (!obj)
                    return;
                var currX = parseFloat(obj.style.left);
                var currY = parseFloat(obj.style.top);
                currX -= diffX;
                currY -= diffY;
                moveObject(obj, { x: currX, y: currY }, userAction);

            });
        if (userAction)
            serverNotifier.notifyServer("object-moved", [{
                pos: map.objectGridCoords(elmnt),
                id: elmnt.id
            }]);
    }


    function snapToGrid(elmnt) {

        var positionOnTranslatedGrid = {
            x: Math.round((elmnt.offsetLeft - gridMoveOffsetX) / cellSize) * cellSize,
            y: Math.round((elmnt.offsetTop - gridMoveOffsetY) / cellSize) * cellSize
        }

        moveObject(elmnt, { x: positionOnTranslatedGrid.x + gridMoveOffsetX, y: positionOnTranslatedGrid.y + gridMoveOffsetY });

    }
    function removeAllEffects() {
        effects.forEach(eff => effectManager.removeEffect(eff));

    }

    function setTokenConditions(pawn, conditions) {
        removeAllPawnConditions(pawn, true);
        conditions.forEach(cond => setPawnCondition(pawn, conditionList.filter(x => x.name.toLowerCase() == cond.toLowerCase())[0], true))
    }

    function updateInitiative(arg) {
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
            var dropdown = document.getElementById("fov_perspective_dropdown");

            if (dropdown.value.toLowerCase() != "players") {
                var currentDd = [...dropdown.options].find(x => x.value == curr.current.name);
                dropdown.value = currentDd ? currentDd.value : dropdown.options[0].value;
                onPerspectiveChanged();
            }

            if (roundTimer) {
                roundTimer.stop();
                roundTimer.reset();
                roundTimer.start();
            }

            return;
        }
        if (arg.empty) return initiative.empty();
    }

    return {
        init: init,
        updateInitiative: updateInitiative,
        setTokenConditions: setTokenConditions,
        snapToGrid: snapToGrid,
        removePawn: removePawn,
        moveObject: moveObject,
        removeAllPawns: removeAllPawns,
        removeAllEffects: removeAllEffects,
        onkeydown: onkeydown,
        onzoom: onzoom,
        objectGridCoords: objectGridCoords,
        toGridCoords: toGridCoords,
        pixelsFromGridCoords: pixelsFromGridCoords,
        drawGrid: drawGrid
    }
}();