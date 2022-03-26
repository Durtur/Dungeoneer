
var cellSize = 35, originalCellSize = cellSize;
var canvasWidth = 400;
var canvasHeight = 400;
var zIndexPawnCap = 9;



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

    gridLayer.onmousedown = generalMousedowngridLayer;

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

//Overriden in map.admin
function saveSettings() { }
function toggleSaveTimer() { }



function suspendAllAnimations() {
    $(".pawn, .sfx_effect, .light_effect").addClass("animation_paused");
}

function resumeAllAnimations() {
    $(".pawn, .sfx_effect, .light_effect").removeClass("animation_paused");
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
    document.onmousemove = null;
    document.onmouseup = null;
    measurementTargetOrigin = null;
    measurementTargetDestination = null;
    measurementPaused = false;
    console.log(`Set tool ${toolIndex}`)
    measurements.clearMeasurements();
    if (source.getAttribute("toggled") === "false") {
        gridLayer.onmousedown = measurements.startMeasuring;
        toolbox[toolIndex] = true;
        gridLayer.style.cursor = "crosshair";
        tooltip.classList.add("hidden");

        if (toolIndex != 0) {
            gridLayer.style.zIndex = 5;
        }
    } else {
        gridLayer.style.cursor = "auto";
        stopMeasuring(null, true);
        //toggle button handler will then set to false
        source.setAttribute("toggled", "true");

    }
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
function resizeForeground(newWidth) {
    foregroundCanvas.style.width = newWidth + "px";
    foregroundCanvas.style.height = newWidth * foregroundCanvas.heightToWidthRatio + "px";

    document.getElementById("foreground_size_slider").value = newWidth;
    settings.gridSettings.mapSize = newWidth;

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
            gridLayer.onmousedown = generalMousedowngridLayer;
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


function removeDuplicatePawnNumbers(index) {
    var pawns = [...document.getElementsByClassName("pawn_numbered")];
    pawns.forEach(function (pawn) {
        if (pawn.index_in_main_window === index) {
            pawn.classList.remove("pawn_numbered");
            pawn.index_in_main_window = "";
        }
    });

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
         var id = newPawnId();
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
 


var map = function () {
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
        drawGrid();
        nudgePawns(movementX, movementY)

        fovLighting.nudgeSegments(movementX, movementY);
        fovLighting.drawSegments();
        window.requestAnimationFrame(refreshFogOfWar);
    }

    return {
        onkeydown: onkeydown,
        onzoom: onzoom
    }
}();