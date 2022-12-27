const Modals = require("./modals");

var initiative = function () {
    var roundTimer;
    var order;
    var currentNode;
    var monsterColor = "rgb(197, 0, 0)", playerColor = "rgb(101, 117, 197)", defaultPlayerColor = "#000000";
    var roundCounter;


    function emptyInitiative() {
        var bar = document.getElementById("initBar");
        while (bar.firstChild) {
            bar.removeChild(bar.firstChild);
        }

        if (roundTimer) {
            roundTimer.destroy();
        }
        var currentActorEle = document.getElementById("initiative_current_actor");
        if (currentActorEle) {
            currentActorEle.classList.add("hidden");
        }
    }
    function hide() {
        emptyInitiative();

        document.getElementById("initiative_control_bar").classList.add("hidden");
        document.querySelector(".roundcounter__value").innerHTML = ("1");

    }
    function sortAndDisplay() {
        document.querySelector("#initiative_popup_window")?.classList.add("hidden");

        //Sort the array so highest initiative is first.
        sort();

        emptyInitiative();
        var initNodes = [...document.querySelectorAll(".initiativeNode")];

        //Create buttons in initiative elements.
        var bar = document.getElementById("initBar");
        for (var j = 0; j < order.length; j++) {
            bar.appendChild(createNode(order[j]));
        }

    }
   
    function createNode(entry) {
        var newNode = Util.ele("div", "initiativeNode initiative_node_inactive init--PC");
        var p = Util.ele("p", "initiative_name_node", entry.name)
        newNode.appendChild(p);
        if (entry.isPlayer) {
            newNode.classList.add("player_node");
            newNode.classList.remove("monster_node");
        } else {
            newNode.classList.add("monster_node");
            newNode.classList.remove("player_node");
        }
        newNode.style.backgroundColor = getColor(entry);
        return newNode;
    }
    
    function getColor(entry) {

        if (entry.color) return Util.hexToHSL(entry.color, 40);
        if (entry.isPlayer) return playerColor;
        return monsterColor;
    }

    function getNextRoundCounterValue() {

        var max = order.length;

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

        var initNodes = [...document.querySelectorAll(".initiativeNode")];
        var max = initNodes.length;
        if (roundCounter[1] >= max && sign > 0 || roundCounter[1] <= 1 && sign < 0) {
            if (roundCounter[1] >= max) {
                roundCounter[1] = 1;
            } else if (roundCounter[1] <= 1 && roundCounter[0] != 1) {
                roundCounter[1] = max;
            }
            roundCounter[0] += 1 * sign;
            var roundCounterEle = document.querySelector(".roundcounter__value");
            if (roundCounterEle)
                roundCounterEle.innerHTML = (roundCounter[0]);
        } else {
            roundCounter[1] += 1 * sign;

        }

        var currentInitActor = currentActor();
        var currentActorEle = document.getElementById("initiative_current_actor");
        if (currentActorEle) {
            currentActorEle.classList.remove("hidden");
            currentActorEle.innerHTML = currentInitActor.current.name;
            currentActorEle.style.color = currentInitActor.current.color;
        }

        initNodes.forEach(node => {
            node.classList.remove("initiative_node_active");
            node.classList.add("initiative_node_inactive");
        })

        var currentNode = document.querySelector(".initiativeNode:nth-child(" + roundCounter[1] + ")");
        if (currentNode) {
            currentNode.classList.add("initiative_node_active")
            currentNode.classList.remove("initiative_node_inactive")

            var current = order[roundCounter[1] - 1];

            if (currentNode.classList.contains("initiative_node_action_readied")) {
                currentNode.classList.remove("initiative_node_action_readied");
            }

        }



        return current;
    }

    function setRoundCounter(counter) {
        roundCounter = counter;
        nextRound(0);
    }



    function getOrder() {
        return order;
    }

    function setOrder(orderArr) {
        console.log("Set order", orderArr)
        order = orderArr;
        sort();
        sortAndDisplay();
        nextRound(0);
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
        console.log(roundCounter)
        var current = order[roundCounter[1] - 1].name;

        if (current == null) {
            return null;
        }
        var nextIndex = getNextRoundCounterValue();

        var next = order[nextIndex - 1].name;
        var currentColor = getColor(order[roundCounter[1] - 1]);

        return { current: { name: current, color: currentColor }, next: next };
    }

    return {
        addEventListener: addEventListener,
        nextRound: nextRound,
        getOrder: getOrder,
        setOrder: setOrder,
        hide: hide,
        empty: emptyInitiative,
        setRoundCounter: setRoundCounter,
        currentActor: currentActor
    }

}();


module.exports = initiative;