var consoleStates = function () {
    var diceRolling = false;
    var lookup = false;
    var generating = false;
    function clearAll() {
        this.generating = false;
        this.diceRolling = false;
        this.lookup = false;
    }
    return {
        clearAll: clearAll,
        diceRolling: diceRolling,
        lookup: lookup
    }
}();

document.addEventListener("keyup", function (event) {
    if (event.keyCode == 220) {
        console.log(event.keyCode)
        commandConsole.openOrCloseConsole();
        consoleStates.clearAll();
        consoleBuffer = "";
        return;
    }

    if (!commandConsole.consoleOpen()) return;
    //Enter - execute
    if (event.keyCode == 13) {
        if (consoleBuffer != "") {
            commandConsole.hasOperator() ?
             commandConsole.setOperatorParam(consoleBuffer) :
             commandConsole.setParam(consoleBuffer);
        }
        consoleBuffer = "";
        commandConsole.execute();
        return;
        //esc
    } else if (event.keyCode == 27 || event.keyCode == 8) {
        commandConsole.clear();
        consoleStates.clearAll();
        consoleBuffer = "";
        return;
    }

    if (consoleStates.diceRolling) {
        return handleDiceRollerCommands(event.keyCode)
    } else if (consoleStates.lookup) {
        return handleLookupCommands(event.keyCode)
    } else if (consoleStates.generating) {
        return handleGenerateCommands(event.keyCode)
    }

    //R - Roll
    if (event.keyCode == 82) {
        commandConsole.clear();
        consoleStates.clearAll();
        consoleBuffer = "";
        commandConsole.setFunction(commandConsole.roll, "ROLL ");
        consoleStates.diceRolling = true;

    }
    //S - search
    else if (event.keyCode == 83) {
        commandConsole.clear();
        consoleStates.clearAll();
        consoleBuffer = "";
        commandConsole.setFunction(commandConsole.search, "SEARCH ")
        consoleStates.lookup = true;
    }

    //G - generate
    else if (event.keyCode == 71) {
        commandConsole.clear();
        consoleStates.clearAll();
        consoleBuffer = "";
        commandConsole.setFunction(commandConsole.generate, "GENERATE ")
        consoleStates.generating = true;
    }

    function handleGenerateCommands(keyCode) {
        if (commandConsole.getState() == 1) {
            //T --tavern name
            if (keyCode == 84) {
                commandConsole.setParam("tavern")
                commandConsole.updateInput(" TAVERN NAME");
                // C - celestial name
            } else if (keyCode == 67) {
                commandConsole.setParam("celestial")
                commandConsole.updateInput(" CELESTIAL NAME");
                //F -- fiend
            } else if (keyCode == 70) {
                commandConsole.setParam("fey")
                commandConsole.updateInput(" FEY NAME");
            } else if (keyCode == 68) {
                commandConsole.setParam("fiend")
                commandConsole.updateInput(" DEMONIC NAME");
                //N -- NAME
            } else if (keyCode == 78) {
                commandConsole.setParam("anglo")
                commandConsole.updateInput(" NAME");
            }
        } else if (commandConsole.getState() == 2 && commandConsole.getParamCount() == 1 && commandConsole.getParam(0) != "tavern") {
            //F - female
            if (keyCode == 70) {
                commandConsole.updateInput(" FEMALE");
                commandConsole.setParam("female")
            }
        }
    }


    function handleLookupCommands(keyCode) {
        if (commandConsole.getState() != 1) return;
        //S - spells
        if (keyCode == 83) {
            commandConsole.setParam("spells")
            commandConsole.updateInput(" SPELLS");

            //M - monsters
        } else if (keyCode == 77) {
            commandConsole.setParam("monsters")
            commandConsole.updateInput(" MONSTERS");
        }
        //I - items
        else if (keyCode == 73) {
            commandConsole.setParam("items")
            commandConsole.updateInput(" ITEMS");
        }
        //C - conditions
        else if (keyCode == 67) {
            commandConsole.setParam("conditions")
            commandConsole.updateInput(" CONDITIONS");
        }


    }
    function handleDiceRollerCommands(keyCode) {
        //d = 68 = dice
        if (keyCode == 68 && commandConsole.getParamCount() == 0) {
            if (commandConsole.getState() != 2 && consoleBuffer == "") return;
            commandConsole.setParam(parseInt(consoleBuffer))
            commandConsole.setOperator(-1, " d")
            consoleBuffer = "";
        }   //49-57
        // 97-105
        else if ((keyCode >= 48 && keyCode <= 57) ||
            (keyCode >= 96 && keyCode <= 105) &&
            (commandConsole.getState() == 1)) {
            var numValue;
            if (keyCode >= 48 && keyCode <= 57) {
                numValue = keyCode - 48;
                //Numpad
            } else {
                numValue = keyCode - 96;
            }
            consoleBuffer += numValue;
            commandConsole.updateInput(numValue)
            //+ operator
        } else if (keyCode == 107 || keyCode == 191) {
            commandConsole.setOperator(addTwo, " + ")
            if(consoleBuffer != ""){
                commandConsole.setParam(consoleBuffer);
                consoleBuffer = "";
            }
            //- operator
        }else if (keyCode == 109 || keyCode == 219) {
            commandConsole.setOperator(subtractTwo, " - ")
            if(consoleBuffer != ""){
                commandConsole.setParam(consoleBuffer);
                consoleBuffer = "";
            }
        }
    }

    function subtractTwo(a,b){
        return parseInt(a)-parseInt(b);
    }

    function addTwo(a, b){
        return parseInt(a)+parseInt(b);
    }
});
var consoleBuffer = "";

var commandConsole = function () {
    var inputElement = document.getElementById("command_console_input");
    var commandFunction, operatorFunction;
    var state = 0; // 0 rdy for function, 1 rdy param, 2 rdy operator
    var consoleIsOpen = false;
    var params = [];
    var operatorParams = [];
    var paramIndex = 0, opParamIndex = 0;
    var actions = [];
    function openOrCloseConsole() {
        consoleIsOpen = !consoleIsOpen;
        if (consoleIsOpen) {
            document.getElementById("command_console_input").classList.remove("hidden");
            inputElement.focus();
            document.getElementById("title_bar_text").classList.add("hidden");
        } else {
            document.getElementById("command_console_input").classList.add("hidden");
            document.getElementById("title_bar_text").classList.remove("hidden");
        }
        clear();
        consoleStates.clearAll();
    }

    function updateInput(value) {
        inputElement.value = inputElement.value + value;
    }
    function setParam(param) {
        state = 2;
 
        params[paramIndex++] = param;
    }
    function setOperatorParam(param){
        state = 3;
 
        operatorParams[opParamIndex++] = param;
    }
    function setOperator(value, display) {
        state = 1;
        updateInput(display);
        if (value != -1) {
            operatorFunction = value;
        }
    }

    function getParam(index) {
        return params[index];

    }

    function hasOperator(){
        return operatorFunction!=null;
    }

    function getParamCount() {
        return params.length;
    }
    function setFunction(func, funcName) {
        actions.push(funcName)
        clear();
        state = 1;
        commandFunction = func;
        inputElement.value = funcName;
    }
    function consoleOpen() {
        return consoleIsOpen;
    }

    function getState() {
        return state;
    }

    function execute() {
        var result = commandFunction.apply(null, params);

        if (operatorFunction) result = operatorFunction(result, operatorParams[0]);

        clearLastResult();
        if (result != null) inputElement.value += " = " + result;
        state = 0;
        consoleStates.clearAll();
    }

    function clearLastResult() {
        var cmdText = inputElement.value;
        if (cmdText.lastIndexOf("=") >= 0) {
            cmdText = cmdText.substring(0, cmdText.lastIndexOf(" ="));
        }
        inputElement.value = cmdText;
    }
    function clear() {

        params = [];
        operatorParams = [];
        operatorFunction = null;
        commandFunction = null;
        inputElement.value = "";
        paramIndex = 0;
        opParamIndex = 0;
        actions = [];
        state = 0;
    }

    function removeLast() {
        removeLast
    }

    function generate(key, gender) {

        fs.readFile(generatorResourcePath + "names.json", function read(err, data) {
            if (err) {
                throw err;
            }
            data = JSON.parse(data);
            var result;
            if (key == "tavern") {
                result = generateTavernName(data)
            } else {
                var dataset = gender == "female" ? data.names[key].female : data.names[key].male;
                result = pickX(dataset.firstnames, 1) + " " + pickX(data.names[key].male.lastnames, 1);
            }
            clearLastResult();
            inputElement.value += " = " + result;

        });
    }

    function search(searchKey) {

        var searchBar;

        if (searchKey == "spells") {
            searchBar = document.getElementById("searchbarspells");
        } else if (searchKey == "monsters") {
            searchBar = document.getElementById("searchbar");
        } else if (searchKey == "conditions") {
            searchBar = document.getElementById("searchbarconditions");
        } else if (searchKey == "items") {
            searchBar = document.getElementById("searchbaritems");
        }
        if (searchKey != "monsters") {
            var buttons = [...document.getElementsByClassName("control_button")];
            buttons.forEach(function (button) {
                if (button.innerHTML.toLowerCase() == searchKey) button.click();
            });
        }



        searchBar.focus();
        searchBar.select();
        openOrCloseConsole();



    }
    function roll(times, sides) {
        if (sides == null) return times;
        times = parseInt(times);
        sides = parseInt(sides);
        var sum = 0;
        for (var i = 0; i < times; i++) {
            sum += d(sides);
        }
        return sum;
    }

    return {
        consoleOpen: consoleOpen,
        openOrCloseConsole: openOrCloseConsole,
        setParam: setParam,
        getParam: getParam,
        updateInput: updateInput,
        setFunction: setFunction,
        execute: execute,
        roll: roll,
        removeLast: removeLast,
        getState: getState,
        setOperator: setOperator,
        search: search,
        generate: generate,
        clear: clear,
        getParamCount: getParamCount,
        hasOperator:hasOperator,
        setOperatorParam:setOperatorParam

    }
}();

function generateTavernName(data) {
    var tavernName = pickOne(data.tavern.name.template);
    var tavernOwner = { firstname: pickOne(data.names.anglo.male.firstnames), lastname: pickOne(data.names.anglo.male.lastnames) };

    var ending = "'s";
    if (tavernOwner.firstname.substring(tavernOwner.firstname.length - 1) === "s") ending = "'";
    tavernName = tavernName.replace(/_name/g, tavernOwner.firstname + ending);
    tavernName = tavernName.replace(/_common_animal/g, pickOne(data.common_animal));
    tavernName = tavernName.replace(/_adjective/g, pickOne(data.tavern.name.adjective));
    tavernName = tavernName.replace(/_tavern/g, pickOne(data.tavern.name.tavern));
    tavernName = tavernName.replace(/_profession/g, pickOne(data.tavern.name.profession));
    tavernName = tavernName.replace(/_unique/g, pickOne(data.tavern.name.unique));
    return tavernName;
}