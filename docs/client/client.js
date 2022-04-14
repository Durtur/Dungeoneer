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
    //Store foreground translate so effects and tokens are placed correctly. 

    if (message.data?.chunks) {
        if (!dataBuffer[message.event]) {
            dataBuffer[message.event] = [];
            dataBuffer[message.event].length = message.data?.chunks - 1;


        }
        dataBuffer[message.event][message.data.chunk - 1] = message.data.base64;
        //Message end
        if (!dataBuffer[message.event].find(x => x == null)) {
            setState(message);
            window.setTimeout(() => {
                dataBuffer[message.event] = null;
            }, 1000)

        }
    } else {
        setState(message);
    }

}

function toBase64Url(base64data) {
    if (base64data == null) return "none";
    return `url(data:image/webp;base64,${base64data})`
}

function setState(message) {
    console.log("Set state", message)

    switch (message.event) {
        case "initialized":
            map.removeAllPawns();
            map.removeAllEffects();
            break;
        case "players-changed":
            ///???
            break;
        case "access-changed":
            tokenAccessChanged(message.data);
            break;
        case "map_edge":
            setMapEdge(toBase64Url(dataBuffer[message.event].reduce((a, b) => a + b)));
            break;
        case "foreground":
            setLoading(false);
            clientSetForeground(message)
            break;
        case "background":
            setMapBackgroundAsBase64(toBase64Url(dataBuffer[message.event].reduce((a, b) => a + b)), message.data.metadata?.width || 0, message.data.metadata?.height || 0);
            break;
        case "tokens-set":
            map.removeAllPawns();
            if (dataBuffer[message.event])
                importTokens(dataBuffer[message.event].reduce((a, b) => a + b));
            else importTokens(message.data)
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
        case "token-add":
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
            importSegments(message.data.segments)
            break;
        case "object-moved":
            moveObjects(message.data);
            break;
        case "effects-set":
            if (dataBuffer[message.event])
                setEffects(dataBuffer[message.event]?.reduce((a, b) => a + b));
            else
                setEffects(message.data)
            break;
        case "effect-add":
            addEffect(message.data);
            break;
        case "effect-remove":
            var eff = effects.find(x => x.id == message.data);
            if (eff)
                effectManager.removeEffect(eff);
            break;
        case "foreground-translate":
            moveForeground(message.data.x, message.data.y);
            break;
        case "monster-health-changed":
            onMonsterHealthChanged(message.data);
            break;
        case "fog-set":
            fovLighting.setFogStyle(message.data);
            fovLighting.setPerspective();
            refreshFogOfWar();
            break;
        case "token-image":
            var token = pawns.players.find(x => x[0].id == message.data.id) || loadedMonsters.find(x => x[0].id == message.data.id);

            if (!token || !token[0])
                return;
            setPawnBackgroundFromPathArray(token[0], toBase64Url(message.data.base64), false)
            break;
        case "token-size":
            var token = pawns.players.find(x => x[0].id == message.data.id) || loadedMonsters.find(x => x[0].id == message.data.id);
            if (!token || !token[0])
                return;
            enlargeReducePawn(token[0], message.data.direction);
            break;
        case "token-color":
            var token = pawns.players.find(x => x[0].id == message.data.id) || loadedMonsters.find(x => x[0].id == message.data.id);
            if (!token || !token[0])
                return;
            token[0].style.backgroundColor = message.data.color;
            break;
        case "token-conditions":
            var token = pawns.players.find(x => x[0].id == message.data.id) || loadedMonsters.find(x => x[0].id == message.data.id);
            if (!token || !token[0])
                return;
            map.setTokenConditions(token[0], message.data.conditionList);

            break;
        case "condition-list":
            conditionList = message.data;
            conditionList.map(x => x.background_image = toBase64Url(x.base64img));
            break;
        case "effect-rotate":
            var ele = effects.find(x => x.id == message.data.id);
            if (!ele)
                return;
            effectManager.rotate(ele, message.data.rotate)
            break;
        case "effect-resize":
            var ele = effects.find(x => x.id == message.data.id);
            if (!ele)
                return;
            effectManager.resize(ele, message.data.height, message.data.width);
            break;


    }

}

function importSegments(segments) {
    var arr = segments.map(seg => {
        return {
            a: map.pixelsFromGridCoords(seg.a.x, seg.a.y),
            b: map.pixelsFromGridCoords(seg.b.x, seg.b.y)
        }
    });
    fovLighting.setSegments(arr);
    refreshFogOfWar();

}

function tokenAccessChanged(access) {

    TOKEN_ACCESS = access;
    addPawnListeners();
    createPerspectiveDropdown();
}

function moveObjects(arr) {
    console.log("Set positions:")
    console.log(arr);
    arr.forEach(pawnInfo => {
        var pawn = document.getElementById(pawnInfo.id);
        var tanslatedPixels = map.pixelsFromGridCoords(pawnInfo.pos.x, pawnInfo.pos.y);
        console.log(pawn)
        map.moveObject(pawn, tanslatedPixels, false)
    });
    refreshFogOfWar();
}

function clientSetForeground(message) {
    setMapForegroundAsBase64(toBase64Url(dataBuffer[message.event].reduce((a, b) => a + b)), message.data.metadata.width, message.data.metadata.height);
    if (message.data.metadata.translate) {
        var trsl = message.data.metadata.translate;
        foregroundCanvas.data_transform_x = trsl.x;
        foregroundCanvas.data_transform_y = trsl.y;
        foregroundCanvas.style.transform = `translate(${trsl.x}px, ${trsl.y}px)`
    }
}

function setEffects(effectStr) {
    var arr = (typeof effectStr == "string") ? JSON.parse(effectStr) : effectStr;
    map.removeAllEffects();
    arr.forEach(effObj => addEffect(effObj));
}
function addEffect(effObj) {
    effObj.bgPhotoBase64 = toBase64Url(effObj.bgPhotoBase64);
    var point = map.pixelsFromGridCoords(effObj.pos.x, effObj.pos.y)
    if (effObj.isLightEffect)
        return effectManager.addLightEffect(effObj, { clientX: point.x, clientY: point.y });

    effectManager.addSfxEffect(effObj, { clientX: point.x, clientY: point.y })

}

function addPawn(pawn) {
    pawn.bgPhotoBase64 = toBase64Url(pawn.bgPhotoBase64);
    if (!pawn.isPlayer) pawn.name = "???";
    generatePawns([pawn], !pawn.isPlayer, map.pixelsFromGridCoords(pawn.pos.x, pawn.pos.y));
    if (pawn.isPlayer)
        onPerspectiveChanged();
}

function importTokens(tokenStr) {
    var arr = (typeof tokenStr == "string") ? JSON.parse(tokenStr) : tokenStr;

    arr.forEach(pawn => {
        addPawn(pawn);
        onMonsterHealthChanged({
            dead: pawn.dead == "true",
            healthPercentage: pawn.health_percentage,
            index: pawn.index_in_main_window
        });

    });
    onPerspectiveChanged();

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
        setLoading(true);
    } else {
        connectionStatusIndicator.classList.remove("connected");
        connectPanel.classList.remove("hidden");
        setLoading(false);
    }
}

function setLoading(loading) {
    if (loading) {
        document.getElementById("loading").classList.remove("hidden");
        document.getElementById("map_main").classList.add("hidden");
    } else {
        document.getElementById("loading").classList.add("hidden");
        document.getElementById("map_main").classList.remove("hidden");
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


function toggleToolbar() {

    var bar = document.querySelector(".toolbar");
    if (bar.classList.contains("toolbar_collapsed")) {
        bar.classList.remove("toolbar_collapsed");
    } else {
        bar.classList.add("toolbar_collapsed");
    }



}

