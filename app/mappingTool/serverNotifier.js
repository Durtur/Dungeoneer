var serverNotifier = (function () {
    var timeouts = {};

    async function mapToolInit() {
        notifyServer("backgroundLoop", {});
        notifyServer("overlayLoop", {});
        notifyServer("segments", []);
        notifyServer("initiative", initiative.getState());
    }

    async function sendState() {
        var bgState = {};
        backgroundLoop.saveSlideState(bgState);
        var overlayState = {};
        overlayLoop.saveSlideState(overlayState);

        ipcRenderer.send("maptool-server-event", {
            event: "maptool-state",
            data: {
                tokens: await getTokensForExport(false),
                backgroundLoop: bgState,
                overlayLoop: overlayState,
                foreground: getForegroundState(),
                overlay: getOverlayState(),
                background: getBackgroundState(),
                effects: await getEffectsForExport(),
                segments: { segments: getSegments() },
                fog: fovLighting.getFogStyle(),
                conditions: await getConditionsForExport(),
                roundTimer: roundTimer?.getState(),
                initiative: initiative.getState(),
            },
        });
    }

    function getSegments() {
        var segments = fovLighting.getSegments();
        return segments.map((seg) => {
            return {
                a: map.toGridCoords(seg.a.x, seg.a.y),
                b: map.toGridCoords(seg.b.x, seg.b.y),
            };
        });
    }

    function isServer() {
        return true;
    }

    function getBackgroundState() {
        var hw = getCanvasState(backgroundCanvas);
        return { path: settings.currentBackground, width: hw.width, height: hw.height };
    }

    function getMapEdgeState() {
        return { path: settings.map_edge_style, width: null, height: null };
    }

    function getForegroundState() {
        var hw = getCanvasState(foregroundCanvas);
        return { path: settings.currentMap, width: hw.width, height: hw.height, translate: { x: foregroundCanvas.data_transform_x || 0, y: foregroundCanvas.data_transform_y || 0 } };
    }

    function getOverlayState() {
        var hw = getCanvasState(overlayCanvas);
        return { path: settings.currentOverlay, width: hw.width, height: hw.height };
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

    async function getTokensForExport(includeHidden) {
        var tokens = [];
        for (var i = 0; i < pawns.monsters.length; i++) {
            if (!includeHidden && pawns.monsters[i][0].client_hidden) continue;
            tokens.push(await saveManager.exportPawn(pawns.monsters[i]));
        }
        for (var i = 0; i < pawns.players.length; i++) {
            if (!includeHidden && pawns.players[i][0].client_hidden) continue;
            tokens.push(await saveManager.exportPawn(pawns.players[i], includeHidden));
        }
        console.log(tokens);

        return tokens;
    }

    function notifyServer(eventName, data) {
        ipcRenderer.send("maptool-server-event", { event: eventName, data: data });
    }

    async function getConditionsForExport() {
        var exportList = JSON.parse(JSON.stringify(conditionList));
        for (var i = 0; i < conditionList.length; i++) {
            exportList[i].base64img = await Util.toBase64(exportList[i].condition_background_location);
            delete exportList[i].condition_background_location;
        }
        return exportList;
    }

    async function mobTokensChanged(mobElement) {
        notifyServer("mob-tokens-set", await saveManager.exportMobTokens(mobElement));
    }

    function serverIsRunning() {
        return document.getElementById("open_server_button").classList.contains("server_running");
    }
    return {
        notifyServer: notifyServer,
        serverIsRunning: serverIsRunning,
        sendState: sendState,
        mapToolInit: mapToolInit,
        getConditionsForExport: getConditionsForExport,
        getForegroundState: getForegroundState,
        getTokensForExport: getTokensForExport,
        getBackgroundState: getBackgroundState,
        getMapEdgeState,
        getMapEdgeState,
        getOverlayState: getOverlayState,
        serverTokensChanged: serverTokensChanged,
        mobTokensChanged: mobTokensChanged,
        isServer: isServer,
        getSegments: getSegments,
        getEffectsForExport: getEffectsForExport,
        timeouts: timeouts,
    };
})();
