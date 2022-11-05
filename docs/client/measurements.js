var lastMeasuredSphere, lastMeasuredCube, lastMeasuredCone;

let measurements = (function () {
    var lastLineDash, lastLineWidth, lastFillStyle;
    function clearMeasurements() {
        console.log("Clear measurements");
        measurementsLayerContext.beginPath();
        measurementsLayerContext.save();

        measurementsLayerContext.clearRect(0, 0, gridLayer.width * DEVICE_SCALE, gridLayer.height * DEVICE_SCALE);
        measurementsLayerContext.restore();

        lastMeasuredLineDrawn = null;
        lastMeasuredPoint = null;
    }

    function eraseModeOn() {
        lastLineDash = measurementsLayerContext.getLineDash();
        lastLineWidth = measurementsLayerContext.lineWidth;
        lastFillStyle = measurementsLayerContext.fillStyle;
        measurementsLayerContext.fillStyle = "#fff";
        measurementsLayerContext.globalCompositeOperation = "destination-out";
        measurementsLayerContext.setLineDash([]);
        measurementsLayerContext.lineWidth = 20 * DEVICE_SCALE;
    }

    function eraseModeOff() {
        measurementsLayerContext.fillStyle = lastFillStyle;
        measurementsLayerContext.globalCompositeOperation = "source-over";
        measurementsLayerContext.lineWidth = lastLineWidth;
        measurementsLayerContext.setLineDash(lastLineDash);
    }
    function startMeasuring(event) {
        if (event.button != null && event.button != 0) {
            lastMeasuredPoint = null;
            return;
        }
        hideAllTooltips();
        var clientX = eventX(event);
        var clientY = eventY(event);
        measurementsLayerContext.moveTo(clientX * DEVICE_SCALE, clientY * DEVICE_SCALE);
        console.log("Measurements mouse down")
        document.onmousedown = measurementMouseDownHandler;

        if (measurementTargetOrigin == null) {
            measurementOriginPosition = { x: clientX, y: clientY, z: 0 };
        } else {
            measurementOriginPosition = {
                x: clientX,
                y: clientY,
                z: (cellSize / UNITS_PER_GRID) * parseInt(measurementTargetOrigin.flying_height),
            };
        }
        if (!visibilityLayerVisible) {
            if (toolbox[0]) {
                if (event.button == 0) {
                    if (event.ctrlKey) {
                        if (lastMeasuredLineDrawn) {
                            totalMeasuredDistance += Math.round(
                                (Math.sqrt(
                                    Math.pow(lastMeasuredLineDrawn.a.x - lastMeasuredLineDrawn.b.x, 2) +
                                        Math.pow(lastMeasuredLineDrawn.a.y - lastMeasuredLineDrawn.b.y, 2) +
                                        Math.pow(lastMeasuredLineDrawn.a.z - lastMeasuredLineDrawn.b.z, 2)
                                ) /
                                    cellSize) *
                                    UNITS_PER_GRID
                            );
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
                document.ontouchmove = measureDistance;
            } else if (toolbox[1]) {
                document.onmousemove = measureCone;
                document.ontouchmove = measureCone;
            } else if (toolbox[2]) {
                document.onmousemove = measureSphere;
                document.ontouchmove = measureSphere;
            } else if (toolbox[3]) {
                document.onmousemove = measureCube;
                document.ontouchmove = measureCube;
            } else if (toolbox[4]) {
                document.onmousemove = measureRectangle;
                document.ontouchmove = measureRectangle;
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
                return stopMeasuring(event);
            }

            currentlyAddingSegments = true;
            setupFOVMeasurements();
        }

        //SEGMENT ADDING //
        var lastMeasuredLine;
        function measureLineSegment(event) {
            if (segmentMeasurementPaused) return;
            clientX = eventX(event);
            clientY = eventY(event);
            window.requestAnimationFrame(function () {
                if (lastMeasuredLine != null) {
                    measurements.eraseModeOn();
                    measurementsLayerContext.beginPath();
                    measurementsLayerContext.moveTo(lastMeasuredLine.a.x * DEVICE_SCALE, lastMeasuredLine.a.y * DEVICE_SCALE);
                    measurementsLayerContext.lineTo(lastMeasuredLine.b.x * DEVICE_SCALE, lastMeasuredLine.b.y * DEVICE_SCALE);
                    measurementsLayerContext.stroke();
                    measurements.eraseModeOff();
                } else {
                    lastMeasuredLine = {};
                }
                measurementsLayerContext.beginPath();
                measurementsLayerContext.moveTo(measurementOriginPosition.x * DEVICE_SCALE, measurementOriginPosition.y * DEVICE_SCALE);
                measurementsLayerContext.lineTo(clientX, clientY);
                measurementsLayerContext.stroke();

                var b = {
                    x: clientX,
                    y: clientY,
                };
                lastMeasuredLine.a = measurementOriginPosition;
                lastMeasuredLine.b = b;
            });
        }

        function measureSphereSegment(event) {
            clientX = eventX(event);
            clientY = eventY(event);
            if (segmentMeasurementPaused) return;
            window.requestAnimationFrame(function () {
                if (lastMeasuredSphere) {
                    measurements.eraseModeOn();
                    measurementsLayerContext.beginPath();
                    measurementsLayerContext.arc(lastMeasuredSphere.x * DEVICE_SCALE, lastMeasuredSphere.y * DEVICE_SCALE, lastMeasuredSphere.radius * DEVICE_SCALE, 0, 2 * Math.PI * DEVICE_SCALE);
                    measurementsLayerContext.stroke();
                    measurementsLayerContext.fill();
                    measurements.eraseModeOff();
                } else {
                    lastMeasuredSphere = {};
                }
                var radius = Math.sqrt(Math.pow(clientX - measurementOriginPosition.x, 2) + Math.pow(clientY - measurementOriginPosition.y, 2));
                measurementsLayerContext.beginPath();
                measurementsLayerContext.moveTo(measurementOriginPosition.x * DEVICE_SCALE, measurementOriginPosition.y * DEVICE_SCALE);
                measurementsLayerContext.arc(measurementOriginPosition.x * DEVICE_SCALE, measurementOriginPosition.y * DEVICE_SCALE, radius * DEVICE_SCALE, 0, 2 * Math.PI * DEVICE_SCALE);
                measurementsLayerContext.stroke();
                measurementsLayerContext.fill();

                lastMeasuredSphere.x = measurementOriginPosition.x;
                lastMeasuredSphere.y = measurementOriginPosition.y;
                lastMeasuredSphere.radius = radius;
            });
        }
        function measureRectangleSegment(event) {
            clientX = eventX(event);
            clientY = eventY(event);
            window.requestAnimationFrame(function () {
                if (lastMeasuredCube) {
                    measurements.eraseModeOn();
                    measurementsLayerContext.beginPath();
                    measurementsLayerContext.rect(lastMeasuredCube.x * DEVICE_SCALE, lastMeasuredCube.y * DEVICE_SCALE, lastMeasuredCube.width * DEVICE_SCALE, lastMeasuredCube.height * DEVICE_SCALE);
                    measurementsLayerContext.stroke();
                    measurementsLayerContext.fill();
                    measurements.eraseModeOff();
                } else {
                    lastMeasuredCube = {};
                }
                var width = clientX - measurementOriginPosition.x;
                var height = clientY - measurementOriginPosition.y;
                measurementsLayerContext.beginPath();
                measurementsLayerContext.moveTo(measurementOriginPosition.x * DEVICE_SCALE, measurementOriginPosition.y * DEVICE_SCALE);
                measurementsLayerContext.rect(measurementOriginPosition.x * DEVICE_SCALE, measurementOriginPosition.y * DEVICE_SCALE, width * DEVICE_SCALE, height * DEVICE_SCALE);
                measurementsLayerContext.stroke();
                measurementsLayerContext.fill();
                lastMeasuredCube.x = measurementOriginPosition.x;
                lastMeasuredCube.y = measurementOriginPosition.y;
                lastMeasuredCube.width = width;
                lastMeasuredCube.height = height;
            });
        }

        function measureRectangle(event) {
            if (event.target.classList.contains("button_style")) return;

            clientX = eventX(event);
            clientY = eventY(event);
            window.requestAnimationFrame(function () {
                if (lastMeasuredCube) {
                    measurements.eraseModeOn();
                    measurementsLayerContext.beginPath();
                    measurementsLayerContext.rect(lastMeasuredCube.x * DEVICE_SCALE, lastMeasuredCube.y * DEVICE_SCALE, lastMeasuredCube.width * DEVICE_SCALE, lastMeasuredCube.height * DEVICE_SCALE);
                    measurementsLayerContext.stroke();
                    measurementsLayerContext.fill();
                    measurements.eraseModeOff();
                } else {
                    lastMeasuredCube = {};
                }
                var width = clientX - measurementOriginPosition.x;
                var height = clientY - measurementOriginPosition.y;
                measurementsLayerContext.beginPath();
                measurementsLayerContext.moveTo(measurementOriginPosition.x * DEVICE_SCALE, measurementOriginPosition.y * DEVICE_SCALE);
                measurementsLayerContext.rect(measurementOriginPosition.x * DEVICE_SCALE, measurementOriginPosition.y * DEVICE_SCALE, width * DEVICE_SCALE, height * DEVICE_SCALE);
                measurementsLayerContext.stroke();
                measurementsLayerContext.fill();
                lastMeasuredCube.x = measurementOriginPosition.x;
                lastMeasuredCube.y = measurementOriginPosition.y;
                lastMeasuredCube.width = width;
                lastMeasuredCube.height = height;

                showToolTip(event, Math.abs(Math.round((width / cellSize) * UNITS_PER_GRID)) + " x " + Math.abs(Math.round((height / cellSize) * UNITS_PER_GRID)) + ` ${MAP_UNIT}`, "tooltip");
                attemptToSelectPawnsFromMeasurement();
            });
        }
        function measureCube(event) {
            clientX = eventX(event);
            clientY = eventY(event);

            window.requestAnimationFrame(function () {
                if (lastMeasuredCube) {
                    measurements.eraseModeOn();
                    measurementsLayerContext.beginPath();
                    measurementsLayerContext.rect(
                        (lastMeasuredCube.x - lastMeasuredCube.radius) * DEVICE_SCALE,
                        (lastMeasuredCube.y - lastMeasuredCube.radius) * DEVICE_SCALE,
                        lastMeasuredCube.radius * 2 * DEVICE_SCALE,
                        lastMeasuredCube.radius * 2 * DEVICE_SCALE
                    );
                    measurementsLayerContext.stroke();
                    measurementsLayerContext.fill();
                    measurements.eraseModeOff();
                } else {
                    lastMeasuredCube = {};
                }
                var radius = Math.sqrt(Math.pow(clientX - measurementOriginPosition.x, 2) + Math.pow(clientY - measurementOriginPosition.y, 2));
                measurementsLayerContext.beginPath();
                measurementsLayerContext.moveTo((measurementOriginPosition.x - radius) * DEVICE_SCALE, (measurementOriginPosition.y - radius) * DEVICE_SCALE);
                measurementsLayerContext.rect(
                    (measurementOriginPosition.x - radius) * DEVICE_SCALE,
                    (measurementOriginPosition.y - radius) * DEVICE_SCALE,
                    radius * 2 * DEVICE_SCALE,
                    radius * 2 * DEVICE_SCALE
                );
                measurementsLayerContext.stroke();
                measurementsLayerContext.fill();
                showToolTip(event, `${Math.round((radius / cellSize) * UNITS_PER_GRID) * 2} ${MAP_UNIT}`, "tooltip");
                lastMeasuredCube.x = measurementOriginPosition.x;
                lastMeasuredCube.y = measurementOriginPosition.y;

                lastMeasuredCube.radius = radius;
                attemptToSelectPawnsFromMeasurement();
            });
        }

        function measureSphere(event) {
            clientX = eventX(event);
            clientY = eventY(event);
            window.requestAnimationFrame(function () {
                if (lastMeasuredSphere) {
                    measurements.eraseModeOn();
                    measurementsLayerContext.beginPath();
                    measurementsLayerContext.arc(
                        lastMeasuredSphere.x * DEVICE_SCALE,
                        lastMeasuredSphere.y * DEVICE_SCALE,
                        (lastMeasuredSphere.radius + 40) * DEVICE_SCALE,
                        0,
                        2 * Math.PI * DEVICE_SCALE
                    );
                    measurementsLayerContext.stroke();
                    measurementsLayerContext.fill();
                    measurements.eraseModeOff();
                } else {
                    lastMeasuredSphere = {};
                }
                var radius = Math.sqrt(Math.pow(clientX - measurementOriginPosition.x, 2) + Math.pow(clientY - measurementOriginPosition.y, 2));
                measurementsLayerContext.beginPath();
                measurementsLayerContext.moveTo(measurementOriginPosition.x * DEVICE_SCALE, measurementOriginPosition.y * DEVICE_SCALE);
                measurementsLayerContext.arc(measurementOriginPosition.x * DEVICE_SCALE, measurementOriginPosition.y * DEVICE_SCALE, radius * DEVICE_SCALE, 0, 2 * Math.PI * DEVICE_SCALE);
                measurementsLayerContext.stroke();
                measurementsLayerContext.fill();

                lastMeasuredSphere.x = measurementOriginPosition.x;
                lastMeasuredSphere.y = measurementOriginPosition.y;
                lastMeasuredSphere.radius = radius;
                showToolTip(event, Math.round((radius / cellSize) * UNITS_PER_GRID) + " ft rad", "tooltip");
                attemptToSelectPawnsFromMeasurement();
            });
        }

        function measureCone(event) {
            clientX = eventX(event);
            clientY = eventY(event);
            window.requestAnimationFrame(function () {
                if (lastMeasuredCone) {
                    measurements.eraseModeOn();
                    measurementsLayerContext.beginPath();
                    measurementsLayerContext.rect(
                        (lastMeasuredCone.x - lastMeasuredCone.radius) * DEVICE_SCALE,
                        (lastMeasuredCone.y - lastMeasuredCone.radius) * DEVICE_SCALE,
                        lastMeasuredCone.radius * 2 * DEVICE_SCALE,
                        lastMeasuredCone.radius * 2 * DEVICE_SCALE
                    );
                    measurementsLayerContext.stroke();
                    measurementsLayerContext.fill();
                    measurements.eraseModeOff();
                } else {
                    lastMeasuredCone = {};
                }
                measurementsLayerContext.beginPath();
                measurementsLayerContext.moveTo(measurementOriginPosition.x * DEVICE_SCALE, measurementOriginPosition.y * DEVICE_SCALE);
                var newPoint = Geometry.rotate(0.46355945, measurementOriginPosition, { x: clientX, y: clientY });
                var newPoint2 = Geometry.rotate(-0.46355944999997217, measurementOriginPosition, { x: clientX, y: clientY });

                var midPoint = {
                    x: (newPoint.x + newPoint2.x) / 2,
                    y: (newPoint.y + newPoint2.y) / 2,
                };

                measurementsLayerContext.lineTo(newPoint.x * DEVICE_SCALE, newPoint.y * DEVICE_SCALE);
                measurementsLayerContext.lineTo(newPoint2.x * DEVICE_SCALE, newPoint2.y * DEVICE_SCALE);
                measurementsLayerContext.lineTo(measurementOriginPosition.x * DEVICE_SCALE, measurementOriginPosition.y * DEVICE_SCALE);
                measurementsLayerContext.stroke();
                measurementsLayerContext.fill();

                showToolTip(
                    event,
                    Math.round((Math.sqrt(Math.pow(midPoint.x - measurementOriginPosition.x, 2) + Math.pow(midPoint.y - measurementOriginPosition.y, 2)) / cellSize) * UNITS_PER_GRID) + ` ${MAP_UNIT}`,
                    "tooltip"
                );

                lastMeasuredCone.x = measurementOriginPosition.x;
                lastMeasuredCone.y = measurementOriginPosition.y;
                lastMeasuredCone.newPoint = newPoint;
                lastMeasuredCone.newPoint2 = newPoint2;

                lastMeasuredCone.radius = Math.sqrt(Math.pow(clientX - measurementOriginPosition.x, 2) + Math.pow(clientY - measurementOriginPosition.y, 2));
                attemptToSelectPawnsFromMeasurement();
            });
        }

        function attemptToSelectPawnsFromMeasurement() {
            var pawnsInArea;
            if (toolbox[1] && lastMeasuredCone) {
                //cone
                pawnsInArea = [...pawns.all].filter((pawn) => {
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
            } else if (toolbox[2] && lastMeasuredSphere) {
                //sphere

                pawnsInArea = [...pawns.all].filter((pawn) => {
                    var pawnCenter = getPawnOrigin(pawn);

                    return (
                        Geometry.distance(
                            {
                                x: pawnCenter.x,
                                y: pawnCenter.y,
                            },
                            {
                                x: lastMeasuredSphere.x,
                                y: lastMeasuredSphere.y,
                            }
                        ) <= lastMeasuredSphere.radius
                    );
                });
            } else if ((toolbox[3] || toolbox[4]) && lastMeasuredCube) {
                //cube or rectangle

                var measureRectangle = toolbox[3]
                    ? {
                          x: lastMeasuredCube.x - lastMeasuredCube.radius,
                          y: lastMeasuredCube.y - lastMeasuredCube.radius,
                          width: lastMeasuredCube.radius * 2,
                          height: lastMeasuredCube.radius * 2,
                      }
                    : lastMeasuredCube;

                pawnsInArea = [...pawns.all].filter((pawn) => {
                    var pawnCenter = getPawnOrigin(pawn);
                    return Geometry.insideRect(
                        measureRectangle.x,
                        measureRectangle.y,
                        measureRectangle.x + measureRectangle.width,
                        measureRectangle.y + measureRectangle.height,
                        pawnCenter.x,
                        pawnCenter.y
                    );
                });
            } else {
                return;
            }
            clearSelectedPawns();
            if (pawnsInArea?.length > 0) {
                pawnsInArea.forEach((element) => {
                    selectPawn(element);
                });
            }
        }

        function measureDistance(event) {
            clientX = eventX(event);
            clientY = eventY(event);

            if (measurementPaused) return;
            window.requestAnimationFrame(function () {
                var newPoint = {
                    x: clientX,
                    y: clientY,
                    z: 0,
                };
                drawLineAndShowTooltip(measurementOriginPosition, newPoint, event);
            });
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
                    div.dnd_width = parseInt((lastMeasuredSphere.radius * 2) / (cellSize / UNITS_PER_GRID));
                    div.dnd_height = parseInt((lastMeasuredSphere.radius * 2) / (cellSize / UNITS_PER_GRID));

                    effects.push(div);
                    measurements.clearMeasurements();
                }
            } else {
                stopMeasuring(event);
            }
        }
    }

    function getPawnOrigin(pawn) {
        var rect = pawn.getBoundingClientRect();

        return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    }

    return {
        clearMeasurements: clearMeasurements,
        startMeasuring: startMeasuring,
        eraseModeOn: eraseModeOn,
        eraseModeOff: eraseModeOff,
    };
})();
