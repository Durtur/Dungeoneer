
var serverNotifier = function () {
    var timeouts = {};

    function sendState() {


    }


    function serverTokensChanged() {

    }

    function getEffectsForExport() {

        return [];
    }


    function getTokensForExport() {

        return [];
    }


    function notifyServer(eventName, data) {

    }

    function isServer(){
        return false;
    }

    function getForegroundState() { }

    function getBackgroundState() { }

    function getOverlayState() { }
    return {
        notifyServer: notifyServer,
        sendState: sendState,
        serverTokensChanged: serverTokensChanged,
        getForegroundState: getForegroundState,
        getBackgroundState: getBackgroundState,
        getOverlayState: getOverlayState,
        isServer:isServer,
        timeouts: timeouts
    }
}();
