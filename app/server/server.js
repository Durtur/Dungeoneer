const util = require("./js/util");
const ElementCreator = require("./js/lib/elementCreator");
const dataAccess = require("./js/dataaccess");
const { ipcRenderer } = require('electron');
const pathModule = require('path');
const clientPath = "file:///C:/Forritun/Dungeoneer/docs/client.html"// "https://www.ogreforge.me/Dungeoneer/client"//
const pendingStateRequests = [];
const partyArray = [];

loadParty();
ipcRenderer.on("maptool-server-event", function (event, message) {
    console.log(event);
    console.log(message);
    if (message.event == 'maptool-state') {
        return sendMaptoolState(message.data);
    }
    if (["foreground", "background", "overlay"].find(x => x == message.event)) {
        return sendLayerInfo(message);
    }
    if (message.event == "party-changed") {
        return loadParty();
    }

    notifyPeers(message);

});

function notifyPeers(message) {
    peers.forEach(peer => {
        peer.connection.send(message);
    })
}

function sendLayerInfo(message) {
    peers.forEach(async peer => {
        var base64layer = await util.toBase64(message.data.path);
        sendBatched(peer.connection, message.event, base64layer, { width: message.data.width, height: message.data.height, translate: message.data.translate });
    })

}

function loadParty() {
    dataAccess.getParty(party => {
        console.log(party);
        while (partyArray.length) partyArray.pop();
        party.members.filter(x => x.active).forEach(p => partyArray.push(p));
        peers.onchange();
    })
}

var connectionObj =
{
    secure: true,
    host: 'dungeoneer-peer-server.herokuapp.com',
    port: 443
}

var peers = [];
peers.add = function (peer) {
    this.push(peer);
    peer.onAccessChanged = function () {
        if (!peer.connection.open)
            return;
        var access = peer.partyAccess == null ? [] : peer.partyAccess;
        access.map(x => x.element_id = x.id);
        peer.connection.send({ event: "access-changed", data: access });
    }
    this.onchange();
}

peers.remove = function (element) {
    const index = this.indexOf(element);
    if (index > -1) {
        this.splice(index, 1);
    }
    this.onchange();
}

peers.onchange = function () {
    console.log("Peers changed");
    var cont = document.getElementById("peers_container");
    while (cont.firstChild)
        cont.removeChild(cont.firstChild);

    peers.forEach(peer => cont.appendChild(createPeerElement(peer)));
}



function getDefaultAccess(peer) {
    if (peer.name == null)
        return null;
    var access = [];
    var players = partyArray.filter(x => x.player_name.toLowerCase() == peer.name.toLowerCase());
    if (players.length > 0) {
        access = players;
    }
    return access;

}

function createPeerElement(peer) {
    if (peer.partyAccess == null || !peer.user_selected)
        peer.partyAccess = getDefaultAccess(peer);
    var ele = util.ele("div", "peer_node column peer_connected");
    var p = util.ele("p", "peer_name", peer.name || "???");
    peer.onAccessChanged();
    if (peer.partyAccess == null)
        return ele;

    ele.appendChild(p);
    [{ character_name: "Full control", id: "all" }, ...partyArray].forEach(player => {
        var isChecked = peer.partyAccess.find(x => x.id == player.id) != null;

        var checkBox = ElementCreator.checkBox(player.character_name, isChecked, (e) => {
            console.log(e.target.checked);
            var checked = e.target.checked;
            if (!checked) {
                peer.partyAccess = peer.partyAccess.filter(x => x.id != player.id);
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
    document.getElementById("init_server_button").onclick = () => initServer();
    document.getElementById("server_id").onclick = (e) => {
        navigator.clipboard.writeText(e.target.value).then(function () {
            util.showMessage("Host ID copied to clipboard");
        }, function (err) {
            console.error('Async: Could not copy text: ', err);
        });
    };

    document.getElementById("invite_link_button").onclick = (e) => {
        var text = `${clientPath}?hostID=${document.getElementById("server_id").value}`
        navigator.clipboard.writeText(text).then(function () {
            util.showMessage("Invite link copied to clipboard");
        }, function (err) {
            console.error('Async: Could not copy text: ', err);
        });
    };

});

function initServer() {
    showLoading("Contacting P2P server");
    var peer = new Peer(connectionObj);
    peer.on('open', function (id) {

        document.getElementById("server_id").value = id;
        document.getElementById("server_info_container").classList.remove("hidden");
        document.getElementById("init_server_button").classList.add("hidden");
        document.getElementById("status_text").innerHTML = "Server running";
        hideLoading();
    });

    peer.on('disconnected', function () {
        console.log("Peer disconnected")
        peer.reconnect();
        clearError();
    });
    peer.on('error', function (err) {
        hideLoading();
        showError(err);

        document.getElementById("init_server_button").innerHTML = "Retry";
    });

    peer.on('connection', function (conn) {
        onConnected(conn);

    });
}

function onConnected(conn) {
    console.log("Peer connected");
    console.log(conn);

    var peer = peers.find(x => x.connectonId == conn.connectionId);
    if (!peer) {
        peers.add({ connection: conn, connectionId: conn.connectionId });
    }
    conn.on('data', function (data) {
        console.log('Received', data);
        handleDataEvent(data, conn);
        conn.send("ack");
    });
    conn.on('error', function (err) {
        showError(`Error in peer connection ${err}`);
        var disonnected = peers.filter(x => !x.connection.open);
        disonnected.forEach(peer => peers.remove(peer));
    });

    conn.on('close', () => {
        peers.onchange();
        console.log("Connection closed");
        var disonnected = peers.filter(x => !x.connection.open);
        disonnected.forEach(peer => peers.remove(peer));
    });
}

function handleDataEvent(data, connection) {
    console.log(`Data from ${connection}`)
    console.log(data);
    var peer = getPeer(connection.connectionId);
    if (data.event == "init") {
        peer.name = data.name;
        peers.onchange();
        pendingStateRequests.push(peer);
        ipcRenderer.send('request-maptool-state');

    } else if (data.event == "object-moved") {

        if (peer.partyAccess == null)
            return;

        data.data.forEach(ele => {

            var access = peer.partyAccess.find(x => x.element_id == ele.id || x.element_id == "all");
           
            if (access){
                notifyMaptool({ event: data.event, data: ele });
                var otherPeers = peers.filter(x=> x.connection.connectionId != peer.connection.connectionId);
                otherPeers.forEach(otherPeer => {
                    otherPeer.connection.send({ event: data.event, data: [ele] })
                });
            }
        })
    }
}

function notifyMaptool(data) {
    window.api.messageWindow("maptoolWindow", "client-event", data);
}

function getPeer(connectionId) {
    var peer = peers.find(x => x.connectionId == connectionId);
    if (!peer)
        throw "peer not found";
    return peer;
}

function sendMaptoolState(maptoolState) {
    dataAccess.getSettings(async (settings) => {
        while (pendingStateRequests.length > 0) {
            var peer = pendingStateRequests.pop();

            var mt = settings.maptool;


            var dataObject = {
                foreground: maptoolState.foreground.path ? await util.toBase64(maptoolState.foreground.path) : null,
                background: maptoolState.background.path ? await util.toBase64(maptoolState.background.path) : null,
                mapEdge: mt.map_edge_style ? await util.toBase64(mt.map_edge_style) : null,
                overlay: maptoolState.overlay.path ? await util.toBase64(maptoolState.overlay.path) : null,
            };
            peer.connection.send({ event: "constants", data: constants })
            peer.connection.send({ event: "foreground-translate", data: maptoolState.foreground.translate })
            sendBatched(peer.connection, "foreground", dataObject.foreground, { width: maptoolState.foreground.width, height: maptoolState.foreground.height, translate: maptoolState.foreground.translate });
            sendBatched(peer.connection, "map_edge", dataObject.mapEdge)
            sendBatched(peer.connection, "background", dataObject.background, { width: maptoolState.background.width, height: maptoolState.background.height });
            sendBatched(peer.connection, "overlay", dataObject.overlay, { width: maptoolState.overlay.width, height: maptoolState.overlay.height });
            // var distinctTokenImages = [... new Set(maptoolState.tokens.map(x => x.bgPhoto))];

            // for (var i = 0; i < distinctTokenImages.length; i++) {
            //     var path = distinctTokenImages[i];
            //     console.log(path)
            //     var filtered = maptoolState.tokens.filter(x => x.bgPhoto == path);
            //     var base64 = await util.toBase64(path);

            //     filtered.forEach(x => {
            //         var basename = pathModule.basename(x.bgPhoto);
            //         x.bgPhotoBase64 = base64;
            //         x.bgPhoto = null;
            //         x.tokenName = basename;
            //     });
            // }
            var tokenJSON = JSON.stringify(maptoolState.tokens);

            sendBatched(peer.connection, "tokens-set", tokenJSON);
            var effectJSON = JSON.stringify(maptoolState.effects)
            sendBatched(peer.connection, "effects-set", effectJSON);
            peer.connection.send({ event: "backgroundLoop", data: maptoolState.backgroundLoop })
            peer.connection.send({ event: "overlayLoop", data: maptoolState.overlayLoop })
            peer.connection.send({ event: "segments", data: maptoolState.segments })
            // tokens: tokens,

            // effects: getEffectsForExport()
        }
    });
}


const CHUNK_SIZE = 1000000;
function sendBatched(connection, key, msgString, metadata) {
    if (msgString == null) {
        return connection.send({ event: key, data: { base64: null, chunk: 1, chunks: 1 } });
    }
    var totalLength = msgString.length;
    var chunks = Math.ceil(totalLength / CHUNK_SIZE);

    for (var i = 0; i < chunks; i++) {
        var start = i * CHUNK_SIZE;
        connection.send({ event: key, data: { base64: msgString.substring(start, start + CHUNK_SIZE), chunk: i + 1, chunks: chunks, metadata: metadata } });
    }

}

function showError(err) {
    document.getElementById("error_message").innerHTML = err;
}

function clearError() {
    document.getElementById("error_message").innerHTML = "";
}

function hideLoading() {
    document.getElementById("loading").classList.add("hidden");;
}
function showLoading(text) {
    var loadingEle = document.getElementById("loading");
    document.getElementById("loading_text").innerHTML = text;
    loadingEle.classList.remove("hidden");
}


