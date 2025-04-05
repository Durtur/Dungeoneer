

var fovToolbox = [false, false];
var currentlyAddingSegments = false, currentlyDeletingSegments = false, segmentMeasurementPaused = false;

var addSegmentTargetOrigin, addSegmentTargetDestination;
var maskCanvas = document.createElement('canvas');
var maskCtx = maskCanvas.getContext('2d');
function setFovVisibilityTool(source, toolIndex) {
    clearSelectedPawns();
    for (var i = 0; i < fovToolbox.length; i++) {
        fovToolbox[i] = false;
    }
    lastMeasuredPoint = null;
    if (source.getAttribute("toggled") === "false") {
        gridLayer.onmousedown = measurements.startMeasuring;
        gridLayer.ontouchstart = measurements.startMeasuring
        fovToolbox[toolIndex] = true;
        gridLayer.style.cursor = "crosshair";
        tooltip.classList.add("hidden");
        document.onmousemove = null;
        document.onmouseup = null;
        addSegmentTargetOrigin = null;
        addSegmentTargetDestination = null;
        // measurementPaused = false;
        segmentMeasurementPaused = false;
        gridLayer.style.zIndex = 5;

    } else {
        gridLayer.style.cursor = "auto";
    }
}

var fovLighting = function () {
    const MapFogEnum = {
        Dark: 1,
        LowLight: 0,
        None: 2
    };
    const SEGMENT_COLOR = "#660666";
    const SEGMENT_SELECTION_MARGIN = 3;
    var mapIsBlack = false;
    var fovLayer = document.getElementById("fog_of_war");

    var fogOfWarLayerContext = document.getElementById("fog_of_war").getContext("2d");
    var fogOfWarSegmentLayerCanvas = document.getElementById("fog_of_war_segments");
    var fovSegmentLayerContext = fogOfWarSegmentLayerCanvas.getContext("2d");
    const SEGMENT_COUNT_BEFORE_OPTIMIZATION = 1200;
    var activeFogType = MapFogEnum.None;
    var activeViewerHasDarkvision = false;
    function setFogStyle(fogStyle) {
        activeFogType = fogStyle;
        serverNotifier.notifyServer("fog-set", fogStyle);
    }

    function isDark(){
        return activeFogType != MapFogEnum.None;
    }

    function getFogStyle() {
        return activeFogType;
    }

    function toggleDarkvision() {
        activeViewerHasDarkvision = !activeViewerHasDarkvision;
    }

    function viewerHasDarkvision() {
        return activeViewerHasDarkvision;
    }

    function scaleLayers(scale) {
        console.log(`Scale lighting layers: ${scale}`);
        fogOfWarLayerContext.setTransform(1, 0, 0, 1, 0, 0);
        fogOfWarLayerContext.scale(scale, scale);
        maskCtx.setTransform(1, 0, 0, 1, 0, 0);
        maskCtx.scale(scale, scale);
        fovSegmentLayerContext.setTransform(1, 0, 0, 1, 0, 0);
        fovSegmentLayerContext.scale(scale, scale);
    }


    function resizeCanvas() {
        var width = fovLayer.getAttribute("width");
        var height = fovLayer.getAttribute("height");
        if (width == canvasWidth && height == canvasHeight)
            return;
        fovLayer.setAttribute('width', canvasWidth);
        fovLayer.setAttribute('height', canvasHeight);


        maskCanvas.setAttribute('width', canvasWidth);
        maskCanvas.setAttribute('height', canvasHeight);

        fogOfWarSegmentLayerCanvas.setAttribute('width', canvasWidth);
        fogOfWarSegmentLayerCanvas.setAttribute('height', canvasHeight);


        fillMapToBlack();
    }
    function fillMapToBlack() {
        if (mapIsBlack) return;
        var fogColor;
        if (activeFogType == MapFogEnum.LowLight) {
            fogColor = Util.hexToRGBA(settings.fogOfWarHue, 0.8);
        } else if (activeFogType == MapFogEnum.Dark) {
            fogColor = settings.fogOfWarHue;
        } else {
            return;
        }
        fogOfWarLayerContext.globalCompositeOperation = 'source-over';
        fogOfWarLayerContext.beginPath();
        fogOfWarLayerContext.fillStyle = fogColor;
        fogOfWarLayerContext.fillRect(0, 0, gridLayer.width * DEVICE_SCALE, gridLayer.height * DEVICE_SCALE);
        fogOfWarLayerContext.stroke();

        mapIsBlack = true;


    }
    // DRAWING
    var segments = [];
    var uniqueSegmentPoints = [];
    var forcedPerspectiveOrigin;
    var DRAW_EXECUTE_TIMEOUT;
    function drawFogOfWar() {
        if (segments.length < SEGMENT_COUNT_BEFORE_OPTIMIZATION)
            return doDrawFogOfWar();

        window.clearTimeout(DRAW_EXECUTE_TIMEOUT);
        DRAW_EXECUTE_TIMEOUT = window.setTimeout(function () {
            doDrawFogOfWar();
        }, 50);
    }

    function doDrawFogOfWar() {
        // Draw segments

        drawSegments();
        clearFogOfWar();
        //Base black
  
        if ([MapFogEnum.Dark, MapFogEnum.LowLight].includes(activeFogType)) {
            fillMapToBlack();
            for (var i = 0; i < pawns.lightSources.length; i++) {
                draw(pawns.lightSources[i]);
            }
        }
        if (!forcedPerspectiveOrigin?.length)
            return;

        fogOfWarLayerContext.globalCompositeOperation = 'source-over';

        // Ensure same dimensions
        maskCanvas.width = fovLayer.width;
        maskCanvas.height = fovLayer.height;

        maskCtx.fillStyle = settings.fogOfWarHue;
        maskCtx.fillRect(0, 0, maskCanvas.width * DEVICE_SCALE, maskCanvas.height * DEVICE_SCALE);

        forcedPerspectiveOrigin.forEach(entry => draw(entry, true));
        maskCtx.globalCompositeOperation = 'destination-out';
        forcedPerspectiveOrigin.forEach(entry => {
            drawVisionLines(parseFloat(entry.style.left) + entry.clientWidth / 2,
                parseFloat(entry.style.top) + entry.clientHeight / 2, maskCtx);
            maskCtx.fill();
        });

        fogOfWarLayerContext.globalCompositeOperation = 'source-over';
        fogOfWarLayerContext.drawImage(maskCanvas, 0, 0);


        clearMask();
        mapIsBlack = false;
    }
    function draw(currentPawn, isOrigin) {

        if (currentPawn.sight_mode == "darkvision" && !activeViewerHasDarkvision && !isPlayerPawn(currentPawn) ||
            (forcedPerspectiveOrigin && !forcedPerspectiveOrigin.find(x => x == currentPawn) && currentPawn.sight_mode == "darkvision")) {
            return;
        }
        var pawnX, pawnY;
        pawnX = parseFloat(currentPawn.style.left) + currentPawn.clientWidth / 2;
        pawnY = parseFloat(currentPawn.style.top) + currentPawn.clientHeight / 2;

        if (!isOrigin && isOffScreen(currentPawn))
            return;

        fogOfWarLayerContext.globalCompositeOperation = 'destination-out';
        drawVisionLines(pawnX, pawnY, fogOfWarLayerContext);
        paintVision(currentPawn, pawnX, pawnY);


    }

    function isOffScreen(pawn) {
        pawn.sight_radius_brigth_pixels = parseFloat(pawn.sight_radius_bright_light) * cellSize / UNITS_PER_GRID;
        pawn.sight_radius_dim_pixels = parseFloat(pawn.sight_radius_dim_light || 1) * cellSize / UNITS_PER_GRID;
        var totalRadius = pawn.sight_radius_brigth_pixels + pawn.sight_radius_dim_pixels;
        var margin = pawn.sight_mode == "darkvision" ? 0 : totalRadius;
        var rect = pawn.getBoundingClientRect();
        var isOffScren =
            (
                (rect.x + rect.width) < 0 - margin
                || (rect.y + rect.height) < 0 - margin
                || (rect.x > window.innerWidth + margin || rect.y > window.innerHeight + margin)
            );

        return isOffScren;
    }

    function paintVision(currentPawn, pawnX, pawnY) {
        if (isNaN(pawnX) || isNaN(pawnY))
            return;

        var sightRadiusBright, sightRadius;
        //Special handling if this is a player that should be always visible
        if (currentPawn.sight_mode == "darkvision" && !activeViewerHasDarkvision) {
            sightRadiusBright = cellSize / UNITS_PER_GRID;
            sightRadius = cellSize / UNITS_PER_GRID * 2;
        } else {
            sightRadiusBright = currentPawn.sight_radius_brigth_pixels;
            sightRadius = sightRadiusBright + currentPawn.sight_radius_dim_pixels;
        }


        var radgrad;
        if (!isNaN(sightRadius) && sightRadius > 0) {
            //Radial gradient to limit vision field to segments.

            radgrad = fogOfWarLayerContext.createRadialGradient(
                pawnX * DEVICE_SCALE, pawnY * DEVICE_SCALE, 0, pawnX * DEVICE_SCALE, pawnY * DEVICE_SCALE, sightRadius * DEVICE_SCALE);

            if (sightRadiusBright > 0 || activeViewerHasDarkvision) {
                radgrad.addColorStop(0, 'rgba(0,0,0,1)');
            } else {
                radgrad.addColorStop(0.5, 'rgba(0,0,0,0.5)');
            }

            if (!activeViewerHasDarkvision && sightRadiusBright > 0) {
                radgrad.addColorStop((sightRadiusBright / sightRadius), 'rgba(0,0,0,0.5)');
                radgrad.addColorStop((sightRadiusBright / sightRadius) == 1 ? (sightRadiusBright / sightRadius) : (sightRadiusBright / sightRadius) + 0.001, 'rgba(0,0,0,0.25)');
            }
            radgrad.addColorStop(1, 'rgba(0,0,0,0)');
            fogOfWarLayerContext.fillStyle = radgrad;
            fogOfWarLayerContext.fill();
        }
    }

    function drawVisionLines(angleOriginX, angleOriginY, context) {
        // Get all angles
        var uniqueAngles = [];
        for (var j = 0; j < uniqueSegmentPoints.length; j++) {
            var uniquePoint = uniqueSegmentPoints[j];
            var angle = Math.atan2(uniquePoint.y - angleOriginY, uniquePoint.x - angleOriginX);
            uniqueAngles.push(angle - 0.00001, angle, angle + 0.00001);
        }

        // RAYS IN ALL DIRECTIONS
        var intersects = [];
        for (var j = 0; j < uniqueAngles.length; j++) {
            var angle = uniqueAngles[j];

            // Calculate dx & dy from angle
            var dx = Math.cos(angle);
            var dy = Math.sin(angle);

            // Ray from center of screen to pawn
            var ray = {
                a: { x: angleOriginX, y: angleOriginY },
                b: { x: angleOriginX + dx, y: angleOriginY + dy }
            };

            // Find CLOSEST intersection
            var closestIntersect = null;
            for (var i = 0; i < segments.length; i++) {
                var intersect = getIntersection(ray, segments[i]);
                if (!intersect) continue;
                if (!closestIntersect || intersect.param < closestIntersect.param) {
                    closestIntersect = intersect;
                }
            }

            // Intersect angle
            if (!closestIntersect) continue;
            closestIntersect.angle = angle;

            // Add to list of intersects
            intersects.push(closestIntersect);

        }

        // Sort intersects by angle
        intersects = intersects.sort(function (a, b) {
            return a.angle - b.angle;
        });


        context.beginPath();
        context.moveTo(intersects[0].x * DEVICE_SCALE, intersects[0].y * DEVICE_SCALE);

        for (var i = 1; i < intersects.length; i++) {
            var intersect = intersects[i];
            context.lineTo(intersect.x * DEVICE_SCALE, intersect.y * DEVICE_SCALE);
        }

    }
    const minWallLength = 15;
    const maxSegmentCount = 900;
    //Refactor to savemanager.js
    function importDungeondraftVttMap(path) {

        resetEverything();
        resetZoom();

        dataAccess.readFile(path, function (data) {

            var wallArray = data.line_of_sight;

            var dungeonDraftCellSize = originalCellSize;//parseInt(data.resolution.pixels_per_grid);
            console.log(dungeonDraftCellSize)
            var imageData = data.image;
            var bitmap = Buffer.from(imageData, "base64");
            var fileName = pathModule.basename(path);
            dataAccess.writeTempFile(fileName + ".png", bitmap, function (path) {
                setMapForeground(path.replaceAll("\\", "/"), parseFloat(data.resolution.map_size.x) * originalCellSize);

                var offsetX = (foregroundCanvas.data_transform_x || 0) + mapContainers[0].data_transform_x;
                var offsetY = (foregroundCanvas.data_transform_y || 0) + mapContainers[0].data_transform_y;

                var wallLines = [];
                getLines(false, true);
                if (wallLines.length > maxSegmentCount) {

                    wallLines.length = 0;
                    getLines(true, false);

                }
                var count = 0;

                function getLines(combineSmallLines, scaleWalls) {

                    wallArray.forEach(walls => {
                        var skippedLines = [];
                        for (var i = 0; i < walls.length; i++) {
                            var wall = walls[i];

                            count++;
                            if (scaleWalls) {
                                wall.x = parseFloat(wall.x) * dungeonDraftCellSize;
                                wall.y = parseFloat(wall.y) * dungeonDraftCellSize;
                            }


                            if (i == 0)
                                continue;

                            var lineA = skippedLines.length > 0 ? skippedLines[0] : { x: walls[i - 1].x + offsetX, y: walls[i - 1].y + offsetY };
                            var lineB = { x: walls[i].x + offsetX, y: walls[i].y + offsetY };
                            if (i == walls.length) {
                                wallLines.push({ a: lineA, b: lineB });
                            } else {

                                if (distance(lineA, lineB) < minWallLength && combineSmallLines) {
                                    //Skip this line
                                    skippedLines.push(lineA);
                                    continue;
                                }
                                skippedLines.length = 0;
                                wallLines.push({ a: lineA, b: lineB });
                            }
                        }
                    })
                }

                var portals = data.portals;

                portals.forEach(portal => {
                    if (portal.closed != true) return;
                    var bounds = portal.bounds;
                    bounds.map(point => {
                        point.x = parseFloat(point.x) * dungeonDraftCellSize + offsetX;
                        point.y = parseFloat(point.y) * dungeonDraftCellSize + offsetY;
                        return point;
                    });
                    wallLines.push({ a: bounds[0], b: bounds[1] });

                });

                var lights = data.lights;
                lights.forEach(light => {
                    var newEffect = document.createElement("div");
                    newEffect.style.width = cellSize / UNITS_PER_GRID + "px";
                    newEffect.style.height = cellSize / UNITS_PER_GRID + "px";
                    newEffect.flying_height = 0;
                    newEffect.classList.add("light_effect", "dungeondraft_imported_light");
                    newEffect.classList.add("light_source_visibility_layer");

                    var posX = parseFloat(light.position.x) * dungeonDraftCellSize + offsetX;
                    var posY = parseFloat(light.position.y) * dungeonDraftCellSize + offsetY;
                    newEffect.style.top = posY + "px";
                    newEffect.style.left = posX + "px";
                    var radius = parseFloat(light.range) * 5;
                    newEffect.sight_radius_bright_light = radius / 2;
                    newEffect.sight_radius_dim_light = radius / 2;
                    effects.push(newEffect)
                    pawns.lightSources.push(newEffect);
                    tokenLayer.appendChild(newEffect);
                });


                //Normalize and add
                setSegments(wallLines);

                drawSegments();
            });
        });

    }

    function importDungeondraftWalls() {
        var dungeonDraftCellSize = 256;
        difference = cellSize / dungeonDraftCellSize;
        var path = window.dialog.showOpenDialogSync({
            properties: ['openFile', 'multiSelections'],
            message: "Choose dungeondraft map location",
            filters: [{ name: 'Dungeondraft map', extensions: ['dungeondraft_map'] }]
        });
        if (!path[0]) return;

        resetEverything();
        resetZoom();


        dataAccess.readFile(path[0], function (data) {

            var wallArray = data.world.levels["0"].walls;

            var ddWidth = parseInt(data.world.width) * dungeonDraftCellSize;
            var ddHeigth = parseInt(data.world.height) * dungeonDraftCellSize;

            var width = parseFloat(foregroundCanvas.getAttribute("data-original_width"));
            var height = parseFloat(foregroundCanvas.getAttribute("data-original_height"));

            var widthDiff = width / ddWidth;
            var heightDiff = height / ddHeigth;

            var offsetX = foregroundCanvas.data_transform_x || 0;
            var offsetY = foregroundCanvas.data_transform_y || 0;

            wallArray.forEach(wall => {
                var lastPoint;
                var wallDataString = wall.points;
                wallDataString = wallDataString.substring(17, wallDataString.length - 1);
                var wallPoints = wallDataString.split(",");
                var wallLines = [];
                var newPoint = {};
                for (var i = 0; i < wallPoints.length; i++) {
                    var value = parseInt(wallPoints[i]);
                    if (i % 2 == 0) {
                        newPoint.x = value;
                        continue;
                    }
                    newPoint.y = value;

                    if (lastPoint) {
                        wallLines.push({ a: { x: lastPoint.x, y: lastPoint.y }, b: { x: newPoint.x, y: newPoint.y } });
                    }
                    lastPoint = newPoint;
                    newPoint = {};
                }
                if (wall.loop) {
                    //Add a segment between first and last
                    var firstPoint = {
                        x: parseInt(wallPoints[0]),
                        y: parseInt(wallPoints[1])
                    }

                    var lastPoint = {
                        x: parseInt(wallPoints[wallPoints.length - 2]),
                        y: parseInt(wallPoints[wallPoints.length - 1])
                    }
                    wallLines.push({ a: firstPoint, b: lastPoint });
                }

                //Create separate segments for portals
                var portals = createPortals(wall);
                if (portals) {

                    portals.forEach(portal => {
                        wallLines.forEach(line => {
                            if (!pointIsOnLine(line.a, line.b, portal))
                                return;
                            //Shorten first by radius
                            var portalBegin = createPointDistanceTowardsAnother(portal.radius, { x: portal.x, y: portal.y }, line.a);
                            var portalEnd = createPointDistanceTowardsAnother(portal.radius, { x: portal.x, y: portal.y }, line.b);
                            // line.b.x = portalBegin.x;
                            //line.b.y = portalBegin.y;
                            var wallEnd = line.b;
                            line.b = copyPoint(portalBegin);

                            wallLines.push({ a: copyPoint(portalBegin), b: copyPoint(portalEnd) });
                            //    wallLines.push({a: copyPoint(line.a), b: copyPoint(portalBegin)});
                            wallLines.push({ a: copyPoint(wallEnd), b: copyPoint(portalEnd) });


                        });
                    });
                    // while(segmentsToAdd.length > 0)
                    //  wallLines.push(segmentsToAdd.pop());
                    function createPointDistanceTowardsAnother(moveDistance, pointA, pointB) {
                        var distanceBetween = distance(pointA, pointB);
                        var x = pointA.x - (moveDistance * (pointA.x - pointB.x)) / distanceBetween;
                        var y = pointA.y - (moveDistance * (pointA.y - pointB.y)) / distanceBetween;
                        return { x: x, y: y };
                    }
                }

                //Normalize and add
                wallLines.forEach(line => {
                    line.a.x = line.a.x * widthDiff + offsetX;
                    line.b.x = line.b.x * widthDiff + offsetX;
                    line.a.y = line.a.y * heightDiff + offsetY;
                    line.b.y = line.b.y * heightDiff + offsetY
                    addSegment(line.a, line.b)

                });
            });

            drawSegments();

        });

        function createPortals(wall) {
            if (!wall.portals || wall.portals.length == 0)
                return null;
            var portalArr = [];
            wall.portals.forEach(port => {
                var positionArr = port.position.substring(8, port.position.length - 1).split(",").map(x => parseFloat(x));
                portalArr.push({
                    x: positionArr[0],
                    y: positionArr[1],
                    radius: parseFloat(port.radius)
                });
            });
            return portalArr;
        }
    }


    function copyPoint(point) {
        return { x: point.x, y: point.y };
    }
    function addWindowBorderToSegments() {
        var offset = -2000;
        var boxHeight = canvasHeight - offset;
        var boxWidth = canvasWidth - offset;

        segments[0] = { a: { x: offset, y: offset }, b: { x: boxWidth, y: offset } };
        segments[1] = { a: { x: boxWidth, y: offset }, b: { x: boxWidth, y: canvasHeight } };
        segments[2] = { a: { x: boxWidth, y: boxHeight }, b: { x: offset, y: boxHeight } };
        segments[3] = { a: { x: offset, y: boxHeight }, b: { x: offset, y: offset } };
        generateUniquePoints();



    }

    function addSegment(a, b) {

        segments.push({ a: a, b: b });
        generateUniquePoints();
        onSegmentsChanged();
    }

    function generateUniquePoints() {
        var points = (function (segments) {
            var a = [];
            segments.forEach(function (seg) {
                a.push(seg.a, seg.b);
            });
            return a;
        })(segments);
        uniqueSegmentPoints = (function (points) {
            var set = {};

            return points.filter(function (p) {
                var key = p.x + "," + p.y;
                if (key in set) {
                    return false;
                } else {
                    set[key] = true;
                    return true;
                }
            });
        })(points);
        drawFogOfWar();
    }

    function onSegmentsChanged() {
        console.log("Segments changed")
        generateUniquePoints();
        serverNotifier.notifyServer("segments", { segments: serverNotifier.getSegments() });
    }
    function nudgeSegments(x, y) {

        var segment;
        for (var i = 4; i < segments.length; i++) {
            segment = segments[i];
            segment.a.x += x;
            segment.a.y += y;
            segment.b.x += x;
            segment.b.y += y;
        }
        generateUniquePoints();


    }

    function resizeSegmentsFromMapSizeChanged(oldWidth, oldHeight, newWidth, newHeight) {
        var ratioX = newWidth / oldWidth;
        var ratioY = newHeight / oldHeight;

        for (var i = 4; i < segments.length; i++) {
            ["a", "b"].forEach(line => {
                var oldDistanceFromX = oldWidth - segments[i][line].x;
                var oldDistanceFromY = oldHeight - segments[i][line].y;
                segments[i][line].x = (newWidth - oldDistanceFromX * ratioX);
                segments[i][line].y = (newHeight - oldDistanceFromY * ratioY);
            });

        }
    }

    function resizeSegments(oldBackgroundOrigin, newBackgroundOrigin, backgroundScaleBeforeResize) {

        var cellsFromLeft, cellsFromTop;

        for (var i = 4; i < segments.length; i++) {
            ["a", "b"].forEach(line => {
                cellsFromLeft = (segments[i][line].x - oldBackgroundOrigin.x)
                    / (originalCellSize * backgroundScaleBeforeResize);
                cellsFromTop = (segments[i][line].y - oldBackgroundOrigin.y)
                    / (originalCellSize * backgroundScaleBeforeResize);

                segments[i][line].x = cellsFromLeft * cellSize + newBackgroundOrigin.x;
                segments[i][line].y = cellsFromTop * cellSize + newBackgroundOrigin.y;

            });

        }
        drawSegments();
        generateUniquePoints();

    }

    var showVisibilityLayer = false;

    function setVisibilityLayerVisible(visible) {
        showVisibilityLayer = visible;
    }

    function addRectangleSegment(originPoint, destinationPoint) {
        segments.push({ a: { x: originPoint.x, y: originPoint.y }, b: { x: destinationPoint.x, y: originPoint.y } });

        segments.push({ a: { x: originPoint.x, y: originPoint.y }, b: { x: originPoint.x, y: destinationPoint.y } });


        segments.push({ a: { x: destinationPoint.x, y: destinationPoint.y }, b: { x: destinationPoint.x, y: originPoint.y } });
        segments.push({ a: { x: destinationPoint.x, y: destinationPoint.y }, b: { x: originPoint.x, y: destinationPoint.y } });
        generateUniquePoints();
        onSegmentsChanged();
        drawSegments();
    }

    function addSphereSegment(originPoint, destinationPoint) {
        var radius = Math.sqrt(
            Math.pow(originPoint.x - destinationPoint.x, 2) +
            Math.pow(originPoint.y - destinationPoint.y, 2)
        );

        var steps = Math.round(radius / 10) * 10;

        var firstPoint, nextPoint, startPoint;
        for (var i = 0; i < steps; i++) {
            if (i % 2 == 0) {
                if (nextPoint == null) {
                    firstPoint = {
                        x: (originPoint.x + radius * Math.cos(2 * Math.PI * i / steps)),
                        y: (originPoint.y + radius * Math.sin(2 * Math.PI * i / steps))
                    }
                    startPoint = firstPoint;
                } else {
                    firstPoint = nextPoint;
                }

            } else {
                if (i == steps - 1) {
                    nextPoint = startPoint;
                } else {
                    nextPoint = {
                        x: (originPoint.x + radius * Math.cos(2 * Math.PI * i / steps)),
                        y: (originPoint.y + radius * Math.sin(2 * Math.PI * i / steps))
                    }
                }

                addLineSegment({ x: nextPoint.x, y: nextPoint.y }, { x: firstPoint.x, y: firstPoint.y })
            }

        }
    }

    function addLineSegment(originPoint, destinationPoint) {
        segments.push({ a: originPoint, b: destinationPoint });
        generateUniquePoints();
        onSegmentsChanged();
        drawSegments();
    }
    function drawSegments() {
        fovSegmentLayerContext.beginPath();
        fovSegmentLayerContext.save();

        fovSegmentLayerContext.clearRect(0, 0, gridLayer.width * DEVICE_SCALE, gridLayer.height * DEVICE_SCALE);
        fovSegmentLayerContext.restore();
        if (!showVisibilityLayer && !currentlyDeletingSegments)
            return;
        fovSegmentLayerContext.globalCompositeOperation = 'source-over';

        for (var i = 4; i < segments.length; i++) {

            var seg = segments[i];
            if (currentlyDeletingSegments && pointIsOnLine(seg.a, seg.b, GLOBAL_MOUSE_POSITION, SEGMENT_SELECTION_MARGIN)) {
                fovSegmentLayerContext.strokeStyle = "#662222";
                fovSegmentLayerContext.lineWidth = 6 * DEVICE_SCALE;
                console.log(seg)

            } else {
                if (!showVisibilityLayer) continue;
                fovSegmentLayerContext.strokeStyle = SEGMENT_COLOR;
                fovSegmentLayerContext.lineWidth = 5 * DEVICE_SCALE;
            }
            fovSegmentLayerContext.beginPath();
            fovSegmentLayerContext.moveTo(seg.a.x * DEVICE_SCALE, seg.a.y * DEVICE_SCALE);
            fovSegmentLayerContext.lineTo(seg.b.x * DEVICE_SCALE, seg.b.y * DEVICE_SCALE);
            fovSegmentLayerContext.stroke();
        }
    }

    function setDarkvision(enabled) {
        var button = document.getElementById("active_viewer_button");
        if (enabled) {
            if (!activeViewerHasDarkvision)
                if (button) button.click();
                else switchActiveViewer();
        } else {
            if (activeViewerHasDarkvision)
                if (button) button.click();
                else switchActiveViewer();
        }
    }

    function setPerspective() {
        var selectedIndex = document.getElementById("fov_perspective_dropdown").selectedIndex;
        var name = document.getElementById("fov_perspective_dropdown").options[selectedIndex].value;
        if (forcedPerspectiveOrigin)
            forcedPerspectiveOrigin.forEach(x => x.classList.remove("above_fog"));
        if (name == "All") {
            forcedPerspectiveOrigin = null;
            setDarkvision(false);
            drawFogOfWar();
            return;
        } else if (name == "Players") {
            forcedPerspectiveOrigin = pawns.players.map(x => x[0]);
            console.log()
            if (forcedPerspectiveOrigin) {
                forcedPerspectiveOrigin.forEach(x => x.classList.add("above_fog"));
                setDarkvision(!forcedPerspectiveOrigin.find(x => x.sight_mode != "darkvision"));
            }
        } else {
            var player = pawns.players.find(x => x[1] == name);
            if (player) {
                forcedPerspectiveOrigin = [player[0]];
                setDarkvision(forcedPerspectiveOrigin[0].sight_mode == "darkvision");
            }
        }
        if (forcedPerspectiveOrigin)
            forcedPerspectiveOrigin.forEach(x => x.classList.add("above_fog"));


        drawFogOfWar();
    }


    function clearFogOfWar() {

        fogOfWarLayerContext.beginPath();
        fogOfWarLayerContext.clearRect(0, 0, gridLayer.width, gridLayer.height);
        mapIsBlack = false;
    }
    function clearMask() {
        maskCtx.beginPath();
        maskCtx.clearRect(0, 0, gridLayer.width * DEVICE_SCALE, gridLayer.height * DEVICE_SCALE);

    }
    function attemptToDeleteSegment(linepoint) {
        var seg;
        for (var i = 4; i < segments.length; i++) {
            seg = segments[i];
            if (pointIsOnLine(seg.a, seg.b, linepoint, SEGMENT_SELECTION_MARGIN)) {
                segments.splice(i, 1);
                drawSegments();
                onSegmentsChanged();
                break;
            }
        }
    }
    function setSegments(newSegments) {
        segments = newSegments;
        onSegmentsChanged();
    }

    function getSegments() {
        return segments;
    }

    // Returns true if point c is on a or b lines
    function pointIsOnLine(a, b, c, offset = 0.5) {
        var distanceAb = distance(a, b);
        var distanceBc = distance(b, c);
        var distanceAc = distance(a, c);
        return Math.abs(distanceAb - (distanceBc + distanceAc)) < offset;

    }
    function totalArrDistance(arr) {
        if (arr.length == 1) return 0;
        var sum = 0;
        for (var i = 1; i < arr.length; i++) {
            sum += distance(arr[i - 1], arr[1]);
        }

        return sum;
    }

    function distance(a, b) {
        return Math.sqrt(
            Math.pow(a.x - b.x, 2)
            + Math.pow(a.y - b.y, 2)
        )
    }
    // Find intersection of RAY & SEGMENT
    function getIntersection(ray, segment) {

        // RAY in parametric: Point + Delta*T1
        var r_px = ray.a.x;
        var r_py = ray.a.y;
        var r_dx = ray.b.x - ray.a.x;
        var r_dy = ray.b.y - ray.a.y;

        // SEGMENT in parametric: Point + Delta*T2
        var s_px = segment.a.x;
        var s_py = segment.a.y;
        var s_dx = segment.b.x - segment.a.x;
        var s_dy = segment.b.y - segment.a.y;

        // Are they parallel? If so, no intersect
        var r_mag = Math.sqrt(r_dx * r_dx + r_dy * r_dy);
        var s_mag = Math.sqrt(s_dx * s_dx + s_dy * s_dy);
        if (r_dx / r_mag == s_dx / s_mag && r_dy / r_mag == s_dy / s_mag) {
            // Unit vectors are the same.
            return null;
        }

        // SOLVE FOR T1 & T2
        // r_px+r_dx*T1 = s_px+s_dx*T2 && r_py+r_dy*T1 = s_py+s_dy*T2
        // ==> T1 = (s_px+s_dx*T2-r_px)/r_dx = (s_py+s_dy*T2-r_py)/r_dy
        // ==> s_px*r_dy + s_dx*T2*r_dy - r_px*r_dy = s_py*r_dx + s_dy*T2*r_dx - r_py*r_dx
        // ==> T2 = (r_dx*(s_py-r_py) + r_dy*(r_px-s_px))/(s_dx*r_dy - s_dy*r_dx)
        var T2 = (r_dx * (s_py - r_py) + r_dy * (r_px - s_px)) / (s_dx * r_dy - s_dy * r_dx);
        var T1 = (s_px + s_dx * T2 - r_px) / r_dx;

        // Must be within parametic whatevers for RAY/SEGMENT
        if (T1 < 0) return null;
        if (T2 < 0 || T2 > 1) return null;

        // Return the POINT OF INTERSECTION
        return {
            x: r_px + r_dx * T1,
            y: r_py + r_dy * T1,
            param: T1,
          
        };

    }

    function getPerspective() {
        return !forcedPerspectiveOrigin ? null : forcedPerspectiveOrigin[0];
    }

    return {
        importDungeondraftWalls: importDungeondraftWalls,
        clearFogOfWar: clearFogOfWar,
        importDungeondraftVttMap: importDungeondraftVttMap,
        drawFogOfWar: drawFogOfWar,
        setFogStyle: setFogStyle,
        getFogStyle: getFogStyle,
        isDark:isDark, 
        MapFogType: MapFogEnum,
        SEGMENT_COLOR:SEGMENT_COLOR,
        toggleDarkvision: toggleDarkvision,
        viewerHasDarkvision: viewerHasDarkvision,
        nudgeSegments: nudgeSegments,
        addWindowBorderToSegments: addWindowBorderToSegments,
        resizeSegments: resizeSegments,
        setVisibilityLayerVisible: setVisibilityLayerVisible,
        drawSegments: drawSegments,
        addLineSegment: addLineSegment,
        addRectangleSegment: addRectangleSegment,
        resizeSegmentsFromMapSizeChanged: resizeSegmentsFromMapSizeChanged,
        addSphereSegment: addSphereSegment,
        attemptToDeleteSegment: attemptToDeleteSegment,
        setPerspective: setPerspective,
        getPerspective: getPerspective,
        getSegments: getSegments,
        scaleLayers: scaleLayers,
        setSegments: setSegments,
        resizeCanvas: resizeCanvas,
        publishChanged: onSegmentsChanged
    }
}();