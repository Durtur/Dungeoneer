

var fovToolbox = [false, false];
var currentlyAddingSegments = false, segmentMeasurementPaused = false;
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
        gridLayer.onmousedown = startMeasuring;

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

    // DRAWING
    var segments = [];
    var forcedPerspectiveOrigin;
    function drawFogOfWar() {
        clearFogOfWar();
        var fogColor;
        if (mapInDarkness) {
            fogColor = settings.fogOfWarHue;
        } else {
            fogColor = hexToRGBA(settings.fogOfWarHue, 0.9);
        }
        // Draw segments
        if (showVisibilityLayer) {
            drawSegments();
        }

        //Base black
        fogOfWarLayerContext.globalCompositeOperation = 'source-out';
        fogOfWarLayerContext.beginPath();
        fogOfWarLayerContext.fillStyle = fogColor;
        fogOfWarLayerContext.fillRect(0, 0, gridLayer.width, gridLayer.height);
        fogOfWarLayerContext.stroke();

        for (var i = 0; i < pawns.lightSources.length; i++) {
            draw(pawns.lightSources[i]);
        }
        if (!forcedPerspectiveOrigin)
            return;

        fogOfWarLayerContext.globalCompositeOperation = 'source-over';
        fogOfWarLayerContext.fillStyle = "#000";

        // Ensure same dimensions
        maskCanvas.width = fogOfWarLayerCanvas.width;
        maskCanvas.height = fogOfWarLayerCanvas.height;

        maskCtx.fillStyle = fogColor;
        maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
        maskCtx.globalCompositeOperation = 'xor';


        drawVisionLines(pawnX = parseFloat(forcedPerspectiveOrigin.style.left) + forcedPerspectiveOrigin.clientWidth / 2,
            pawnY = parseFloat(forcedPerspectiveOrigin.style.top) + forcedPerspectiveOrigin.clientHeight / 2, maskCtx);
        maskCtx.fill();

        fogOfWarLayerContext.drawImage(maskCanvas, 0, 0);
        draw(forcedPerspectiveOrigin);
        clearMask();
    }

    function draw(currentPawn) {

        if (currentPawn.sight_mode == "darkvision" && !activeViewerHasDarkvision && !isPlayerPawn(currentPawn) ||
            (forcedPerspectiveOrigin && forcedPerspectiveOrigin != currentPawn && currentPawn.sight_mode == "darkvision")) {
            return;
        }
        var pawnX, pawnY;
        pawnX = parseFloat(currentPawn.style.left) + currentPawn.clientWidth / 2;
        pawnY = parseFloat(currentPawn.style.top) + currentPawn.clientHeight / 2;
        // if (pawnY < -200 || pawnY > window.clientHeight + 200 || pawnX < -200 || pawnX > window.clientHeight + 200)
        //     return;

        fogOfWarLayerContext.globalCompositeOperation = 'destination-out';

        drawVisionLines(pawnX, pawnY, fogOfWarLayerContext);
        paintVision(currentPawn, pawnX, pawnY);


    }



    function paintVision(currentPawn, pawnX, pawnY) {
        if (isNaN(pawnX) || isNaN(pawnY))
            return;

        var sightRadiusBright, sightRadius;
        //Special handling if this is a player that should be always visible
        if (currentPawn.sight_mode == "darkvision" && !activeViewerHasDarkvision) {
            sightRadiusBright = cellSize / 5;
            sightRadius = cellSize / 5 * 2;
        } else {
            sightRadiusBright = parseFloat(currentPawn.sight_radius_bright_light) * cellSize / 5;
            sightRadius = sightRadiusBright +
                parseFloat(currentPawn.sight_radius_dim_light) * cellSize / 5;
        }


        var radgrad;
        if (!isNaN(sightRadius) && sightRadius > 0) {
            //Radial gradient to limit vision field to segments.

            radgrad = fogOfWarLayerContext.createRadialGradient(
                pawnX, pawnY, 0, pawnX, pawnY, sightRadius);

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

        // Get all unique points
        var points = (function (segments) {
            var a = [];
            segments.forEach(function (seg) {
                a.push(seg.a, seg.b);
            });
            return a;
        })(segments);

        var uniquePoints = (function (points) {
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

        // Get all angles
        var uniqueAngles = [];
        for (var j = 0; j < uniquePoints.length; j++) {
            var uniquePoint = uniquePoints[j];
            var angle = Math.atan2(uniquePoint.y - angleOriginY, uniquePoint.x - angleOriginX);
            uniquePoint.angle = angle;
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
        context.moveTo(intersects[0].x, intersects[0].y);

        for (var i = 1; i < intersects.length; i++) {
            var intersect = intersects[i];
            context.lineTo(intersect.x, intersect.y);
        }

    }

    function importDungeondraftWalls() {
        var dungeonDraftCellSize = 256;
        difference = cellSize / dungeonDraftCellSize;
        var path = dialog.showOpenDialogSync(remote.getCurrentWindow(), {
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
            console.log(width, height);
            var widthDiff = width / ddWidth;
            var heightDiff = height / ddHeigth;

            var offsetX = foregroundCanvas.data_transform_x;
            var offsetY = foregroundCanvas.data_transform_y;

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
                if(portals)
                {
                  
                    portals.forEach(portal =>{
                        wallLines.forEach(line=>{
                            if(!pointIsOnLine(line.a, line.b, portal))
                              return;
                            //Shorten first by radius
                            var portalBegin = createPointDistanceTowardsAnother(portal.radius,  {x:portal.x, y:portal.y},line.a);
                            var portalEnd = createPointDistanceTowardsAnother(portal.radius,  {x:portal.x, y:portal.y},line.b);
                           // line.b.x = portalBegin.x;
                            //line.b.y = portalBegin.y;
                            var wallEnd = line.b;
                            line.b = copyPoint(portalBegin);
                            console.log(portalBegin, portalEnd)
                            wallLines.push({a: copyPoint(portalBegin), b: copyPoint(portalEnd)});
                        //    wallLines.push({a: copyPoint(line.a), b: copyPoint(portalBegin)});
                            wallLines.push({a: copyPoint(wallEnd), b: copyPoint(portalEnd)});


                        });
                    });
                   // while(segmentsToAdd.length > 0)
                      //  wallLines.push(segmentsToAdd.pop());
                    function createPointDistanceTowardsAnother(moveDistance, pointA, pointB){
                        var distanceBetween = distance(pointA, pointB);
                        var x = pointA.x - (moveDistance*(pointA.x - pointB.x))/distanceBetween;
                        var y = pointA.y -  (moveDistance*(pointA.y - pointB.y))/distanceBetween;
                        return {x:x, y:y};
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


    function copyPoint(point){
        return {x:point.x, y:point.y};
    }
    function addWindowBorderToSegments() {
        var offset = -2000;
        var boxHeight = canvasHeight - offset;
        var boxWidth = canvasWidth - offset;
        console.log(boxHeight, boxWidth, canvasHeight, canvasWidth);
        segments[0] = { a: { x: offset, y: offset }, b: { x: boxWidth, y: offset } };
        segments[1] = { a: { x: boxWidth, y: offset }, b: { x: boxWidth, y: canvasHeight } };
        segments[2] = { a: { x: boxWidth, y: boxHeight }, b: { x: offset, y: boxHeight } };
        segments[3] = { a: { x: offset, y: boxHeight }, b: { x: offset, y: offset } };


    }

    function addSegment(a, b) {
        console.log("Adding segment" , a,b)
        segments.push({ a: a, b: b })
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
        drawSegments();
    }

    function addSphereSegment(originPoint, destinationPoint) {
        var radius = Math.sqrt(
            Math.pow(originPoint.x - destinationPoint.x, 2) +
            Math.pow(originPoint.y - destinationPoint.y, 2)
        );

        var steps = Math.round(radius / 2) * 2;

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
        drawSegments();
    }
    function drawSegments() {

        fovSegmentLayerContext.beginPath();
        fovSegmentLayerContext.save();
        fovSegmentLayerContext.setTransform(1, 0, 0, 1, 0, 0);
        fovSegmentLayerContext.clearRect(0, 0, gridLayer.width, gridLayer.height);
        fovSegmentLayerContext.restore();
        if (!showVisibilityLayer) return;
        fovSegmentLayerContext.globalCompositeOperation = 'source-over';
        fovSegmentLayerContext.strokeStyle = "#2222aa";
        fovSegmentLayerContext.lineWidth = 5;

        for (var i = 4; i < segments.length; i++) {
            var seg = segments[i];
            fovSegmentLayerContext.beginPath();
            fovSegmentLayerContext.moveTo(seg.a.x, seg.a.y);
            fovSegmentLayerContext.lineTo(seg.b.x, seg.b.y);
            fovSegmentLayerContext.stroke();
        }
    }

    function setPerspective() {
        var selectedIndex = document.getElementById("fov_perspective_dropdown").selectedIndex;
        var name = document.getElementById("fov_perspective_dropdown").options[selectedIndex].value;

        if (selectedIndex == 0) {
            forcedPerspectiveOrigin = null;
            drawFogOfWar();
            return;
        }
        for (var i = 0; i < pawns.players.length; i++) {
            if (pawns.players[i][1] == name) {
                forcedPerspectiveOrigin = pawns.players[i][0];
                if (forcedPerspectiveOrigin.sight_mode == "darkvision") {
                    if (!activeViewerHasDarkvision)
                        document.getElementById("active_viewer_button").click();
                } else {
                    if (activeViewerHasDarkvision)
                        document.getElementById("active_viewer_button").click();
                }

                break;
            }
        }

        drawFogOfWar();
    }


    function clearFogOfWar() {
        fogOfWarLayerContext.beginPath();
        fogOfWarLayerContext.save();
        fogOfWarLayerContext.setTransform(1, 0, 0, 1, 0, 0);
        fogOfWarLayerContext.clearRect(0, 0, gridLayer.width, gridLayer.height);
        fogOfWarLayerContext.restore();
    }
    function clearMask() {
        maskCtx.beginPath();
        maskCtx.save();
        maskCtx.setTransform(1, 0, 0, 1, 0, 0);
        maskCtx.clearRect(0, 0, gridLayer.width, gridLayer.height);
        maskCtx.restore();
    }
    function attemptToDeleteSegment(linepoint) {
        var seg;
        for (var i = 4; i < segments.length; i++) {
            seg = segments[i];
            if (pointIsOnLine(seg.a, seg.b, linepoint)) {
                segments.splice(i, 1);
                drawSegments();
                break;
            }
        }
    }
    function setSegments(newSegments) {
        segments = newSegments;
    }

    function getSegments() {
        return segments;
    }
    // Returns true if point c is on a or b lines
    function pointIsOnLine(a, b, c) {
        var offset = 0.5;
        var distanceAb = distance(a, b);
        var distanceBc = distance(b, c);
        var distanceAc = distance(a, c);
        return Math.abs(distanceAb - (distanceBc + distanceAc)) < offset;

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
            param: T1
        };

    }
    function hexToRGBA(hex, opacity) {
        return 'rgba(' + (hex = hex.replace('#', '')).match(new RegExp('(.{' + hex.length / 3 + '})', 'g')).map(function (l) { return parseInt(hex.length % 2 ? l + l : l, 16) }).concat(opacity || 1).join(',') + ')';
    }
    return {
        importDungeondraftWalls: importDungeondraftWalls,
        clearFogOfWar: clearFogOfWar,
        drawFogOfWar: drawFogOfWar,
        nudgeSegments: nudgeSegments,
        addWindowBorderToSegments: addWindowBorderToSegments,
        resizeSegments: resizeSegments,
        setVisibilityLayerVisible: setVisibilityLayerVisible,
        drawSegments: drawSegments,
        addLineSegment: addLineSegment,
        addRectangleSegment: addRectangleSegment,
        addSphereSegment: addSphereSegment,
        attemptToDeleteSegment: attemptToDeleteSegment,
        setPerspective: setPerspective,
        getSegments: getSegments,
        setSegments: setSegments
    }
}();