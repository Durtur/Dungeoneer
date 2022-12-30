const module = {};
const util = window.api.util;
const diceRoller = window.api.diceRoller;
const constants = window.api.constants;
const clientPath = "https://www.ogreforge.me/Dungeoneer/client";
const pendingStateRequests = [];
const partyArray = [];
const SERVER_EVENTS = {
    CONNECTED: 0,
    MOVE: 1,
    ERROR: 2,
};

var peer;

var CONNECTION_PARAMS;

var clientFog = 2;
loadParty();

window.addEventListener("beforeunload", (event) => {
    window.subscribe.notifyServerState({ running: false });
});

window.subscribe.on("maptool-server-event", async (event, message) => {
    if (message.event == "maptool-state") {
        return sendMaptoolState(message.data);
    }
    if (["foreground", "background", "overlay", "map_edge"].find((x) => x == message.event)) {
        return sendLayerInfo(message);
    }
    if (message.event == "party-changed") {
        return loadParty();
    }
    if (message.event == "fog-set") {
        if (clientFogUserSet) return;
        return setClientFog(message.data);
    }
    if (message.event == "request-state") {
        window.subscribe.notifyServerState({ running: peer?.open });
    }

    notifyPeers(message);
});

function notifyPeers(message) {
    peers.forEach((peer) => {
        peer.connection.send(message);
    });
}

async function sendLayerInfo(message) {
    var base64Layer = await getMapLayer(message.data.path, message.event);
    peers.forEach(async (peer) => {
        if (!base64Layer) peer.connection.send({ event: message.event, data: { metadata: {} } });
        sendBatched(peer.connection, message.event, base64Layer.data, {
            width: message.data.width,
            height: message.data.height,
            translate: message.data.translate,
            format: base64Layer.format,
        });
    });
}

function loadParty() {
    dataAccess.getParty((party) => {
        console.log(party);
        while (partyArray.length) partyArray.pop();
        party.members.filter((x) => x.active).forEach((p) => partyArray.push(p));
        peers.onchange();
    });
}

var peers = [];
peers.add = function (peer) {
    this.push(peer);
    peer.onAccessChanged = function () {
        if (!peer.connection.open) return;
        var access = peer.partyAccess == null ? [] : peer.partyAccess;
        access.map((x) => (x.element_id = x.id));
        peer.connection.send({ event: "access-changed", data: access });
    };
    this.onchange();
};

peers.remove = function (element) {
    const index = this.indexOf(element);
    if (index > -1) {
        this.splice(index, 1);
    }
    this.onchange();
    element.timeout.destroy();
};

peers.onchange = function () {
    console.log("Peers changed");
    var cont = document.getElementById("peers_container");
    while (cont.firstChild) cont.removeChild(cont.firstChild);

    peers.forEach((peer) => cont.appendChild(createPeerElement(peer)));
};

function getDefaultAccess(peer) {
    if (peer.name == null) return null;
    var access = [];
    var players = partyArray.filter((x) => x.player_name.toLowerCase() == peer.name.toLowerCase());
    if (players.length > 0) {
        access = players;
    }
    return access;
}

function createPeerElement(peer) {
    if (peer.partyAccess == null || !peer.user_selected) peer.partyAccess = getDefaultAccess(peer);
    var ele = util.ele("div", "peer_node column peer_connected");
    var p = util.ele("p", "peer_name", peer.name || "???");
    peer.onAccessChanged();
    if (peer.partyAccess == null) return ele;

    ele.appendChild(p);
    [{ character_name: "Full control", id: "all" }, ...partyArray].forEach((player) => {
        var isChecked = peer.partyAccess.find((x) => x.id == player.id) != null;

        var checkBox = ElementCreator.checkBox(player.character_name, isChecked, (e) => {
            var checked = e.target.checked;
            if (!checked) {
                peer.partyAccess = peer.partyAccess.filter((x) => x.id != player.id);
            } else {
                peer.partyAccess.push(player);
            }
            peer.user_selected = true;
            peer.onAccessChanged();
        });

        ele.appendChild(checkBox);
    });

    return ele;
}

document.addEventListener("DOMContentLoaded", () => {
    window.subscribe.notifyServerState({ running: false });
    document.getElementById("init_server_button").onclick = () => initServer();
    document.getElementById("regenerate_host_id_button").onclick = (e) => (document.getElementById("server_id").value = "");
    var id = localStorage.getItem("server_id");
    if (id) {
        document.getElementById("server_id").value = id;
        document.getElementById("regenerate_host_id_button").classList.remove("hidden");
    }
    document.getElementById("server_id").onclick = (e) => {
        if (!e.target.value) return;
        navigator.clipboard.writeText(e.target.value).then(
            function () {
                util.showMessage("Host ID copied to clipboard");
            },
            function (err) {
                console.error("Async: Could not copy text: ", err);
            }
        );
    };

    document.getElementById("invite_link_button").onclick = (e) => {
        if (!document.getElementById("server_id").value) return;
        var text = `${clientPath}?hostID=${document.getElementById("server_id").value}`;
        navigator.clipboard.writeText(text).then(
            function () {
                util.showMessage("Invite link copied to clipboard");
            },
            function (err) {
                console.error("Async: Could not copy text: ", err);
            }
        );
    };
});

var clientFogUserSet = false;
// Dark: 1,
// LowLight: 0,
// None: 2
function setClientFog(fogType, userOriginated = false) {
    clientFog = fogType;
    var btns = document.querySelectorAll(".set_fog_btn");
    [...btns].forEach((btn) => {
        btn.classList.remove("underlined");
        if (parseInt(btn.getAttribute("data-fog-type")) == fogType) btn.classList.add("underlined");
    });
    notifyPeers({ event: "fog-set", data: fogType });
    if (userOriginated) {
        clientFogUserSet = true;
    }
}

function appendServerLog(text, eventType) {
    var log = document.getElementById("server_activity_log");
    if (eventType == SERVER_EVENTS.CONNECTED) {
        wrapLog(util.ele("p", "server_activity_log_entry log_entry_connected", text));
    } else if (eventType == SERVER_EVENTS.ERROR) {
        wrapLog(util.ele("p", "server_activity_log_entry log_entry_error", text));
    } else {
        wrapLog(util.ele("p", "server_activity_log_entry ", text));
    }

    log.scrollTop = log.scrollHeight;

    function wrapLog(entry) {
        var timestamp = util.ele("p", "server_activity_log_timestamp ", util.currentTimeStamp());
        var cont = util.wrapper("div", "row", timestamp);
        cont.appendChild(entry);
        log.appendChild(cont);
    }
}

async function getConnectionParams() {
    if (CONNECTION_PARAMS) return CONNECTION_PARAMS;
    try {
        const response = await fetch("https://raw.githubusercontent.com/Durtur/Dungeoneer/master/docs/client/connectionConfig.js", { cache: "no-cache" });
        if (response.ok) {
            var rawText = await response.text();
            console.log(rawText);
            rawText = rawText.replace("var PEER_CONNECTION_CONFIG =", "");
            CONNECTION_PARAMS = JSON.parse(rawText);
            return;
        }
    } catch (ex) {
        console.error(ex);
    }
    showError("Error fetching peer server information");
}

async function initServer() {
    showLoading("Contacting P2P server");
    await getConnectionParams();
    var hostId = document.getElementById("server_id").value;

    peer = hostId ? new Peer(hostId, CONNECTION_PARAMS) : new Peer(CONNECTION_PARAMS);
    peer.on("open", function (id) {
        document.getElementById("server_id").value = id;
        localStorage.setItem("server_id", id);
        [...document.querySelectorAll(".server_active_container")].forEach((x) => x.classList.remove("hidden"));
        [...document.querySelectorAll(".server_inactive_container")].forEach((x) => x.classList.add("hidden"));

        document.getElementById("init_server_button").classList.add("hidden");
        appendServerLog("Server started", SERVER_EVENTS.CONNECTED);
        document.getElementById("status_text").classList.add("hidden");
        window.subscribe.notifyServerState({ running: true });
        hideLoading();
    });

    peer.on("disconnected", function () {
        console.log("Peer disconnected");
        peer.reconnect();
        window.subscribe.notifyServerState({ running: false });
        clearError();
    });
    peer.on("error", function (err) {
        hideLoading();
        showError(err);
        [...document.querySelectorAll(".server_active_container")].forEach((x) => x.classList.add("hidden"));
        [...document.querySelectorAll(".server_inactive_container")].forEach((x) => x.classList.remove("hidden"));
        window.subscribe.notifyServerState({ running: false });
        document.getElementById("init_server_button").innerHTML = "Retry";
    });

    peer.on("connection", function (conn) {
        onConnected(conn);
    });
}

function onConnected(conn) {
    console.log("Peer connected");
    var pass = document.getElementById("server_password").value;
    if (pass) {
        if (conn.metadata.password != pass) {
            conn.close();
            appendServerLog(`Rejected ${conn.connectionId} due to incorrect password`, SERVER_EVENTS.ERROR);
            return;
        }
    }

    console.log(conn);

    var peer = peers.find((x) => x.connectonId == conn.connectionId);
    if (!peer) {
        peers.add({
            connection: conn,
            connectionId: conn.connectionId,
            timeout: new Timeout(conn),
        });
    }

    conn.on("data", function (data) {
        if (data.event == "ping") {
            return conn.send({ event: "ack" });
        } else if (data.event == "ack") {
            var peer = peers.find((x) => x.connectionId == conn.connectionId);
            console.log(peers);
            peer.timeout.ack();
            return;
        }
        console.log("Received", data);
        handleDataEvent(data, conn);
    });
    conn.on("error", function (err) {
        showError(`Error in peer connection ${err}`);
        var disonnected = peers.filter((x) => !x.connection.open);
        disonnected.forEach((peer) => peers.remove(peer));
    });

    conn.on("close", () => {
        peers.onchange();
        console.log("Connection closed");
        var disonnected = peers.filter((x) => !x.connection.open);
        disonnected.forEach((peer) => peers.remove(peer));
    });
}

function handleDataEvent(data, connection) {
    console.log(`Data from ${connection}`);
    console.log(data);
    var peer = getPeer(connection.connectionId);
    var handleFunction = CLIENT_EVENT_HANLDERS[data.event];
    if (handleFunction) handleFunction(data, connection, peer);

}

function notifyMaptool(data) {
    window.api.messageWindow("maptoolWindow", "client-event", data);
}

function getPeer(connectionId) {
    var peer = peers.find((x) => x.connectionId == connectionId);
    if (!peer) throw "peer not found";
    return peer;
}
var EXPORT_LAYER_CACHE = {};
async function getMapLayer(path, cacheKey) {
    if (path == null) return null;

    if (EXPORT_LAYER_CACHE[cacheKey] && EXPORT_LAYER_CACHE[cacheKey].path == path) {
        return EXPORT_LAYER_CACHE[cacheKey];
    }
    appendServerLog(`Packaging ${cacheKey}`);
    var isSvg = window.api.extname(path).substring(1) == "svg";
    var base64 = await util.toBase64(path, isSvg);
    EXPORT_LAYER_CACHE[cacheKey] = {
        path: path,
        data: base64,
        format: isSvg ? "svg+xml;utf8" : "webp",
    };
    appendServerLog(`${cacheKey} packaging complete`);
    return EXPORT_LAYER_CACHE[cacheKey];
}

function sendMaptoolState(maptoolState) {
    dataAccess.getSettings(async (settings) => {
        while (pendingStateRequests.length > 0) {
            var peer = pendingStateRequests.pop();

            var mt = settings.maptool;

            var dataObject = {
                foreground: await getMapLayer(maptoolState.foreground.path, "foreground"),
                background: await getMapLayer(maptoolState.background.path, "background"),
                mapEdge: await getMapLayer(mt.map_edge_style, "map_edge"),
                overlay: await getMapLayer(maptoolState.overlay.path, "overlay"),
            };
            peer.connection.send({ event: "constants", data: constants });
            peer.connection.send({
                event: "condition-list",
                data: maptoolState.conditions,
            });
            peer.connection.send({
                event: "foreground-translate",
                data: maptoolState.foreground.translate,
            });
            sendBatched(peer.connection, "foreground", dataObject.foreground?.data, {
                width: maptoolState.foreground?.width,
                height: maptoolState.foreground?.height,
                translate: maptoolState.foreground?.translate,
                format: dataObject.foreground?.format,
            });
            sendBatched(peer.connection, "map_edge", dataObject.mapEdge?.data, {
                format: dataObject.mapEdge?.format,
            });
         
            sendBatched(peer.connection, "background", dataObject.background?.data, {
                width: maptoolState.background?.width,
                height: maptoolState.background?.height,
                format: dataObject.background?.format,
            });
            sendBatched(peer.connection, "overlay", dataObject.overlay?.data, {
                width: maptoolState.overlay?.width,
                height: maptoolState.overlay?.height,
                format: dataObject.overlay?.format,
            });

            var tokenJSON = JSON.stringify(maptoolState.tokens);

            sendBatched(peer.connection, "tokens-set", tokenJSON);
            sendEffects(maptoolState.effects, peer.connection);

            peer.connection.send({
                event: "backgroundLoop",
                data: maptoolState.backgroundLoop,
            });
            peer.connection.send({
                event: "overlayLoop",
                data: maptoolState.overlayLoop,
            });
            peer.connection.send({ event: "segments", data: maptoolState.segments });
            peer.connection.send({
                event: "round-timer",
                data: maptoolState.roundTimer,
            });
            peer.connection.send({
                event: "initiative",
                data: maptoolState.initiative,
            });
            setClientFog(clientFogUserSet ? clientFog : maptoolState.fog);
        }
    });
}

const CUSTOM_SOUND_CACHE = {};
async function sendSoundBase64(effectSrc, connection) {
    var soundLib = await soundManager.getAvailableSounds();
    var libSound = soundLib.find((x) => x.name.toLowerCase() == effectSrc);

    if (libSound.isDefault) return;
    appendServerLog(`Packaging custom sound ${effectSrc}`);
    if (!CUSTOM_SOUND_CACHE[libSound.path]) {
        CUSTOM_SOUND_CACHE[libSound.path] = await dataAccess.base64(libSound.path);
    }
    var base64 = CUSTOM_SOUND_CACHE[libSound.path];

    appendServerLog(`Packaging  ${effectSrc} complete`);
    sendBatched(connection, "custom-sound-entry", base64, {
        encoding: window.api.extname(libSound.path).substring(1),
        src: libSound.name,
    });
}

async function sendEffects(effectArr, connection) {
    var effectJSON = JSON.stringify(effectArr);
    sendBatched(connection, "effects-set", effectJSON);
}
const CHUNK_SIZE = 1000000;
function sendBatched(connection, key, msgString, metadata) {
    if (msgString == null) {
        return connection.send({
            event: key,
            data: { base64: null, chunk: 1, chunks: 1 },
        });
    }

    var totalLength = msgString.length;
    var chunks = Math.ceil(totalLength / CHUNK_SIZE);

    for (var i = 0; i < chunks; i++) {
        var start = i * CHUNK_SIZE;
        console.log(connection);
        connection.send({
            event: key,
            data: {
                base64: msgString.substring(start, start + CHUNK_SIZE),
                chunk: i + 1,
                chunks: chunks,
                metadata: metadata,
            },
        });
    }
}

function showError(err) {
    document.getElementById("error_message").innerHTML = err;
}

function clearError() {
    document.getElementById("error_message").innerHTML = "";
}

function hideLoading() {
    document.getElementById("loading").classList.add("hidden");
}
function showLoading(text) {
    var loadingEle = document.getElementById("loading");
    document.getElementById("loading_text").innerHTML = text;
    loadingEle.classList.remove("hidden");
}
