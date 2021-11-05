
var diceRoller = function () {
  function rollForRow(diceRollerRow){
    inputString = diceRollerRow.getElementsByClassName("diceroller_die_no")[0].value;
    if (inputString == "") {
      var defaultDice = diceRollerRow.getElementsByClassName("diceroller_die_no")[0].getAttribute("data-default-die");
      result = dice(parseInt(defaultDice), 1);
    } else {
      result = rollFromString(inputString);

    }

    diceRollerRow.getElementsByClassName("diceroller_result")[0].value = result;
  }
  function roll() {
    var inputString;
    var result;
    var diceRollers = [...document.getElementsByClassName("diceRollerContainer")];
    diceRollers.forEach(function (diceRollerRow) {
      rollForRow(diceRollerRow);
    });

  }

  function diceExpectedValue(sides, times){
    sides = parseInt(sides);
    times = parseInt(times);
    var result = 0;
    for(var i = 0 ; i < times ; i ++){
      var j = 0;
      var sum = 0;
      while(j <= sides){
        sum+=j;
        j+= 1.0;
      }
      sum/=sides;
      result+=sum;
    }
    return result;
  }

  function getExpectedValue(inputString){
    var values, operators;
    var firstNum, nextNum;
    inputString = inputString.toLowerCase();
    inputString = inputString.replace("-", "+-");

    var splitStrings = inputString.split("+");
    var sum = 0;
    var result = 0;
    splitStrings.forEach(function (side) {
      result = 0;
      values = side.split(/[Dd,]+/);
      operators = [];
      var lastI = 0;
      while (side.indexOf("d", lastI) >= 0) {
        operators.push("d");
        lastI = side.indexOf("d", lastI) + 1;
      }

      for (var i = 0; i < operators.length; i++) {
        firstNum = parseInt(zeroIfNull(values[i]));
        nextNum = parseInt(zeroIfNull(values[i + 1]));
        if (nextNum > 0 && firstNum > 0) {
          result += diceExpectedValue(nextNum, firstNum);
        } else {
          result += nextNum + firstNum;
        }
      }

      if (operators.length == 0) {
        result += parseInt(values[0])
      }


      sum += result;
    })

    return isNaN(sum) ? 0 : sum;
  }
  function rollCritFromString(inputString) {
    return rollFromStringHelper(inputString, true);
  }
  function rollFromString(inputString) {
    if(!inputString)return 0;
    return rollFromStringHelper(inputString, false);
  }

  function rollFromStringHelper(inputString, doCrit) {
    console.log("rolling ", inputString)
    var values, operators;
    var firstNum, nextNum;
    inputString = inputString.toLowerCase();
    inputString = inputString.replace("-", "+-");

    var splitStrings = inputString.split("+");
    var sum = 0;
    var result = 0;
    splitStrings.forEach(function (side) {
      result = 0;
      values = side.split(/[Dd,]+/);
      operators = [];
      var lastI = 0;
      while (side.indexOf("d", lastI) >= 0) {
        operators.push("d");
        lastI = side.indexOf("d", lastI) + 1;
      }

      for (var i = 0; i < operators.length; i++) {
        firstNum = parseInt(zeroIfNull(values[i]));
        nextNum = parseInt(zeroIfNull(values[i + 1]));
        if (nextNum > 0 && firstNum > 0) {
          result += dice(nextNum, firstNum);
          if (doCrit) result += dice(nextNum, firstNum);
        } else {
          result += nextNum + firstNum;
        }
      }

      if (operators.length == 0) {
        result += parseInt(values[0])
      }


      sum += result;
    })

    return isNaN(sum) ? 0 : sum;
  }

  function zeroIfNull(value) {

    if (value == null)
      return 0;
    return value;
  }

  function addRow() {
    var newRow = $(".diceRollerContainer:nth-child(1)").clone();
    newRow.appendTo("#diceRollerTable");
    var inputs = newRow.children(".diceroller_input");

    var allRows = $(".diceRollerContainer");

    var newDie = dicePossibleSides[
      allRows.length > dicePossibleSides.length ?
        dicePossibleSides.length - 1 :
        allRows.length - 1];
    inputs[0].setAttribute("data-default-die", newDie);
    inputs[0].setAttribute("placeholder", "1d" + newDie);
    inputs[1].value = null;

    inputs.on("input", diceRollerInputSanitizer);
  }

  function removeRow() {
    const diceContainer = $('#diceRollerTable');
    const dices = diceContainer.children();

    if (dices.length > 1) {
      dices.last().remove();
    }
  }

  function loadHandlers() {
    var inputs = [...document.getElementsByClassName("diceroller_input")];
    inputs.forEach(function (input) {
      input.addEventListener("keydown", function (event) {

        if (event.keyCode == 13 || event.key =="r") {
          var ele = event.target.closest(".diceRollerContainer");
     
          return rollForRow(ele);
        }
      })
      input.addEventListener("input", diceRollerInputSanitizer);
    })
  }

  function diceRollerInputSanitizer(event) {
    var input = event.target;
    var valueString = input.value;
    var lastChar = valueString[valueString.length - 2];
    var currentChar = valueString[valueString.length - 1];

    var charIsNumber = isNumber(currentChar);
    var lastCharIsNumber = isNumber(lastChar);

    var charIsOperator = isOperator(currentChar);

    if (charIsOperator) {
      if (!lastCharIsNumber) {
        input.value = valueString.substring(0, valueString.length - 1)

      }
    } else if (!charIsNumber) {
      input.value = valueString.substring(0, valueString.length - 1)
    }

  }
  function isOperator(char) {
    return ["+", "-", "d", "D"].indexOf(char) >= 0
  }

  return {
    roll: roll,
    addRow: addRow,
    removeRow: removeRow,
    loadHandlers: loadHandlers,
    rollFromString: rollFromString,
    getExpectedValue: getExpectedValue,
    rollCritFromString: rollCritFromString
  };
}();