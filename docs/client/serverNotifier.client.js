
var serverNotifier = function () {
    var timeouts = {};
    const CLIENT_EVENTS = ["object-moved"]
    function sendState() {


    }


    function serverTokensChanged() {

    }

    function getEffectsForExport() {

        return [];
    }

    function getSegments() {
        return [];
    }


    function getTokensForExport() {

        return [];
    }



    function notifyServer(eventName, data) {
        console.log(`Notify server: ${eventName}`, data)
        if (CLIENT_EVENTS.includes(eventName)) {
            if (hostConnection != null && hostConnection.open) {
                hostConnection.send({ event: eventName, data: data });
            }
        }


    }

    function isServer() {
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
        getSegments:getSegments,
        getTokensForExport:getTokensForExport,
        getBackgroundState: getBackgroundState,
        getOverlayState: getOverlayState,
        isServer: isServer,
        timeouts: timeouts
    }
}();
