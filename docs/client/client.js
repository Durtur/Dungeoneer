var hostConnection;

var dataBuffer = {};
var connectionObj =
{
    secure: true,
    host: 'dungeoneer-peer-server.herokuapp.com',
    port: 443
}


document.addEventListener("DOMContentLoaded", () => {

    const hostId = getUrlParam('hostID');
    const name = localStorage.getItem('name');
    var nameInput = document.getElementById("user_name_input");
    nameInput.value = name || "";
    var connectButton = document.getElementById("connect_button");
    var hostIdInput = document.getElementById("host_id_input");
    hostIdInput.value = hostId || "";
    if (nameInput.value && hostIdInput.value)
        connectButton.classList.remove("hidden");

    nameInput.oninput = () => {
        localStorage.setItem('name', nameInput.value);
        if (nameInput.value && hostIdInput.value)
            connectButton.classList.remove("hidden");
        else
            connectButton.classList.add("hidden");
    };

    connectButton.onclick = () => connect();

    refreshPawns();
    window.onresize = function () {
        window.requestAnimationFrame(resizeAndDrawGrid);
        // updateHowlerListenerLocation();
    }

    setupGridLayer();

})

function connect() {

    var hostId = document.getElementById("host_id_input").value;
    var name = document.getElementById("user_name_input").value;
    var peer = new Peer(connectionObj);
    peer.on('open', function (id) {

        console.log(id);
        hostConnection = peer.connect(hostId);

        hostConnection.on('open', () => {
            connectedStateChanged();
            send({ messageType: "init", name: name });
        })
        hostConnection.on('data', function (data) {
            console.log('Received', data);
            handleMessage(data);

        });

        hostConnection.on('error', () => connectedStateChanged())
        hostConnection.on('close', () => connectedStateChanged())


    });


    peer.on('error', (err) => {
        console.log(err)
        connectedStateChanged();

    })
}

function handleMessage(message) {
    console.log(message)
    if (message.data?.chunks) {
        if (!dataBuffer[message.messageType]) {
            dataBuffer[message.messageType] = message.data.base64;
        } else {
            dataBuffer[message.messageType] += message.data.base64;
        }
        //Message end
        if (message.data.chunk == message.data.chunks) {
            setState(message);
            dataBuffer[message.messageType] = null;
        }
    } else {
        setState(message);
    }

}

function toBase64Url(base64data) {
    if (base64data == null) return "none";
    return `url(data:image/png;base64,${base64data})`
}

function setState(message) {
    console.log("Set state", message)

    switch (message.messageType) {
        case "map_edge":
            setMapEdge(toBase64Url(dataBuffer[message.messageType]));
            break;
        case "foreground":
            setMapForegroundAsBase64(toBase64Url(dataBuffer[message.messageType]), message.data.metadata.width);
            break;
        case "tokens":
            importTokens(dataBuffer[message.messageType]);
            break;
        case "constants":
            constants = message.data;
            creaturePossibleSizes = constants.creaturePossibleSizes;
            break;
    }

    // setForeground(state.foreground ? `url(data:image/png;base64,${state.foreground})` : "none");
    // setBackground(state.currentBackground ? `url(data:image/png;base64,${state.currentBackground})` : "none");
    // foreground: mt.currentMap ? await util.toBase64(mt.currentMap) : null,
    // background: mt.currentBackground ? await util.toBase64(mt.currentBackground) : null,
    // mapEdge: mt.map_edge_style ? await util.toBase64(mt.map_edge_style) : null
}

function importTokens(tokenStr) {
    var arr = JSON.parse(tokenStr);

    arr.forEach(pawn => {
        pawn.bgPhotoBase64 = toBase64Url(pawn.bgPhotoBase64);
        generatePawns([pawn], !pawn.player, map.pixelsFromGridCoords(pawn.pos.x, pawn.pos.y));
    })

}

function setMapEdge(url) {
    console.log("Setting map edge");
    document.querySelector(".maptool_body").style.backgroundImage = url;
}

function connectedStateChanged() {
    var connectionStatusIndicator = document.getElementById("connection_status");
    var connectPanel = document.getElementById("connect_container");
    if (hostConnection != null && hostConnection.open) {
        connectionStatusIndicator.classList.add("connected");
        connectPanel.classList.add("hidden");
    } else {
        connectionStatusIndicator.classList.remove("connected");
        connectPanel.classList.remove("hidden");
    }
}

function getUrlParam(paramName) {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    return urlParams.get(paramName);
}

function send(data) {
    console.log(`Sending ${data}`);
    hostConnection.send(data);
}


