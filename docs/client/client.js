var hostConnection;

var dataBuffer = {},
    initRequestSent = false,
    timeout;

const UNSUPPORTED_BROWSERS = ["iPhone", "iPad"];

if (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
    )
) {
    document.addEventListener("click", () => userGesture());
    document.addEventListener("touchstart", () => userGesture());
    STATIC_TOOLTIP = true;
}

var centerPawnFlag = false;

function userGesture() {
    try {
        document.body.scrollTo(0, 1);
        if (document.fullscreenEnabled)
            document.documentElement.requestFullscreen();
    } catch {}
}

function showWelcomeModal() {
    var done = localStorage.getItem("welcome-modal-shown");
    if (done) return;

    var modal = ClientModals.createModal("Welcome to Dungeoneer", () => {});
    var cont = Util.ele("div", "column");
    cont.appendChild(Util.ele("div", "die_d20", ""));
    cont.appendChild(
        Util.ele(
            "p",
            "p_large",
            "You can use this site to connect to a game hosted by someone with the Dungeoneer client. You will need a host ID and password provided by your game host. Please report any bugs you find by submitting an issue on <a href = 'https://github.com/Durtur/Dungeoneer/issues'>Github</a>."
        )
    );
    cont.appendChild(
        Util.ele(
            "p",
            "p_large warning_text",
            "Only Android mobile browsers are suppoted at the moment. If you are on iPhone or iPad switch the page to full screen, otherwise grid selection will be misaligned."
        )
    );

    var btn = Util.ele("button", "button_style green  center", "Start playing");
    btn.onclick = (e) => modal.modal.close();
    cont.appendChild(btn);
    modal.modal.appendChild(cont);
    document.body.appendChild(modal.parent);
    localStorage.setItem("welcome-modal-shown", "1");
}

document.addEventListener("DOMContentLoaded", () => {
    window.addEventListener("beforeunload", (event) => {
        if (hostConnection) {
            hostConnection.close();
        }
    });

    showWelcomeModal();

    var hostId = getUrlParam("hostID");
    if (!hostId) hostId = localStorage.getItem("hostId");
    const name = localStorage.getItem("name");
    var nameInput = document.getElementById("user_name_input");
    nameInput.value = name || "";
    var connectButton = document.getElementById("connect_button");
    var hostIdInput = document.getElementById("host_id_input");
    hostIdInput.value = hostId || "";
    if (nameInput.value && hostIdInput.value)
        connectButton.classList.remove("hidden");

    nameInput.oninput = (e) => {
        localStorage.setItem("name", nameInput.value);
        connectionParamsChanged(e);
    };
    hostIdInput.oninput = (e) => {
        localStorage.setItem("hostId", hostIdInput.value);
        connectionParamsChanged(e);
    };

    connectButton.onclick = () => connect();

    refreshPawns();
    window.onresize = function () {
        window.requestAnimationFrame(resizeAndDrawGrid);
    };
});

function connectionParamsChanged(e) {
    var nameInput = document.getElementById("user_name_input");
    var hostIdInput = document.getElementById("host_id_input");
    var connectButton = document.getElementById("connect_button");
    if (nameInput.value && hostIdInput.value)
        connectButton.classList.remove("hidden");
    else connectButton.classList.add("hidden");
}

function getPassword() {
    return document.getElementById("password_input").value;
}
function connect() {
    var connectButton = document.getElementById("connect_button");
    connectButton.classList.add("hidden");
    var hostId = document.getElementById("host_id_input").value;
    var name = document.getElementById("user_name_input").value;
    var peer = new Peer(PEER_CONNECTION_CONFIG);
    peer.on("open", function (id) {
        console.log(id);
        hostConnection = peer.connect(hostId, {
            metadata: { password: getPassword() },
        });
        timeout = new Timeout(hostConnection);
        hostConnection.on("open", () => {
            connectedStateChanged();
            initRequestSent = true;
            send({ event: "init", name: name });
        });
        hostConnection.on("data", function (data) {
            if (data.event == "ping") {
                return hostConnection.send({ event: "ack" });
            } else if (data.event == "ack") {
                return timeout.ack();
            }
            handleMessage(data);
        });

        hostConnection.on("error", () => connectedStateChanged());
        hostConnection.on("close", () => connectedStateChanged());
    });
    peer.on("disconnected", function () {
        connectedStateChanged();
    });

    peer.on("error", (err) => {
        showError(err);
        connectedStateChanged();
    });
}

function showError(err) {
    document.getElementById("error_message").innerHTML = err;
}
function handleMessage(message) {
    console.log(message);
    //Store foreground translate so effects and tokens are placed correctly.

    if (message.data?.chunks) {
        if (!dataBuffer[message.event]) {
            dataBuffer[message.event] = {
                buffer: [],
                length: message.data?.chunks,
            };
        }

        dataBuffer[message.event].buffer[message.data.chunk - 1] =
            message.data.base64;
        //Message end
        if (nothingEmpty(dataBuffer[message.event])) {
            setState(message);
            window.setTimeout(() => {
                dataBuffer[message.event] = null;
            }, 5000);
        }
    } else {
        setState(message);
    }
}

function nothingEmpty(databuffer) {
    var arr = databuffer.buffer;

    if (databuffer.buffer.length != databuffer.length) return false;

    for (var i = 0; i < arr.length; i++) {
        if (arr[i] === undefined) return false;
    }
    return true;
}

function toBase64Url(base64data, format) {
    if (base64data == null) return "none";
    if (!format) format = "webp";
    return `url(data:image/${format};base64,${base64data})`;
}

function getDataBuffer(event) {
    if (dataBuffer[event] == null) return null;
    return dataBuffer[event].buffer;
}

function setState(message) {
    switch (message.event) {
        case "initialized":
            map.removeAllPawns();
            map.removeAllEffects();
            break;
        case "round-timer":
            setRoundTimer(message.data);
            break;
        case "access-changed":
            tokenAccessChanged(message.data);
            break;
        case "map_edge":
            setMapEdge(
                toBase64Url(
                    getDataBuffer(message.event).reduce((a, b) => a + b),
                    message.data.metadata?.format
                )
            );
            break;
        case "foreground":
            setLoading(false);
            clientSetForeground(message);
            break;
        case "background":
            setMapBackgroundAsBase64(
                toBase64Url(
                    getDataBuffer(message.event)?.reduce((a, b) => a + b),
                    message.data.metadata?.format
                ),
                message.data.metadata?.width || 0,
                message.data.metadata?.height || 0
            );
            break;
        case "overlay":
            setMapOverlayAsBase64(
                toBase64Url(
                    getDataBuffer(message.event)?.reduce((a, b) => a + b),
                    message.data.metadata?.format
                ),
                message.data.metadata?.width || 0,
                message.data.metadata?.height || 0
            );
            break;
        case "tokens-set":
            map.removeAllPawns();
            if (getDataBuffer(message.event))
                importTokens(
                    getDataBuffer(message.event).reduce((a, b) => a + b)
                );
            else importTokens(message.data);
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
            if (removed) map.removePawn(removed);
            break;
        case "token-add":
            addPawn(message.data);
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
            importSegments(message.data.segments);
            break;
        case "object-moved":
            moveObjects(message.data);
            break;
        case "effects-set":
            if (getDataBuffer(message.event))
                setEffects(
                    getDataBuffer(message.event)?.reduce((a, b) => a + b)
                );
            else setEffects(message.data);
            break;
        case "effect-add":
            addEffect(message.data);
            break;
        case "effect-remove":
            var eff = effects.find((x) => x.id == message.data);
            if (eff) effectManager.removeEffect(eff);
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
            var token =
                pawns.players.find((x) => x[0].id == message.data.id) ||
                pawns.monsters.find((x) => x[0].id == message.data.id);

            if (!token || !token[0]) return;
            setPawnBackgroundFromPathArray(
                token[0],
                toBase64Url(message.data.base64),
                false
            );
            break;
        case "token-scale":
            var token =
                pawns.players.find((x) => x[0].id == message.data.id) ||
                pawns.monsters.find((x) => x[0].id == message.data.id);

            if (!token || !token[0]) return;
            map.setTokenScale(token[0], message.data.scale);
            break;
        case "token-size":
            var token =
                pawns.players.find((x) => x[0].id == message.data.id) ||
                pawns.monsters.find((x) => x[0].id == message.data.id);
            if (!token || !token[0]) return;
            enlargeReducePawn(token[0], message.data.direction);
            break;
        case "token-color":
            var token =
                pawns.players.find((x) => x[0].id == message.data.id) ||
                pawns.monsters.find((x) => x[0].id == message.data.id);
            if (!token || !token[0]) return;
            token[0].style.backgroundColor = message.data.color;
            break;
        case "token-rotate-set":
            var token =
                pawns.players.find((x) => x[0].id == message.data.id) ||
                pawns.monsters.find((x) => x[0].id == message.data.id);
            if (!token || !token[0]) return;

            setPawnRotate(token[0], message.data.deg);
            break;
        case "token-flying-height":
            var token =
                pawns.players.find((x) => x[0].id == message.data.id) ||
                pawns.monsters.find((x) => x[0].id == message.data.id);
            if (!token || !token[0]) return;

            setFlyingHeight(token[0], message.data.height);
            break;
        case "token-conditions":
            var token =
                pawns.players.find((x) => x[0].id == message.data.id) ||
                pawns.monsters.find((x) => x[0].id == message.data.id);
            if (!token || !token[0]) return;
            map.setTokenConditions(token[0], message.data.conditionList);

            break;
        case "condition-list":
            conditionList = message.data;
            conditionList.map(
                (x) => (x.background_image = toBase64Url(x.base64img))
            );
            break;
        case "effect-rotate":
            var ele = effects.find((x) => x.id == message.data.id);
            if (!ele) return;
            effectManager.rotate(ele, message.data.rotate);
            break;
        case "effect-resize":
            var ele = effects.find((x) => x.id == message.data.id);
            if (!ele) return;
            effectManager.resize(ele, message.data.height, message.data.width);
            break;
        case "initiative":
            map.updateInitiative(message.data);
            break;
        case "mob-tokens-set":
            setMobTokens(message.data);
            break;
        case "custom-sound-entry":
            var src = message.data.metadata.src;
            var encoding = message.data.metadata.encoding;
            soundManager.importSound({
                base64Source: getDataBuffer(message.event)?.reduce(
                    (a, b) => a + b
                ),
                encoding: encoding,
                name: src,
            });
            break;
    }
}

function setMobTokens(data) {
    var token =
        pawns.players.find((x) => x[0].id == data.id) ||
        pawns.monsters.find((x) => x[0].id == data.id);

    if (!token || !token[0]) return;

    var pawn = token[0];
    cssifyMobTokens(data.map);
    refreshMobBackgroundImages(pawn, data);
    resizePawns();
}

function cssifyMobTokens(tokenArray) {
    console.log(tokenArray);
    for (const [key, value] of Object.entries(tokenArray)) {
        tokenArray[key] = toBase64Url(value);
    }
    console.log(tokenArray);
}

function importSegments(segments) {
    if (!segments) segments = [];
    var arr = segments.map((seg) => {
        return {
            a: map.pixelsFromGridCoords(seg.a.x, seg.a.y),
            b: map.pixelsFromGridCoords(seg.b.x, seg.b.y),
        };
    });
    fovLighting.setSegments(arr);
    refreshFogOfWar();
}

function setRoundTimer(timerObj) {
    console.log("Set round timer", timerObj);
    if (!timerObj && roundTimer) {
        roundTimer.destroy();
        return;
    }
    if (!roundTimer) roundTimer = new Timer();
    roundTimer.setState(timerObj);
}

function tokenAccessChanged(access) {
    TOKEN_ACCESS = access;
    addPawnListeners();
    createPerspectiveDropdown();
    if (centerPawnFlag) centerCurrentViewer();
}

function moveObjects(arr) {
    console.log("Set positions:");
    console.log(arr);
    arr.forEach((pawnInfo) => {
        var pawn = document.getElementById(pawnInfo.id);
        var tanslatedPixels = map.pixelsFromGridCoords(
            pawnInfo.pos.x,
            pawnInfo.pos.y
        );
        console.log(pawn);
        map.moveObject(pawn, tanslatedPixels, false);
    });
    refreshFogOfWar();
}

function clientSetForeground(message) {
    setMapForegroundAsBase64(
        toBase64Url(
            getDataBuffer(message.event)?.reduce((a, b) => a + b),
            message.data.metadata?.format
        ),
        message.data?.metadata?.width,
        message.data?.metadata?.height
    );
    if (message.data?.metadata?.translate) {
        var trsl = message.data.metadata.translate;
        foregroundCanvas.data_transform_x = trsl.x;
        foregroundCanvas.data_transform_y = trsl.y;
        foregroundCanvas.style.transform = `translate(${trsl.x}px, ${trsl.y}px)`;
    }
}

function setEffects(effectStr) {
    var arr = typeof effectStr == "string" ? JSON.parse(effectStr) : effectStr;
    map.removeAllEffects();
    console.log("Set effects", effects);
    arr.forEach((effObj) => addEffect(effObj));
}
function addEffect(effObj) {
    effObj.bgPhotoBase64 = toBase64Url(effObj.bgPhotoBase64);
    var point = map.pixelsFromGridCoords(effObj.pos.x, effObj.pos.y);
    if (effObj.isLightEffect)
        return effectManager.addLightEffect(effObj, {
            clientX: point.x,
            clientY: point.y,
        });

    effectManager.addSfxEffect(effObj, { clientX: point.x, clientY: point.y });
}

async function addPawn(pawn) {
    pawn.bgPhotoBase64 = toBase64Url(pawn.bgPhotoBase64);
    pawn.onAdded = function (newPawn) {
        if (pawn.mobTokens) setMobTokens(pawn.mobTokens);
    };
    pawn.spawnPoint = map.pixelsFromGridCoords(pawn.pos.x, pawn.pos.y);
    if (!pawn.isPlayer) pawn.name = "???";
    await generatePawns([pawn], !pawn.isPlayer);

    onMonsterHealthChanged({
        dead: pawn.dead == "true",
        healthPercentage: pawn.health_percentage,
        index: pawn.index_in_main_window,
    });

    if (pawn.isPlayer) {
        if (centerPawnFlag) {
            centerCurrentViewer();
        }

        onPerspectiveChanged();
    }
}

function importTokens(tokenStr) {
    var arr = typeof tokenStr == "string" ? JSON.parse(tokenStr) : tokenStr;

    arr.forEach(async (pawn) => {
        await addPawn(pawn);
    });
    onPerspectiveChanged();
}

function setMapEdge(url) {
    console.log("Setting map edge");
    document.querySelector(".maptool_body").style.backgroundImage = url;
}

function connectedStateChanged() {
    var connectionStatusIndicator =
        document.getElementById("connection_status");
    var connectPanel = document.getElementById("connect_container");
    if (hostConnection != null && hostConnection.open) {
        connectionStatusIndicator.classList.add("connected");
        connectPanel.classList.add("hidden");
        if (!initRequestSent) setLoading(true);
    } else {
        connectionStatusIndicator.classList.remove("connected");
        connectPanel.classList.remove("hidden");
        var connectButton = document.getElementById("connect_button");
        connectButton.classList.remove("hidden");
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
        centerPawnFlag = true;
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
