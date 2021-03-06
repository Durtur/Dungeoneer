
let measurements = function () {
    var lastLineDash, lastLineWidth, lastFillStyle;
    function clearMeasurements() {
        measurementsLayerContext.beginPath();
        measurementsLayerContext.save();
        measurementsLayerContext.setTransform(1, 0, 0, 1, 0, 0);
        measurementsLayerContext.clearRect(0, 0, gridLayer.width, gridLayer.height);
        measurementsLayerContext.restore();
        lastMeasuredLineDrawn = null;
        lastMeasuredPoint = null;

    }

    function eraseModeOn() {
        lastLineDash = measurementsLayerContext.getLineDash();
        lastLineWidth = measurementsLayerContext.lineWidth;
        lastFillStyle = measurementsLayerContext.fillStyle;
        measurementsLayerContext.fillStyle = "#fff"
        measurementsLayerContext.globalCompositeOperation = 'destination-out'
        measurementsLayerContext.setLineDash([]);
        measurementsLayerContext.lineWidth = 20;
    }

    function eraseModeOff() {
        measurementsLayerContext.fillStyle = lastFillStyle;
        measurementsLayerContext.globalCompositeOperation = 'source-over'
        measurementsLayerContext.lineWidth = lastLineWidth;
        measurementsLayerContext.setLineDash(lastLineDash);
    }
    function startMeasuring(event) {

        if (event.button != 0) {
            lastMeasuredPoint = null;
            return;
        }
        if (!visibilityLayerVisible) {
            if (toolbox[0]) {
                if (event.button == 0) {
                    if (event.ctrlKey) {
    
                        if (lastMeasuredLineDrawn) {
    
                            totalMeasuredDistance += Math.round(
                                Math.sqrt(
                                    Math.pow(lastMeasuredLineDrawn.a.x - lastMeasuredLineDrawn.b.x, 2) +
                                    Math.pow(lastMeasuredLineDrawn.a.y - lastMeasuredLineDrawn.b.y, 2) +
                                    Math.pow(lastMeasuredLineDrawn.a.z - lastMeasuredLineDrawn.b.z, 2)
                                ) / cellSize * 5);
    
                        }
                        lastMeasuredLineDrawn = null;
                    } else {
                        if (totalMeasuredDistance > 0) {
                            totalMeasuredDistance = 0;
                            lastMeasuredLineDrawn = null;
                            measurements.clearMeasurements();
                        }
                    }
    
    
                }
                document.onmousemove = measureDistance;
            } else if (toolbox[1]) {
                document.onmousemove = measureCone;
            } else if (toolbox[2]) {
                document.onmousemove = measureSphere;
            } else if (toolbox[3]) {
                document.onmousemove = measureCube;
            } else if (toolbox[4]) {
                document.onmousemove = measureRectangle;
            } else {
                return;
            }
            currentlyMeasuring = true;
            setupMeasurements();
    
        } else {
            if (fovToolbox[0]) {
                document.onmousemove = measureLineSegment;
            } else if (fovToolbox[1]) {
                document.onmousemove = measureRectangleSegment;
            } else if (fovToolbox[2]) {
                document.onmousemove = measureSphereSegment;
            } else {
                return;
            }
    
            currentlyAddingSegments = true;
            setupFOVMeasurements();
        }
    
        hideAllTooltips();
        measurementsLayerContext.moveTo(event.clientX, event.clientY);
        document.onmousedown = measurementMouseDownHandler;
    
    
        if (measurementTargetOrigin == null) {
            measurementOriginPosition = { x: event.clientX, y: event.clientY, z: 0 }
        } else {
            measurementOriginPosition = {
                x: event.clientX, y: event.clientY,
                z: cellSize / 5 * parseInt(measurementTargetOrigin.flying_height)
            }
        }
        //SEGMENT ADDING //
        var lastMeasuredLine;
        function measureLineSegment(event) {
            if (segmentMeasurementPaused) return;
            window.requestAnimationFrame(function () {
                if (lastMeasuredLine != null) {
                    measurements.eraseModeOn();
                    measurementsLayerContext.beginPath();
                    measurementsLayerContext.moveTo(lastMeasuredLine.a.x, lastMeasuredLine.a.y);
                    measurementsLayerContext.lineTo(lastMeasuredLine.b.x, lastMeasuredLine.b.y);
                    measurementsLayerContext.stroke();
                    measurements.eraseModeOff();
                } else {
                    lastMeasuredLine = {};
                }
                measurementsLayerContext.beginPath();
                measurementsLayerContext.moveTo(measurementOriginPosition.x, measurementOriginPosition.y);
                measurementsLayerContext.lineTo(event.clientX, event.clientY);
                measurementsLayerContext.stroke();
    
                var b = {
                    x: event.clientX,
                    y: event.clientY
                }
                lastMeasuredLine.a = measurementOriginPosition;
                lastMeasuredLine.b = b;
            })
        }
    
        function measureSphereSegment(event) {
            if (segmentMeasurementPaused) return;
            window.requestAnimationFrame(function () {
                if (lastMeasuredSphere) {
                    measurements.eraseModeOn();
                    measurementsLayerContext.beginPath();
                    measurementsLayerContext.arc(lastMeasuredSphere.x, lastMeasuredSphere.y, lastMeasuredSphere.radius, 0, 2 * Math.PI);
                    measurementsLayerContext.stroke();
                    measurementsLayerContext.fill();
                    measurements.eraseModeOff();
                } else {
                    lastMeasuredSphere = {};
                }
                var radius = Math.sqrt(
                    Math.pow(event.clientX - measurementOriginPosition.x, 2) +
                    Math.pow(event.clientY - measurementOriginPosition.y, 2)
                );
                measurementsLayerContext.beginPath();
                measurementsLayerContext.moveTo(measurementOriginPosition.x, measurementOriginPosition.y);
                measurementsLayerContext.arc(measurementOriginPosition.x, measurementOriginPosition.y, radius, 0, 2 * Math.PI);
                measurementsLayerContext.stroke();
                measurementsLayerContext.fill();
    
                lastMeasuredSphere.x = measurementOriginPosition.x;
                lastMeasuredSphere.y = measurementOriginPosition.y;
                lastMeasuredSphere.radius = radius;
            })
        }
        function measureRectangleSegment(event) {
            window.requestAnimationFrame(function () {
                if (lastMeasuredCube) {
                    measurements.eraseModeOn();
                    measurementsLayerContext.beginPath();
                    measurementsLayerContext.rect(lastMeasuredCube.x, lastMeasuredCube.y, lastMeasuredCube.width, lastMeasuredCube.height);
                    measurementsLayerContext.stroke();
                    measurementsLayerContext.fill();
                    measurements.eraseModeOff();
                } else {
                    lastMeasuredCube = {};
                }
                var width = event.clientX - measurementOriginPosition.x;
                var height = event.clientY - measurementOriginPosition.y;
                measurementsLayerContext.beginPath();
                measurementsLayerContext.moveTo(measurementOriginPosition.x, measurementOriginPosition.y);
                measurementsLayerContext.rect(measurementOriginPosition.x, measurementOriginPosition.y, width, height);
                measurementsLayerContext.stroke();
                measurementsLayerContext.fill();
                lastMeasuredCube.x = measurementOriginPosition.x;
                lastMeasuredCube.y = measurementOriginPosition.y;
                lastMeasuredCube.width = width;
                lastMeasuredCube.height = height;
            })
        }
    
    
        function measureRectangle(event) {
            window.requestAnimationFrame(function () {
                if (lastMeasuredCube) {
                    measurements.eraseModeOn();
                    measurementsLayerContext.beginPath();
                    measurementsLayerContext.rect(lastMeasuredCube.x, lastMeasuredCube.y, lastMeasuredCube.width, lastMeasuredCube.height);
                    measurementsLayerContext.stroke();
                    measurementsLayerContext.fill();
                    measurements.eraseModeOff();
                } else {
                    lastMeasuredCube = {};
                }
                var width = event.clientX - measurementOriginPosition.x;
                var height = event.clientY - measurementOriginPosition.y;
                measurementsLayerContext.beginPath();
                measurementsLayerContext.moveTo(measurementOriginPosition.x, measurementOriginPosition.y);
                measurementsLayerContext.rect(measurementOriginPosition.x, measurementOriginPosition.y, width, height);
                measurementsLayerContext.stroke();
                measurementsLayerContext.fill();
                lastMeasuredCube.x = measurementOriginPosition.x;
                lastMeasuredCube.y = measurementOriginPosition.y;
                lastMeasuredCube.width = width;
                lastMeasuredCube.height = height;
    
                showToolTip(event, Math.abs(Math.round(width / cellSize * 5)) + " x " + Math.abs(Math.round(height / cellSize * 5)) + " ft", "tooltip")
                attemptToSelectPawnsFromMeasurement();
            })
    
        }
        function measureCube(event) {
            window.requestAnimationFrame(function () {
                if (lastMeasuredCube) {
                    measurements.eraseModeOn();
                    measurementsLayerContext.beginPath();
                    measurementsLayerContext.rect(lastMeasuredCube.x - lastMeasuredCube.radius, lastMeasuredCube.y - lastMeasuredCube.radius, lastMeasuredCube.radius * 2, lastMeasuredCube.radius * 2);
                    measurementsLayerContext.stroke();
                    measurementsLayerContext.fill();
                    measurements.eraseModeOff();
                } else {
                    lastMeasuredCube = {};
                }
                var radius = Math.sqrt(
                    Math.pow(event.clientX - measurementOriginPosition.x, 2) +
                    Math.pow(event.clientY - measurementOriginPosition.y, 2)
                );
                measurementsLayerContext.beginPath();
                measurementsLayerContext.moveTo(measurementOriginPosition.x - radius, measurementOriginPosition.y - radius);
                measurementsLayerContext.rect(measurementOriginPosition.x - radius, measurementOriginPosition.y - radius, radius * 2, radius * 2);
                measurementsLayerContext.stroke();
                measurementsLayerContext.fill();
                showToolTip(event, Math.round(radius / cellSize * 5) * 2 + " ft", "tooltip");
                lastMeasuredCube.x = measurementOriginPosition.x;
                lastMeasuredCube.y = measurementOriginPosition.y;
    
                lastMeasuredCube.radius = radius;
                attemptToSelectPawnsFromMeasurement();
            })
        }
    
        function measureSphere(event) {
            window.requestAnimationFrame(function () {
                if (lastMeasuredSphere) {
                    measurements.eraseModeOn();
                    measurementsLayerContext.beginPath();
                    measurementsLayerContext.arc(lastMeasuredSphere.x, lastMeasuredSphere.y, lastMeasuredSphere.radius + 40, 0, 2 * Math.PI);
                    measurementsLayerContext.stroke();
                    measurementsLayerContext.fill();
                    measurements.eraseModeOff();
    
                } else {
                    lastMeasuredSphere = {};
                }
                var radius = Math.sqrt(
                    Math.pow(event.clientX - measurementOriginPosition.x, 2) +
                    Math.pow(event.clientY - measurementOriginPosition.y, 2)
                );
                measurementsLayerContext.beginPath();
                measurementsLayerContext.moveTo(measurementOriginPosition.x, measurementOriginPosition.y);
                measurementsLayerContext.arc(measurementOriginPosition.x, measurementOriginPosition.y, radius, 0, 2 * Math.PI);
                measurementsLayerContext.stroke();
                measurementsLayerContext.fill();
    
                lastMeasuredSphere.x = measurementOriginPosition.x;
                lastMeasuredSphere.y = measurementOriginPosition.y;
                lastMeasuredSphere.radius = radius;
                showToolTip(event, Math.round(radius / cellSize * 5) + " ft rad", "tooltip")
                attemptToSelectPawnsFromMeasurement();
            })
        }
    
        function measureCone(event) {
            window.requestAnimationFrame(function () {
                if (lastMeasuredCone) {
                    measurements.eraseModeOn();
                    measurementsLayerContext.beginPath();
                    measurementsLayerContext.rect(lastMeasuredCone.x - lastMeasuredCone.radius, lastMeasuredCone.y - lastMeasuredCone.radius, lastMeasuredCone.radius * 2, lastMeasuredCone.radius * 2);
                    measurementsLayerContext.stroke();
                    measurementsLayerContext.fill();
                    measurements.eraseModeOff();
                } else {
                    lastMeasuredCone = {};
                }
                measurementsLayerContext.beginPath();
                measurementsLayerContext.moveTo(measurementOriginPosition.x, measurementOriginPosition.y);
                var newPoint = Geometry.rotate(0.46355945, measurementOriginPosition, { x: event.clientX, y: event.clientY });
                var newPoint2 = Geometry.rotate(-0.46355944999997217, measurementOriginPosition, { x: event.clientX, y: event.clientY });
    
                var midPoint = {
                    x: (newPoint.x + newPoint2.x) / 2,
                    y: (newPoint.y + newPoint2.y) / 2
                }
    
    
                measurementsLayerContext.lineTo(newPoint.x, newPoint.y);
                measurementsLayerContext.lineTo(newPoint2.x, newPoint2.y);
                measurementsLayerContext.lineTo(measurementOriginPosition.x, measurementOriginPosition.y);
                measurementsLayerContext.stroke();
                measurementsLayerContext.fill();
    
                showToolTip(event, Math.round(
                    Math.sqrt(
                        Math.pow(midPoint.x - measurementOriginPosition.x, 2) +
                        Math.pow(midPoint.y - measurementOriginPosition.y, 2)
                    ) / cellSize * 5) + " ft", "tooltip");
    
                lastMeasuredCone.x = measurementOriginPosition.x;
                lastMeasuredCone.y = measurementOriginPosition.y;
                lastMeasuredCone.newPoint = newPoint;
                lastMeasuredCone.newPoint2 = newPoint2;
    
                lastMeasuredCone.radius = Math.sqrt(
                    Math.pow(event.clientX - measurementOriginPosition.x, 2) +
                    Math.pow(event.clientY - measurementOriginPosition.y, 2)
                );
                attemptToSelectPawnsFromMeasurement()
            })
        }
    
        function attemptToSelectPawnsFromMeasurement() {
    
            var pawnsInArea;
            if (toolbox[1] && lastMeasuredCone) { //cone
                pawnsInArea = [...pawns.all].filter(pawn => {
                    var pawnCenter = getPawnOrigin(pawn);
                    return Geometry.insideCone(
                        lastMeasuredCone.x,
                        lastMeasuredCone.y,
                        lastMeasuredCone.newPoint.x,
                        lastMeasuredCone.newPoint.y,
                        lastMeasuredCone.newPoint2.x,
                        lastMeasuredCone.newPoint2.y,
                        pawnCenter.x,
                        pawnCenter.y
                    );
    
                });
            } else if (toolbox[2] && lastMeasuredSphere) { //sphere
    
                pawnsInArea = [...pawns.all].filter(pawn => {
                    var pawnCenter = getPawnOrigin(pawn);
    
                    return Geometry.distance(
                        {
                            x: pawnCenter.x,
                            y: pawnCenter.y
                        },
                        {
                            x: lastMeasuredSphere.x,
                            y: lastMeasuredSphere.y
                        }
                    ) <= lastMeasuredSphere.radius
                });
    
    
            } else if ((toolbox[3] || toolbox[4]) && lastMeasuredCube) {//cube or rectangle
    
                var measureRectangle = toolbox[3] ?
                    {
                        x: lastMeasuredCube.x - lastMeasuredCube.radius,
                        y: lastMeasuredCube.y - lastMeasuredCube.radius,
                        width: lastMeasuredCube.radius * 2,
                        height: lastMeasuredCube.radius * 2
                    } : lastMeasuredCube
    
                pawnsInArea = [...pawns.all].filter(pawn => {
                    var pawnCenter = getPawnOrigin(pawn);
                    return Geometry.insideRect(measureRectangle.x,
                        measureRectangle.y,
                        measureRectangle.x + measureRectangle.width,
                        measureRectangle.y + measureRectangle.height,
                        pawnCenter.x, pawnCenter.y)
                });
    
            } else {
                return;
            }
            clearSelectedPawns();
            if (pawnsInArea?.length > 0) {
    
                pawnsInArea.forEach(element => {
                    selectPawn(element);
                });
    
            }
    
    
    
        }
    
        function measureDistance(event) {
    
            if (measurementPaused) return;
            window.requestAnimationFrame(function () {
    
                var newPoint = {
                    x: event.clientX,
                    y: event.clientY,
                    z: 0
                }
                drawLineAndShowTooltip(measurementOriginPosition, newPoint, event);
            })
        }
    
        function measurementMouseDownHandler(event) {
    
            if (event.button == 0 && event.ctrlKey) {
                if (toolbox[2]) {
                    if (measurementFillStylePath == null || measurementFillStylePath == "") return;
                    var div = document.createElement("div");
                    div.classList.add("sfx_effect", "round", "repeating_bg");
                    div.style.height = lastMeasuredSphere.radius * 2 + "px";
                    div.style.width = lastMeasuredSphere.radius * 2 + "px";
                    div.style.left = lastMeasuredSphere.x - lastMeasuredSphere.radius + "px";
                    div.style.top = lastMeasuredSphere.y - lastMeasuredSphere.radius + "px";
    
                    div.style.backgroundImage = "url('" + measurementFillStylePath + "')";
    
                    tokenLayer.appendChild(div);
                    div.dnd_width = parseInt(lastMeasuredSphere.radius * 2 / (cellSize / 5));
                    div.dnd_height = parseInt(lastMeasuredSphere.radius * 2 / (cellSize / 5));
    
    
                    effects.push(div)
                    measurements.clearMeasurements();
    
                }
            } else {
                stopMeasuring(event);
            }
        }
    }
    
    return {
        clearMeasurements: clearMeasurements,
        startMeasuring:startMeasuring,
        eraseModeOn: eraseModeOn,
        eraseModeOff: eraseModeOff
    }
}();

