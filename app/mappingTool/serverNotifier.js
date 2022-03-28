
var serverNotifier = function () {


    function sendState() {
        var bgState = {};
        backgroundLoop.saveSlideState(bgState)
        var overlayState = {};
        overlayLoop.saveSlideState(overlayState);

        var tokens = getTokensForExport();
        ipcRenderer.send("maptool-server-event", {
            event: "maptool-state", data: {
                tokens: tokens,
                backgroundLoop: bgState,
                overlayLoop: overlayState,
                effects: getEffectsForExport()
            }
        });

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
        tokens = tokens.concat(pawns.players.map(x=> saveManager.exportPawn(x)));
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
