
const constants = require("./js/dataaccess").getConstantsSync();
constants.imgFilters = ["png", "gif", "jpg", "jpeg", "webp", "avif"];


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
  if (tbText && window.api)
    tbText.innerHTML = "Version " + window.api.getAppVersion();
});


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


Array.prototype.pickOne = function () {
  return this.pickX(1)[0];
}

Array.prototype.pickX = function (num) {
  if (this.length <= num) return this;
  var picked = [];
  var results = [];
  var randomIndex;
  for (var i = 0; i < num; i++) {
    randomIndex = Math.floor(Math.random() * this.length);
    while (picked.includes(randomIndex)) {
      randomIndex = Math.floor(Math.random() * this.length);
    }
    results.push(this[randomIndex]);
    picked.push(randomIndex);
  }

  return results;
}


String.prototype.capitalizeAndDot = function () {
  return this.substring(0,1).toUpperCase() + this.substring(1) + ".";;
}
String.prototype.serialize = function () {
  return this.replace(/ /g, "_").toLowerCase();
};

String.prototype.deserialize = function () {
  return this.replace(/_/g, " ").toProperCase();;
};

String.prototype.toProperCase = function () {
  return this.replace(/\w\S*/g, function (txt) { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); });
};

function isNumber(char) {
  return ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"].indexOf(char) >= 0;
}

function loadDefaultSettings() {
  return {
    "playerPlaques": true,
    "autoInitiative": true,
    "initiativeNoGroup": false,
    "countRounds": true,
    "maxAutoLoads": "80",
    "party_settings": {},
    "maptool": {
      "defaultMonsterTokenRotate": "90",
      "defaultPlayerTokenRotate": "-90",
      "matchSizeWithFileName": false,
      "transparentWindow": false,
      "snapToGrid": true,
      "enableGrid": true,
      "syncToCombatPanel": true,
      "addPlayersAutomatically": true,
      "colorTokenBases": true,
      "applyDarkvisionFilter": true,
      "fogOfWarHue": "#000000",
      "currentFilter": 0,
      "currentMap": __dirname.replaceAll("\\", "/") + "/mappingTool/default.png",
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
      "saveRoller": true,
      "mobController": false,
    }
  }
}

const currencies = constants.currencies;
const colorPalette = constants.colorPalette;
const monsterColorPalette = constants.monsterColorPalette;
const creaturePossibleSizes = constants.creaturePossibleSizes;
const dicePossibleSides = constants.dicePossibleSides;
const itemRarityValues = constants.itemRarityValues;
const itemTypeValues = constants.itemTypeValues;


