
var serverNotifier = function () {
    var timeouts = {};

    async function sendState() {
        var bgState = {};
        backgroundLoop.saveSlideState(bgState)
        console.log(`BG STATE`, bgState)
        var overlayState = {};
        overlayLoop.saveSlideState(overlayState);


        ipcRenderer.send("maptool-server-event", {
            event: "maptool-state", data: {
                tokens: await getTokensForExport(),
                backgroundLoop: bgState,
                overlayLoop: overlayState,
                foreground: getForegroundState(),
                overlay: getOverlayState(),
                background: getBackgroundState(),
                effects: await getEffectsForExport(),
                segments: { segments: getSegments() },
                fog: fovLighting.getFogStyle(),
                conditions:await getConditionsForExport()
            }
        });

    }

    function getSegments() {
        var segments = fovLighting.getSegments();
        return segments.map(seg => {
            return {
                a: map.toGridCoords(seg.a.x, seg.a.y),
                b: map.toGridCoords(seg.b.x, seg.b.y)
            }
        })
    }

    function isServer() {
        return true;
    }

    function getBackgroundState() {
        var hw = getCanvasState(backgroundCanvas);
        return { path: settings.currentBackground, width: hw.width, height: hw.height }
    }

    function getForegroundState() {
        var hw = getCanvasState(foregroundCanvas);
        return { path: settings.currentMap, width: hw.width, height: hw.height, translate: { x: foregroundCanvas.data_transform_x, y: foregroundCanvas.data_transform_y } }
    }


    function getOverlayState() {
        var hw = getCanvasState(overlayCanvas);
        return { path: settings.currentOverlay, width: hw.width, height: hw.height }
    }

    function getCanvasState(canvas) {
        return { height: parseFloat(canvas.style.height), width: parseFloat(canvas.style.width) };
    }


    async function serverTokensChanged() {
        var tokens = await getTokensForExport();
        ipcRenderer.send("maptool-server-event", { event: "tokens", data: tokens });
    }

    async function getEffectsForExport() {
        var effectArr = [];
        for (var i = 0; i < effects.length; i++) {
            effectArr.push(await saveManager.exportEffect(effects[i]));
        }
        return effectArr;
    }


    async function getTokensForExport() {
        var tokens = [];
        for (var i = 0; i < loadedMonsters.length; i++) {
            tokens.push(await saveManager.exportPawn(loadedMonsters[i]))
        }
        for (var i = 0; i < pawns.players.length; i++) {
            tokens.push(await saveManager.exportPawn(pawns.players[i]))
        }

        return tokens;
    }


    function notifyServer(eventName, data) {
        ipcRenderer.send("maptool-server-event", { event: eventName, data: data });
    }

    async function getConditionsForExport(){
        var exportList = JSON.parse(JSON.stringify(conditionList));
        for(var i = 0 ; i < conditionList.length ; i++){
            exportList[i].base64img = await Util.toBase64(exportList[i].condition_background_location);
            delete exportList[i].condition_background_location;
        }
        return exportList;
     
    }
    return {
        notifyServer: notifyServer,
        sendState: sendState,
        getConditionsForExport:getConditionsForExport,
        getForegroundState: getForegroundState,
        getTokensForExport: getTokensForExport,
        getBackgroundState: getBackgroundState,
        getOverlayState: getOverlayState,
        serverTokensChanged: serverTokensChanged,
        isServer: isServer,
        getSegments: getSegments,
        getEffectsForExport: getEffectsForExport,
        timeouts: timeouts
    }
}();
