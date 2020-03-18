

const constants = dataAccess.getConstantsSync();
//const generatorResourcePath = "./resources/app/app/generators/";

/*
const resourcePath="./resources/app/app/js/lib/";
const settingsPath="./resources/app/app/settings/";
*/

/**Býr til html töflu úr json obj sem hefur uppbyggingu
 * "h1"[1,2,3],
 * "h2"[3,4,5].
 **/

function checkIfImageExists(imageSrc, exists, doesNotExist) {
  var img = new Image();
  img.onload = good; 
  img.onerror = bad;
  img.src = imageSrc;
}

function d(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

function dice(sides, times) {
  var sum = 0;
  for (var i = 0; i < times; i++) {
    sum += d(sides);
  }
  return sum;
}


document.addEventListener("DOMContentLoaded", function () {

  var tbText = document.getElementById("title_bar_text");
  if(tbText && app)
    tbText.innerHTML = "Version " + app.getVersion();
});
/*Henda þessu siðan */
window.addEventListener('mousedown', (e) => {
  if (e.ctrlKey && e.button == 1)
    remote.getCurrentWindow().inspectElement(e.clientX, e.clientY);

}, false)
function generateHTMLTable(jsonObj) {
  var jsonKeys = Object.keys(jsonObj);
  jsonKeys.forEach(key=>{
      var isEmpty = jsonObj[key].filter(x=> x != undefined && x!= "").length == 0;
      if(isEmpty)
        delete jsonObj[key];
  });

  var jsonObjValues = Object.values(jsonObj);
  //filter out empty arrays

  console.log(jsonObjValues)
  var expectedLength = jsonObjValues[0].length;
  for (var i = 1; i < jsonObjValues.length; i++) {
    if (jsonObjValues[i].length != expectedLength) {
      console.log("Cannot create table from arrays of unequal length.");
      return;
    }
  }
  var newTable = document.createElement("table");
  var newNode;
  var currentHeader = document.createElement("thead");
  var currentRow = document.createElement("tr");
  var columnCount = 0;
  currentHeader.appendChild(currentRow);
  newTable.appendChild(currentHeader);
  for (arr in jsonObj) {
    columnCount++;
    newNode = document.createElement("th");
    newNode.innerHTML = marked(arr.replace("_"," "));
    currentRow.appendChild(newNode);
  }
  currentHeader = document.createElement("tbody");
  for (var i = 0; i < expectedLength; i++) {
    currentRow = document.createElement("tr");
    currentHeader.appendChild(currentRow);
    for (var j = 0; j < columnCount; j++) {
      newNode = document.createElement("td");
      newNode.innerHTML = marked(""+ jsonObjValues[j][i]);
      currentRow.appendChild(newNode);

    }
  }
  newTable.appendChild(currentHeader);
  return newTable;
}
function pickOne(arr) {
  return pickX(arr, 1)[0];
}
function pickX(arr, num) {
  if (arr.length <= num) return arr;
  var picked = [];
  var results = [];
  var randomIndex;
  for (var i = 0; i < num; i++) {
    randomIndex = Math.floor(Math.random() * arr.length);
    while (picked.includes(randomIndex)) {
      randomIndex = Math.floor(Math.random() * arr.length);
    }
    results.push(arr[randomIndex]);
    picked.push(randomIndex);
  }

  return results;
}

function lightenColor(colorString) {
  var csColors, startIndex;

  if (colorString.substring(0, 4) == "rgba") {
      startIndex = 5;
  } else if (colorString.substring(0, 3) == "rgb") {
      startIndex = 4;
  }
  if (startIndex == null)
      return colorString;
  csColors = colorString.substring(startIndex, colorString.length - 1).split(",");
  for (var i = 0; i < csColors.length; i++) {
      var colorValue = parseInt(csColors[i]);
      colorValue += 20;
      if (colorValue > 256)
          colorValue = 256;
      csColors[i] = colorValue;
  }

  return "rgba(" + csColors.join(",") + ",0.6)";
}

function runWithWorker(fn) {
  return new Worker(URL.createObjectURL(new Blob(['(' + fn + ')()'])));
}
function getAbilityScoreModifier(abilityScore) {
  abilityScore = parseInt(abilityScore);
  return Math.floor((abilityScore - 10) / 2)
}

function isEmpty(obj) {
  for (var key in obj) {
    if (obj.hasOwnProperty(key))
      return false;
  }
  return true;
}


//Morphs string by putting all to lower case and
//and replacing whitespace with _
function serialize(string) {
  var x = string.toLowerCase();
  x = x.replace(/ /g, "_");
  return x;

}


String.prototype.serialize = function () {
  return this.replace(/ /g, "_").toLowerCase();
};

String.prototype.deserialize = function () {
  return this.replace(/_/g, " ").toProperCase();;
};

String.prototype.toProperCase = function () {
  return this.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};

function isNumber(char) {
  return ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"].indexOf(char) >= 0;
}

function loadDefaultSettings() {
  return {
    "playerPlaques": true,
    "autoInitiative": true,
    "countRounds": true,
    "maxAutoLoads": "80",
    "maptool": {
      "transparentWindow": false,
      "snapToGrid": true,
      "enableGrid": true,
      "syncToCombatPanel": true,
      "addPlayersAutomatically": true,
      "colorTokenBases": true,
      "applyDarkvisionFilter": true,
      "fogOfWarHue": "#000000",
      "currentFilter": 0,
      "gridSettings": {
        "showGrid": true,
        "cellSize": 35
      },
      "defaultMapSize": null
    },
    "enable": {
      "generator": true,
      "mapTool": true,
      "lootRoller": true,
      "diceRoller": true,
      "saveRoller": true
    }}
}

const currencies = constants.currencies;
const colorPalette = constants.colorPalette;
const monsterColorPalette = constants.monsterColorPalette;
const creaturePossibleSizes = constants.creaturePossibleSizes;
const dicePossibleSides = constants.dicePossibleSides;
const itemRarityValues = constants.itemRarityValues;
const itemTypeValues = constants.itemTypeValues;


