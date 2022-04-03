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

    nameInput.oninput = (e) => {
        localStorage.setItem('name', nameInput.value);
        connectionParamsChanged(e);
    }
    hostIdInput.oninput = connectionParamsChanged;

    connectButton.onclick = () => connect();

    refreshPawns();
    window.onresize = function () {
        window.requestAnimationFrame(resizeAndDrawGrid);
        // updateHowlerListenerLocation();
    }

    setupGridLayer();

})

function connectionParamsChanged(e) {
    var nameInput = document.getElementById("user_name_input");
    var hostIdInput = document.getElementById("host_id_input");
    if (nameInput.value && hostIdInput.value)
        connectButton.classList.remove("hidden");
    else
        connectButton.classList.add("hidden");
}
function connect() {

    var hostId = document.getElementById("host_id_input").value;
    var name = document.getElementById("user_name_input").value;
    var peer = new Peer(connectionObj);
    peer.on('open', function (id) {

        console.log(id);
        hostConnection = peer.connect(hostId);

        hostConnection.on('open', () => {
            connectedStateChanged();
            send({ event: "init", name: name });
        })
        hostConnection.on('data', function (data) {
            console.log('Received', data);
            handleMessage(data);

        });

        hostConnection.on('error', () => connectedStateChanged())
        hostConnection.on('close', () => connectedStateChanged())


    });


    peer.on('error', (err) => {
        showError(err)
        connectedStateChanged();

    })
}

function showError(err) {
    document.getElementById("error_message").innerHTML = err;
}
function handleMessage(message) {
    console.log(message)
    if (message.data?.chunks) {
        if (!dataBuffer[message.event]) {
            dataBuffer[message.event] = message.data.base64;
        } else {
            dataBuffer[message.event] += message.data.base64;
        }
        //Message end
        if (message.data.chunk == message.data.chunks) {
            setState(message);
            dataBuffer[message.event] = null;
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

    switch (message.event) {
        case "initialized":
            map.removeAllPawns();
            break;
        case "players-changed":
            ///???
            break;
        case "map_edge":
            setMapEdge(toBase64Url(dataBuffer[message.event]));
            break;
        case "foreground":
            clientSetForeground(message)
            break;
        case "background":
            setMapBackgroundAsBase64(toBase64Url(dataBuffer[message.event]), message.data.metadata?.width || 0, message.data.metadata?.height || 0);
            break;
        case "tokens-set":
            map.removeAllPawns();
            importTokens(dataBuffer[message.event]);
            break;
        case "constants":
            constants = message.data;
            creaturePossibleSizes = constants.creaturePossibleSizes;
            break;
        case "overlayLoop":
            overlayLoop.loadSlideState(message.data);
            break;
        case "backgroundLoop":
            backgroundLoop.loadSlideState(message.data);
            break;
        case "pawn-removed":
            var removed = document.getElementById(message.data);
            if (removed)
                map.removePawn(removed)
            break;
        case "pawn-add":
            addPawn(message.data)
            break;
        case "foreground-size":
            resizeForeground(message.data.width);
            break;
        case "background-size":
            resizeBackground(message.data.width);
            break;
        case "overlay-size":
            resizeOverlay(message.data.width);
            break;
        case "segments":
            fovLighting.setSegments(message.data.segments);
            break;
        case "object-moved":
            moveObjects(message.data);
            break;
    }

}

function moveObjects(arr) {
    console.log("Set positions:")
    console.log(arr);
    arr.forEach(pawnInfo => {
        var pawn = document.getElementById(pawnInfo.id);
        var tanslatedPixels = map.pixelsFromGridCoords(pawnInfo.pos.x, pawnInfo.pos.y);

        map.moveObject(pawn, tanslatedPixels)
    })
}

function clientSetForeground(message) {
    setMapForegroundAsBase64(toBase64Url(dataBuffer[message.event]), message.data.metadata.width, message.data.metadata.height);

    if (message.data.metadata.translate) {
        var trsl = message.data.metadata.translate;
        foregroundCanvas.data_transform_x = trsl.x;
        foregroundCanvas.data_transform_y = trsl.y;
        foregroundCanvas.style.transform = `translate(${trsl.x}px, ${trsl.y}px)`
    }
}

function addPawn(pawn) {
    pawn.bgPhotoBase64 = toBase64Url(pawn.bgPhotoBase64);
    generatePawns([pawn], !pawn.player, map.pixelsFromGridCoords(pawn.pos.x, pawn.pos.y));
}

function importTokens(tokenStr) {
    var arr = JSON.parse(tokenStr);

    arr.forEach(pawn => {
        addPawn(pawn);

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


