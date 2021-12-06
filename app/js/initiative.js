const Modals = require("./modals");


module.exports = function () {

    var order;
    var currentNode;
    var monsterColor = "rgb(197, 0, 0)", playerColor = "rgb(101, 117, 197)", defaultPlayerColor = "#000000";
    var roundCounter;
    var roundcounter__handlers__added = false;
    var isMainWindow = false;
    function setAsMain() {
        isMainWindow = true;
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
        Modals.prompt(
            `${nodeName} - new score`,
            "Score: ",
            (result) => {
                if (result == null) return false;
                order[i].roll = parseInt(result);
                sortAndDisplay();
            }
        );


    }
    function removeCurrentNode() {

        if ($("#initBar .initiativeNode").length > 1) {
            var nameToRemove = currentNode.getElementsByClassName("initiative_name_node")[0].innerHTML;
            console.log(`Remove node ${nameToRemove}`)
            order = order.filter(x => x.name != nameToRemove);
            console.log(order);
            sortAndDisplay();
            nextRound(-1);

        } else {
            $(".initiativeNode:nth-child(1)>.initiative_name_node").html("Roll \n initiative");
            $('.initiativeNode').on("click", initiative.roll);
            $('.initiativeNode').off("mousedown");
            $(".initiativeNode").removeClass("initiative_node_active");
            $('.initiativeNode').addClass("init_not_started")
        }
    }

    function roll() {
        order = [];
        if (settings.countRounds)
            roundCounter = [1, 0];
        if (settings.autoInitiative) {
            autoRollPlayers();
            rollForMonsters(() => sortAndDisplay());

        } else {

            rollForMonsters(function (noMonsters) {
                var inputs = partyArray.map(p => {
                    return {
                        required: true,
                        label: p.character_name,
                        id: p.id
                    }
                });
                if (noMonsters)
                    inputs.push({
                        required: false,
                        label: "Monsters",
                        id: "monster_init"
                    })
                Modals.multiInputPrompt("Initiative scores",
                    inputs, (resultAr) => {
                        if (!resultAr)
                            return;

                        resultAr.filter(x => x.value != "" && x.value != null).map(res => {
                            var pc = partyArray.find(x => x.id == res.id);
                            return {
                                name: pc?.character_name || "Monsters",
                                roll: parseInt(res.value || 0),
                                dex: pc?.dexterity || 0,
                                isPlayer: pc != null,
                                color: pc?.color || monsterColor
                            }
                        }).forEach(x => order.push(x));
                        sortAndDisplay();

                    }
                );


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
            combatLoader.getLoadedMonsters(monsters => {
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
                        console.log(init)
                        order.push(
                            {
                                name: monsters[i].name,
                                roll: d(20) + init,
                                dex: init,
                                isPlayer: false
                            });
                    }
                }

                if (callback) callback();
            });
        }
        return false;
    }

    function emptyInitiative() {

        $('.initiativeNode:not(:first-child)').remove();
        $(".initiativeNode:nth-child(1)>.init_value_node").html("");
        $(".initiativeNode:nth-child(1)>.initiative_name_node").html("Roll\n initiative");
        $(".initiativeNode:nth-child(1)>.initiative_explanation_text_node").val("");

        $(".initiativeNode").removeClass("initiative_node_active");
        $(".initiativeNode").removeClass("player_node");
        $(".initiativeNode").removeClass("monster_node");
        $('.initiativeNode').addClass("init_not_started");
        var initCont = document.querySelector(".initiative");
        if (initCont)
            initCont.classList.remove("initiative_cover_image");
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
        document.querySelector("#initiative_popup_window")?.classList.add("hidden");

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
        var initCont = document.querySelector(".initiative");
        if (initCont && initCont.classList.contains("initative_has_cover_image"))
            initCont.classList.add("initiative_cover_image");
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
        } else {
            $(".initiativeNode").addClass("initiative_node_inactive");
        }

    }

    function getColor(entry) {

        if (entry.color) return Util.hexToHSL(entry.color, 40);
        if (entry.isPlayer) return playerColor;
        return monsterColor;
    }

    function getNextRoundCounterValue() {
        var max = $("#initBar").children().length;
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
        if (!roundCounter)
            return;
     
        if (roundCounter[0] == 1 && roundCounter[1] == 1 && sign < 0)
            return false;

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
        return current;
    }

    function setRoundCounter(counter) {
        roundCounter = counter;
        nextRound(0);
    }

    function notifyMapToolNextPlayer() {
        if (settings.enable.mapTool) {


            var name = document.querySelector(".initiative_node_active>.initiative_name_node").innerHTML;
            var pc = partyArray.find(x => x.name == name);
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
                id: "name"
            }, {
                label: "Initiative score (incl dex)",
                required: true,
                id: "init"
            }
        ]
        Modals.multiInputPrompt("Add to initiative", inputs, (resultArr) => {
            //Break if user cancels
            if (resultArr == null) return false;
            console.log(resultArr)
            order.push(
                {
                    name: resultArr.find(x => x.id == "name").value,
                    roll: parseInt(resultArr.find(x => x.id == "init").value),
                    dex: 0,
                    isPlayer: false
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
        callBackArr.forEach(callback => {
            callback(arg)
        });
    }

    function currentActor() {
        var current = $(".initiativeNode:nth-child(" + roundCounter[1] + ") .initiative_name_node").html();
        if (current == null) {
            return null;
        }
        var nextIndex = getNextRoundCounterValue();
        var next = $(".initiativeNode:nth-child(" + nextIndex + ") .initiative_name_node").html();
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
        empty: emptyInitiative,
        setRoundCounter: setRoundCounter,
        currentActor: currentActor
    }

}();