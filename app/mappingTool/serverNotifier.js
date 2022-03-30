
var serverNotifier = function () {


    function sendState() {
        var bgState = {};
        backgroundLoop.saveSlideState(bgState)
        console.log(`BG STATE`, bgState)
        var overlayState = {};
        overlayLoop.saveSlideState(overlayState);


        ipcRenderer.send("maptool-server-event", {
            event: "maptool-state", data: {
                tokens: getTokensForExport(),
                backgroundLoop: bgState,
                overlayLoop: overlayState,
                foreground: getForegroundState(),
                overlay: getOverlayState(),
                background: getBackgroundState(),
                effects: getEffectsForExport()
            }
        });

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


    function serverTokensChanged() {
        var tokens = getTokensForExport();
        ipcRenderer.send("maptool-server-event", { event: "tokens", data: tokens });
    }

    function getEffectsForExport() {

        return [];
    }


    function getTokensForExport() {

        var tokens = loadedMonsters.map(x => saveManager.exportPawn(x));
        tokens = tokens.concat(pawns.players.map(x => saveManager.exportPawn(x)));
        return tokens;
    }


    function notifyServer(eventName, data) {
        ipcRenderer.send("maptool-server-event", { event: eventName, data: data });
    }
    return {
        notifyServer: notifyServer,
        sendState: sendState,
        serverTokensChanged: serverTokensChanged
    }
}();
