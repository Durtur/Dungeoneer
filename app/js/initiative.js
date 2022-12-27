const Modals = require("./modals");

var initiative = (function () {
    var roundTimer;
    var order;
    var currentNode;
    var monsterColor = "rgb(197, 0, 0)",
        playerColor = "rgb(101, 117, 197)",
        defaultPlayerColor = "#000000";
    var roundCounter;
    var isMainWindow = false;
    function setAsMain() {
        isMainWindow = true;
    }

    function loadEventHandlers() {
        [...document.querySelectorAll(".initiative_explanation_text_node")].forEach(
            (ele) =>
                (ele.onfocus = function (e) {
                    e.target.select();
                })
        );

        [...document.querySelectorAll(".initiativeNode")].forEach(
            (ele) =>
                (ele.onmousedown = function (e) {
                    var tmp = e.target;
                    while (tmp.parentNode) {
                        if (tmp.parentNode.classList.contains("initiativeNode")) {
                            currentNode = tmp.parentNode;
                            break;
                        }
                        tmp = tmp.parentNode;
                    }

                    if (e.button == 2) {
                        var popupWindow = document.getElementById("initiative_control_bar");
                        popupWindow.style.left = e.clientX + "px";
                        popupWindow.style.top = e.clientY + "px";
                        popupWindow.classList.remove("hidden");
                        document.addEventListener("click", hidePopupOnClick);
                        function hidePopupOnClick(e) {
                            popupWindow.classList.add("hidden");
                            document.removeEventListener("click", hidePopupOnClick);
                        }
                    }
                })
        );
    }

    function editCurrentNode() {
        var nodeName = currentNode.getElementsByClassName("initiative_name_node")[0].innerHTML;

        var i = 0;
        for (i = 0; i < order.length; i++) {
            if (order[i].name == nodeName) break;
        }
        Modals.prompt(`${nodeName} - new score`, "Score: ", (result) => {
            if (!result) return false;
            order[i].roll = parseInt(result);
            sortAndDisplay();
        });
    }
    function removeCurrentNode() {
        var nodes = [...document.querySelectorAll("#initBar .initiativeNode")];
        if (nodes.length > 1) {
            var nameToRemove = currentNode.getElementsByClassName("initiative_name_node")[0].innerHTML;
     
            order = order.filter((x) => x.name != nameToRemove);
            sortAndDisplay();
            nextRound(-1);
        } else {
            firstNodeAsStart(nodes[0]);
        }
    }

    function firstNodeAsStart(firstNode) {
        if (isMainWindow) {
            (firstNode.querySelector(".initiative_name_node") || {}).innerHTML = "Roll\n initiative";
            firstNode.onclick = initiative.roll;
            firstNode.onmousedown = null;
            firstNode.classList.remove("initiative_node_active");
            firstNode.classList.add("init_not_started");
            publishEvent({ empty: true });
        }

        (firstNode.querySelector(".init_value_node") || {}).innerHTML = "";
        (firstNode.querySelector(".initiative_explanation_text_node") || {}).innerHTML = "";

        ["initiative_node_active", "player_node", "monster_node"].forEach((className) => firstNode.classList.remove(className));
    }

    function roll(evt) {
        order = [];
        roundCounter = [1, 0];
        if (settings.autoInitiative) {
            autoRollPlayers();
            rollForMonsters(() => sortAndDisplay());
            return;
        }

        rollForMonsters(function (noMonsters) {
            var inputs = partyArray.map((p) => {
                return {
                    required: true,
                    label: p.character_name,
                    id: p.id,
                };
            });
            if (noMonsters)
                inputs.push({
                    required: false,
                    label: "Monsters",
                    id: "monster_init",
                });
            Modals.multiInputPrompt("Initiative scores", inputs, (resultAr) => {
                if (!resultAr) return;

                resultAr
                    .filter((x) => x.value != "" && x.value != null)
                    .map((res) => {
                        var pc = partyArray.find((x) => x.id == res.id);
                        return {
                            name: pc?.character_name || "Monsters",
                            roll: parseInt(res.value || 0),
                            dex: pc?.dexterity || 0,
                            isPlayer: pc != null,
                            color: pc?.color || monsterColor,
                        };
                    })
                    .forEach((x) => order.push(x));
                sortAndDisplay();
            });
        });

        function autoRollPlayers() {
            for (var i = 0; i < partyArray.length; i++) {
                order.push({
                    name: partyArray[i].character_name,
                    roll: d(20) + parseInt(partyArray[i].dexterity),
                    dex: parseInt(partyArray[i].dexterity),
                    isPlayer: true,
                    color: partyArray[i].color == defaultPlayerColor ? playerColor : partyArray[i].color,
                });
            }
        }
        function rollForMonsters(callback) {
            combatLoader.getLoadedMonsters((monsters) => {
                if (monsters.length == 0) {
                    order.push({
                        name: "Monsters",
                        roll: d(20),
                        dex: 0,
                        isPlayer: false,
                    });
                } else {
                    for (var i = 0; i < monsters.length; i++) {
                        var init = monsters[i].initiative || Util.getAbilityScoreModifier(monsters[i].dexterity);
                        init = parseInt(init);
                        order.push({
                            name: monsters[i].name,
                            roll: d(20) + init,
                            dex: init,
                            isPlayer: false,
                        });
                    }
                }

                if (callback) callback();
            });
        }
        return false;
    }

    function emptyInitiative() {
        var bar = document.getElementById("initBar");
        var nodes = [...document.querySelectorAll("#initBar .initiativeNode")];
        while (nodes.length > 1) {
            bar.removeChild(nodes.pop());
        }

        var node = nodes[0];

        firstNodeAsStart(node);
        if (bar) bar.classList.remove("initiative_cover_image");

        if (roundTimer) {
            roundTimer.destroy();
        }
    }
    function hide() {
        emptyInitiative();
        document.getElementById("round_counter_container").classList.add("hidden");
        document.getElementById("initiative_control_bar").classList.add("hidden");
        document.querySelector(".roundcounter__value").innerHTML = "1";
    }
    function sort() {
        order.sort(function (a, b) {
            if (a.roll === b.roll) {
                return b.dex - a.dex;
            } else {
                return b.roll - a.roll;
            }
        });
    }
    function sortAndDisplay() {
        document.querySelector("#initiative_popup_window")?.classList.add("hidden");

        //Sort the array so highest initiative is first.
        sort();
        emptyInitiative();
        var initNodes = [...document.querySelectorAll(".initiativeNode")];
        initNodes.forEach((x) => {
            x.classList.remove("init_not_started");
            x.onclick = null;
        });
        //Create buttons in initiative elements.
        var bar = document.getElementById("initBar");
        for (var j = 0; j < order.length; j++) {
            var newNode = j > 0 ? initNodes[0].cloneNode(true) : initNodes[0];
            (newNode.querySelector(".init_value_node") || {}).innerHTML = order[j].roll;
            newNode.querySelector(".initiative_name_node").innerHTML = order[j].name;
            (newNode.querySelector(".initiative_explanation_text_node") || {}).value = "Write note";
            bar.appendChild(newNode);

            if (order[j].isPlayer) {
                newNode.classList.add("player_node");
                newNode.classList.remove("monster_node");
            } else {
                newNode.classList.add("monster_node");
                newNode.classList.remove("player_node");
            }
            newNode.style.backgroundColor = getColor(order[j]);
        }
        initiative.loadEventHandlers();
        if (bar && bar.classList.contains("initative_has_cover_image")) bar.classList.add("initiative_cover_image");
        if (isMainWindow) publishEvent({ order: order });
        //Loads the roundcounter.
        if (settings.countRounds) {
            var roundCounterCont = document.getElementById("round_counter_container");
            roundCounterCont.classList.remove("hidden");

            roundCounterCont.querySelector(".roundcounter__value").innerHTML = roundCounter[0];
            document.querySelector("#roundright").onclick = (e) => nextRound(1);
            document.querySelector("#roundleft").onclick = (e) => nextRound(-1);
            nextRound(1);
        } else {
            initNodes = [...document.querySelectorAll(".initiativeNode")];
            initNodes.forEach((x) => {
                x.classList.add("initiative_node_inactive");
            });
        }
    }

    function getColor(entry) {
        if (entry.color) return Util.hexToHSL(entry.color, 40);
        if (entry.isPlayer) return playerColor;
        return monsterColor;
    }

    function getNextRoundCounterValue() {
        var initNodes = [...document.querySelectorAll(".initiativeNode")];
        var max = initNodes.length;
        if (roundCounter[1] >= max) {
            if (roundCounter[1] >= max) {
                return 1;
            } else if (roundCounter[1] <= 1 && roundCounter[0] != 1) {
                return max;
            }
        }
        return roundCounter[1] + 1;
    }

    /**
     * Moves the current active node in Initiative nodes, sign
     * for whos turn it is.
     * @param {*Direction; back in a round or forward} sign
     */
    function nextRound(sign) {
        if (!roundCounter) return;

        if (roundCounter[0] == 1 && roundCounter[1] == 1 && sign < 0) return false;

        var initNodes = [...document.querySelectorAll(".initiativeNode")];
        var max = initNodes.length;
        if ((roundCounter[1] >= max && sign > 0) || (roundCounter[1] <= 1 && sign < 0)) {
            if (roundCounter[1] >= max) {
                roundCounter[1] = 1;
            } else if (roundCounter[1] <= 1 && roundCounter[0] != 1) {
                roundCounter[1] = max;
            }
            roundCounter[0] += 1 * sign;
            document.querySelector(".roundcounter__value").innerHTML = roundCounter[0];
        } else {
            roundCounter[1] += 1 * sign;
        }
        initNodes.forEach((node) => {
            node.classList.remove("initiative_node_active");
            node.classList.add("initiative_node_inactive");
        });
        var currentNode = document.querySelector(".initiativeNode:nth-child(" + roundCounter[1] + ")");
        if (currentNode) {
            currentNode.classList.add("initiative_node_active");
            currentNode.classList.remove("initiative_node_inactive");

            if (currentNode.classList.contains("initiative_node_action_readied")) {
                currentNode.classList.remove("initiative_node_action_readied");
            }

            var current = order[roundCounter[1] - 1];
            if (current && !current.isPlayer && frameHistoryButtons)
                //is player
                frameHistoryButtons.clickButtonNamed(current.name);
        }
        if (isMainWindow) {
            publishEvent({ round_increment: roundCounter, order: order });
            notifyMapToolNextPlayer();
        }
        return current;
    }

    function setRoundCounter(counter) {
        roundCounter = counter;
        nextRound(0);
    }

    function notifyMapToolNextPlayer() {
        if (settings.enable.mapTool) {
            var name = document.querySelector(".initiative_node_active>.initiative_name_node").innerHTML;
            var pc = partyArray.find((x) => x.name == name);
            if (!pc) {
                window.api.messageWindow("maptoolWindow", "next-player-round", { player: null, darkvision: false });
                return;
            }
            window.api.messageWindow("maptoolWindow", "next-player-round", { player: name, darkvision: parseInt(pc.darkvision) > 0 });
        }
    }

    function getOrder() {
        return order;
    }

    function add() {
        var inputs = [
            {
                label: "Combatant name",
                required: true,
                id: "name",
            },
            {
                label: "Initiative score (incl dex)",
                required: true,
                id: "init",
            },
        ];
        Modals.multiInputPrompt("Add to initiative", inputs, (resultArr) => {
            //Break if user cancels
            if (resultArr == null) return false;
            console.log(resultArr);
            order.push({
                name: resultArr.find((x) => x.id == "name").value,
                roll: parseInt(resultArr.find((x) => x.id == "init").value),
                dex: 0,
                isPlayer: false,
            });
            sortAndDisplay();
            nextRound(0);
        });
    }

    function setOrder(orderArr) {
        order = orderArr;
        sortAndDisplay();
        nextRound(0);
    }

    function getState() {
        return {
            order: order,
        };
    }

    function setReadyAction() {
        if (currentNode.classList.contains("initiative_node_action_readied")) {
            currentNode.classList.remove("initiative_node_action_readied");
        } else {
            currentNode.classList.add("initiative_node_action_readied");
        }
    }

    var callBackArr = [];
    function addEventListener(callback) {
        callBackArr.push(callback);
    }
    function publishEvent(arg) {
        callBackArr.forEach((callback) => {
            callback(arg);
        });
    }

    function currentActor() {
        var current = document.querySelector(".initiativeNode:nth-child(" + roundCounter[1] + ") .initiative_name_node")?.innerHTML;
        if (current == null) {
            return null;
        }
        var nextIndex = getNextRoundCounterValue();
        var next = document.querySelector(`.initiativeNode:nth-child(${nextIndex}) .initiative_name_node`).innerHTML;
        var currentColor = getColor(order[roundCounter[1] - 1]);

        return { current: { name: current, color: currentColor }, next: next };
    }

    return {
        addEventListener: addEventListener,
        setAsMain: setAsMain,
        loadEventHandlers: loadEventHandlers,
        removeCurrentNode: removeCurrentNode,
        roll: roll,
        editCurrentNode: editCurrentNode,
        setReadyAction: setReadyAction,
        nextRound: nextRound,
        add: add,
        getOrder: getOrder,
        setOrder: setOrder,
        hide: hide,
        getState: getState,
        empty: emptyInitiative,
        setRoundCounter: setRoundCounter,
        currentActor: currentActor,
    };
})();

module.exports = initiative;
