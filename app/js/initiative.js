
const prompt = require('electron-prompt');


module.exports = function () {
    var loadedMonsterInfo = []; //Distinct monster names and initiative modifier loaded in combat table
    var order;
    var currentNode;
    var monsterColor = "rgb(197, 0, 0)", playerColor = "rgb(101, 117, 197)", defaultPlayerColor = "#000000";

    var roundcounter__handlers__added = false;
    var isMainWindow = false;
    function setAsMain() {
        isMainWindow = true;
    }

    function finishRoll() {
        var allRows = document.querySelectorAll("#initiative_popup_window_inner>.row");
        for (var i = 0; i < allRows.length; i++) {
            var charName = allRows[i].getElementsByTagName("label")[0].innerHTML;
            var charDex = parseInt(allRows[i].getAttribute("data-dex-mod"));
            var color = allRows[i].getAttribute("data-color");
            if (isNaN(charDex)) charDex = 0;
            var initRoll = allRows[i].getElementsByTagName("input")[0].value;
            order.push({
                name: charName,
                roll: parseInt(initRoll != "" ? initRoll : "0"),
                dex: charDex,
                isPlayer: true,
                color: color == defaultPlayerColor ? playerColor : color

            });
        }

        sortAndDisplay();
    }
    function loadEventHandlers() {
        $(".initiative_explanation_text_node").on("focus", function (e) {
            e.target.select();
        })
        $('.initiativeNode').off("mousedown");
        //Click event for initiative nodes; removes them on click.
        $('.initiativeNode').on('mousedown', function (e) {
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
        });
    }

    function editCurrentNode() {
        var nodeName = currentNode.getElementsByClassName("initiative_name_node")[0].innerHTML;

        var i = 0;
        for (i = 0; i < order.length; i++) {
            if (order[i].name == nodeName) break;
        }

        prompt({
            title: 'New initiative score',
            label: 'Initiative score for ' + nodeName + ':',
            icon: "./app/css/img/icon.png",
            customStylesheet: "./app/css/prompt.css",
            inputAttrs: { // attrs to be set if using 'input'
                type: 'number'
            }

        })
            .then((value) => {
                //Break if user cancels
                if (value == null) return false;
                order[i].roll = parseInt(value);
                sortAndDisplay();
            });


    }
    function removeCurrentNode() {

        if ($("#initBar .initiativeNode").length > 1) {
            var nameToRemove = currentNode.getElementsByClassName("initiative_name_node")[0].innerHTML;
            console.log(`Remove node ${nameToRemove}`)
            order = order.filter(x => x.name != nameToRemove);
            console.log(order);
            sortAndDisplay();
            initiative.nextRound(-1);

        } else {
            $(".initiativeNode:nth-child(1)>.initiative_name_node").html("Roll \n initiative");
            $('.initiativeNode').on("click", initiative.roll);
            $('.initiativeNode').off("mousedown");
            $(".initiativeNode").removeClass("initiative_node_active");
            $('.initiativeNode').addClass("init_not_started")
        }
    }
    function cancelRoll() {
        $("#initiative_popup_window").fadeOut(350);
    }
    function refreshInputFields() {
        var initiPopupInner = document.getElementById("initiative_popup_window_inner");

        while (initiPopupInner.childNodes.length > 0) {
            initiPopupInner.removeChild(initiPopupInner.firstChild);
        }
        partyArray.forEach(partyMember => {

            initiPopupInner.appendChild(createInputField(partyMember.character_name, partyMember.dexterity, partyMember.color));
        })
    }
    function createInputField(name, dexMod, color) {
        var newRow = document.createElement("div");
        newRow.classList.add("row");
        var lbl = document.createElement("label");
        lbl.innerHTML = name;
        newRow.appendChild(lbl);
        var inp = document.createElement("input");
        inp.setAttribute("type", "number");
        inp.setAttribute("placeholder", "Initiative score")
        newRow.classList.add("initiative_input_row");
        newRow.setAttribute("data-dex-mod", dexMod ? dexMod : "0");

        newRow.setAttribute("data-color", color);
        newRow.appendChild(inp);
        return newRow;
    }
    function roll() {
        order = [];
        if (settings.countRounds)
            roundCounter = [1, 0];
        if (settings.autoInitiative) {
            autoRollPlayers();
            rollForMonsters();
            sortAndDisplay();
        } else {
            rollForMonsters(function (noMonsters) {

                if (noMonsters) {
                    if (document.getElementsByClassName("initiative_input_row").length == partyArray.length)
                        document.getElementById("initiative_popup_window_inner").appendChild(createInputField("Monsters"));
                } else {
                    refreshInputFields();
                }
                $("#initiative_popup_window").fadeIn(350);
                $(".initiative_input_row:first-child>input")[0].focus();
            })
        }



        function autoRollPlayers() {

            for (var i = 0; i < partyArray.length; i++) {
                order.push(
                    {
                        name: partyArray[i].character_name,
                        roll: (d(20) + parseInt(partyArray[i].dexterity)),
                        dex: parseInt(partyArray[i].dexterity),
                        isPlayer: true,
                        color: partyArray[i].color == defaultPlayerColor ? playerColor : partyArray[i].color
                    });
            }
        }
        function rollForMonsters(callback) {
            if (loadedMonsterInfo.length == 0) {
                order.push({
                    name: "Monsters",
                    roll: d(20),
                    dex: 0,
                    isPlayer: false,

                });
            } else {
                for (var i = 0; i < loadedMonsterInfo.length; i++) {
                    order.push(
                        {
                            name: loadedMonsterInfo[i][0],
                            roll: d(20) + parseInt(loadedMonsterInfo[i][1]),
                            dex: parseInt(loadedMonsterInfo[i][1]),
                            isPlayer: false
                        });
                }
            }

            if (callback) callback();
        }
        return false;
    }

    function emptyInitiative() {
        console.log("Clear initiative")
        $('.initiativeNode:not(:first-child)').remove();
        $(".initiativeNode:nth-child(1)>.init_value_node").html("");
        $(".initiativeNode:nth-child(1)>.initiative_name_node").html("Roll\n initiative");
        $(".initiativeNode:nth-child(1)>.initiative_explanation_text_node").val("");

        $(".initiativeNode").removeClass("initiative_node_active");
        $(".initiativeNode").removeClass("player_node");
        $(".initiativeNode").removeClass("monster_node");
        $('.initiativeNode').addClass("init_not_started");
        if (isMainWindow) {
            $('.initiativeNode').off("mousedown");
            $('.initiativeNode').off("click");
            $('.initiativeNode').on("click", initiative.roll);
            publishEvent({ empty: true });
        }

    }
    function hide() {
        emptyInitiative();
        $("#round_counter_container").addClass("hidden");
        $("#initiative_control_bar").addClass("hidden");
        $(".roundcounter__value").html("1");

    }
    function sortAndDisplay() {
        $("#initiative_popup_window").fadeOut(350);

        //Sort the array so highest initiative is first.
        order.sort(function (a, b) {
            if (a.roll === b.roll) {
                return b.dex - a.dex;
            } else {
                return b.roll - a.roll;
            }
        });

        emptyInitiative();
        $('.initiativeNode').removeClass("init_not_started")
        $('.initiativeNode').off("click");

        //Create buttons in initiative elements.

        for (var j = 0; j < order.length; j++) {

            if (j > 0) {
                $(".initiativeNode:first-of-type").clone().appendTo(".initiative");
            }
            $(".initiativeNode:nth-child(" + (j + 1) + ")>.init_value_node").html(order[j].roll);
            $(".initiativeNode:nth-child(" + (j + 1) + ")>.initiative_name_node").html(order[j].name);
            $(".initiativeNode:nth-child(" + (j + 1) + ")>.initiative_explanation_text_node").val("Write note");

            if (order[j].isPlayer) {
                $(".initiativeNode:nth-child(" + (j + 1) + ")").addClass("player_node");
                $(".initiativeNode:nth-child(" + (j + 1) + ")").removeClass("monster_node");
            } else {
                $(".initiativeNode:nth-child(" + (j + 1) + ")").addClass("monster_node");
                $(".initiativeNode:nth-child(" + (j + 1) + ")").removeClass("player_node");
            }
            $(".initiativeNode:nth-child(" + (j + 1) + ")").css("background-color", getColor(order[j]));


        }
        initiative.loadEventHandlers();
        if (isMainWindow)
            publishEvent({ order: order });
        //Loads the roundcounter. 
        if (settings.countRounds) {

            $("#round_counter_container").removeClass("hidden");

            $(".roundcounter__value").html(roundCounter[0]);
            if (!roundcounter__handlers__added) {
                $("#roundright").on("click", function () { nextRound(1) });
                $("#roundleft").on("click", function () { nextRound(-1) });
                roundcounter__handlers__added = true;
            }

            nextRound(1);
        }

        function getColor(entry) {
            if (entry.color) return Util.hexToHSL(entry.color, 40);
            if (entry.isPlayer) return playerColor;
            return monsterColor;
        }
    }

    /**
     * Moves the current active node in Initiative nodes, sign 
     * for whos turn it is. 
     * @param {*Direction; back in a round or forward} sign 
     */
    function nextRound(sign) {
        console.log(`Next round ${sign}`)
        if (roundCounter[0] == 1 && roundCounter[1] == 1 && sign < 0) return false;
        var max = $("#initBar").children().length;
        if (roundCounter[1] >= max && sign > 0 || roundCounter[1] <= 1 && sign < 0) {
            if (roundCounter[1] >= max) {
                roundCounter[1] = 1;
            } else if (roundCounter[1] <= 1 && roundCounter[0] != 1) {
                roundCounter[1] = max;
            }
            roundCounter[0] += 1 * sign;
            $(".roundcounter__value").html(roundCounter[0]);
        } else {
            roundCounter[1] += 1 * sign;

        }
        $(".initiativeNode").removeClass("initiative_node_active");
        $(".initiativeNode").addClass("initiative_node_inactive");
        $(".initiativeNode:nth-child(" + roundCounter[1] + ")").removeClass("initiative_node_inactive");

        var current = order[roundCounter[1] - 1];
        if (current && !current.isPlayer && frameHistoryButtons) //is player
            frameHistoryButtons.clickButtonNamed(current.name);

        $(".initiativeNode:nth-child(" + roundCounter[1] + ")").addClass("initiative_node_active");
        if ($(".initiativeNode:nth-child(" + roundCounter[1] + ")").hasClass("initiative_node_action_readied")) {
            $(".initiativeNode:nth-child(" + roundCounter[1] + ")").removeClass("initiative_node_action_readied");
        }
        if (isMainWindow) {
            publishEvent({ round_increment: roundCounter });
            notifyMapToolNextPlayer();
        }
    }

    function setRoundCounter(counter){
        roundCounter = counter;
        nextRound(0);
    }

    function notifyMapToolNextPlayer() {
        if (settings.enable.mapTool) {
            let window2 = remote.getGlobal('maptoolWindow');
            if (window2) {
                var name = document.querySelector(".initiative_node_active>.initiative_name_node").innerHTML;
                for (var i = 0; i < partyArray.length; i++) {
                    if (partyArray[i].character_name == name) {
                        if (parseInt(partyArray[i].darkvision) > 0) {
                            window2.webContents.send("next-player-round", { player: name, darkvision: true });
                        } else {
                            window2.webContents.send("next-player-round", { player: name, darkvision: false });
                        }
                        return;
                    }
                }
                window2.webContents.send("next-player-round", { player: null, darkvision: false });
            }
        }
    }
    function addToLoadedMonsterInfo(name, initiativeMod) {
        var found = loadedMonsterInfo.find(function (monsterArray) {
            return monsterArray[0] == name;
        });
        if (!found) {
            loadedMonsterInfo.push([name, initiativeMod])
        }
    }

    function removeLoadedMonsterInfo(monsterName) {
        var count = combatLoader.countCreatures(monsterName);
        if (count == 0) {
            var i;
            for (i = 0; i < loadedMonsterInfo.length; i++) {
                if (loadedMonsterInfo[i][0] == monsterName) {
                    break;
                }
            }
            loadedMonsterInfo.splice(i, 1);
        }
    }
    function clearLoadedMonsterInfo() {
        loadedMonsterInfo = [];
    }
    function getOrder() {
        return order;
    }

    function add() {
        prompt({
            title: 'Enter combatant name',
            label: 'Name:',
            icon: "./app/css/img/icon.png",
            customStylesheet: "./app/css/prompt.css",
            inputAttrs: { // attrs to be set if using 'input'
                type: 'string'
            }

        })
            .then((name) => {
                //Break if user cancels
                if (name == null) return false;
                prompt({
                    title: 'Enter combatant initiative roll',
                    label: 'Initiative roll:',
                    icon: "./app/css/img/icon.png",
                    customStylesheet: "./app/css/prompt.css",
                    inputAttrs: { // attrs to be set if using 'input'
                        type: 'number'
                    }

                })
                    .then((roll) => {
                        //Break if user cancels
                        if (name == null) return false;
                        order.push(
                            {
                                name: name,
                                roll: parseInt(roll),
                                dex: 0,
                                isPlayer: false
                            });
                        sortAndDisplay();
                        nextRound(0);

                    })
            })

    }

    function setOrder(orderArr) {
        order = orderArr;
        sortAndDisplay();
        nextRound(0);
    }

    function setReadyAction() {
        if (currentNode.classList.contains("initiative_node_action_readied")) {
            currentNode.classList.remove("initiative_node_action_readied");
        } else {
            currentNode.classList.add("initiative_node_action_readied");
        }
    }

    function publishEvent(arg) {
        console.log(`publishing ${arg}`)
        let window2 = remote.getGlobal('maptoolWindow');
        if (window2) window2.webContents.send('intiative-updated', arg);
    }

    return {
        setAsMain: setAsMain,
        addToLoadedMonsterInfo: addToLoadedMonsterInfo,
        removeLoadedMonsterInfo: removeLoadedMonsterInfo,
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
        empty: emptyInitiative,
        finishRoll: finishRoll,
        cancelRoll: cancelRoll,
        refreshInputFields: refreshInputFields,
        clearLoadedMonsterInfo: clearLoadedMonsterInfo,
        setRoundCounter:setRoundCounter
    }

}();