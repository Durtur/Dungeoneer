


var loadedMonster = {};
var loadedMonsterQueue = [];

var loadedEncounter = [];

var marked = require('marked');
const dataAccess = require("./js/dataaccess");
const initiative = require("./js/initiative")
const remote = require('electron').remote;

const dialog = require('electron').remote.dialog;
const app = remote.app;
const uniqueID = require('uniqid');
marked.setOptions({
  renderer: new marked.Renderer(),

});


const { ipcRenderer } = require('electron');

var mobController;

var statblockType; //Segir til um hvort verið sé að hlaða  monster. 
var encounterIsLoaded;

var partyArray, partyInformationList, partyInputAwesomeplete, conditionList;
var partyAlternativeACArray;
var roundCounter;

// function fixSkills(){
//   var skills = dataAccess.getConstantsSync().skills;
//   console.log(skills);
//   dataAccess.getMonsters(monsters => {
//     monsters.forEach(monster=>{
//       var skillStr = "";
//       skills.forEach(skill => {
//         if(monster[skill.serialize()]){
//             var value = monster[skill.serialize()];
//             skillStr+=skill + " +" + value + ", ";
//             delete monster[skill.serialize()];
//         }

//       });
//       if(skillStr){

//         skillStr = skillStr.substring(0, skillStr.length-2);
//         monster.skills = skillStr;
//       }
//     });
//     dataAccess.setMonsters(monsters, ()=> {});

//   });
// }

/* #region IPC */
ipcRenderer.on('update-autofill', function () {

  autofill.updateAutoFillLists(true);

});
ipcRenderer.on('condition-list-changed', function (evt, conditionList, index) {
  console.log(conditionList, index)
  var combatRow = [...document.querySelectorAll("#combatMain .combatRow")].filter(x => x.getAttribute("data-dnd_monster_index") == index)[0];
  if (combatRow) {
    combatLoader.setConditionList(combatRow, conditionList.map(x => x.toLowerCase()));
  } else {
    //Is player
    var pcNode = [...document.querySelectorAll(".pcnode_name>p")].filter(x => x.innerHTML == index)[0];
    if (pcNode) {
      setPcNodeConditions(pcNode.parentNode, conditionList);
    }
  }

});
ipcRenderer.on('monster-revived', function (evt, arg) {
  combatLoader.revive(arg);
});

ipcRenderer.on('maptool-initialized', function (evt, arg) {
  if (!settings.maptool.syncToCombatPanel) return;
  //Verify queue integrity
  var allRows = document.querySelectorAll("#combatMain .combatRow");
  //Empty queue, add all
  loadedMonsterQueue.length = 0;

  for (var i = 0; i < allRows.length; i++) {
    var name = allRows[i].getElementsByClassName("name_field")[0].value;
    var index = allRows[i].getAttribute("data-dnd_monster_index");
    var size = allRows[i].getAttribute("data-dnd_monster_size");
    var monsterId = allRows[i].getAttribute("data-dnd_monster_id");
    if (name == "" || allRows[i].classList.contains("hidden"))
      continue;


    loadedMonsterQueue.push({ monsterId: monsterId, name: name, size: size, index: index });

  }
  loadedMonsterQueue.update();
  mobController.mapToolInitialized();



});


ipcRenderer.on('settings-changed', function (evt, arg) {
  console.log("Settings changed, applying...");
  loadSettings();
});



ipcRenderer.on('monster-killed', function (evt, arg) {
  combatLoader.kill(arg, true);
});

ipcRenderer.on('look-up-item', function (evt, arg) {

  document.querySelector("#searchbaritems").value = arg;
  remote.getCurrentWindow().focus();
  search('items', true, null);

});

ipcRenderer.on('look-up-spell', function (evt, arg) {
  document.querySelector("#searchbarspells").value = arg;
  remote.getCurrentWindow().focus();
  search('spells', true, null);

});

/* #endregion */
document.addEventListener("DOMContentLoaded", function () {
  loadSettings();
  observeArrayChanges(loadedMonsterQueue, function () {
    loadedMonsterQueue.update();
  });

  randomizer.initialize();
  window.setTimeout(() => {
    let window2 = remote.getGlobal('maptoolWindow')
    if (window2) window2.webContents.send('notify-main-reloaded');
  }, 1000)

  combatLoader.initialize();
  $('.initiativeNode').on("click", initiative.roll);
  initiative.setAsMain();
  document.querySelectorAll("#initiative_control_bar button").forEach(button => {
    button.addEventListener("click", function () {
      document.querySelector("#initiative_control_bar").classList.add("hidden");
    })
  })


  combatLoader.loadFieldHandlers();
  diceRoller.loadHandlers();
  autofill.updateAutoFillLists();

  //Tengir homebrew takka
  var settingsEl = document.querySelector('#homebrew--button');
  settingsEl.addEventListener('click', function () {
    ipcRenderer.send('open-database-window');
  });

  //Tengir maptool takka
  var settingsEl = document.querySelector('#mapping--button');
  settingsEl.addEventListener('click', function (e) {
    if (e.ctrlKey) {
      ipcRenderer.send('open-maptool-extra-window');
    } else {
      ipcRenderer.send('open-maptool-window');
    }

  });

  //Tengir generators takka
  var generatorsEl = document.querySelector('#generators--button');
  generatorsEl.addEventListener('click', function () {
    ipcRenderer.send('open-generator-window');
  });
  document.addEventListener("keydown", function (e) {
    //Close all shit on escape

    if (e.key == "Escape") {

      combatLoader.clearSelection();
      hideFrame('search');
      hideAllFloatingInputs();
      hideAllPopups();
      combatLoader.closeLog();
    } else if (e.key == "e" && e.ctrlKey) {

      if (loadedMonster) combatLoader.loadCombat()
    } else if (e.key == "i" && e.altKey) {

      initiative.roll();
    } else if (e.key == "d" && e.ctrlKey) {
      addMob();
    }
  });
  document.addEventListener("click", function (e) {
    if (!e.target.classList.contains("multi_selectable_field_num")) {
      combatLoader.clearSelection();
    }
  })
  document.getElementById("lootcr").addEventListener("keydown", function (e) { if (e.keyCode == 13) randomizeLoot() });

  [...document.getElementsByClassName("saveRoller_input")].forEach(function (input) {
    input.addEventListener("keydown", function (evt) {
      if (evt.keyCode == 13) rollSaves();
    })
  })
  console.log(document.getElementById("active_party_input"))
  document.getElementById("active_party_input").addEventListener('awesomplete-selectcomplete', function (e) {
    filterPcRowsBySelectedParty();

  });

  document.getElementById("active_party_input").addEventListener('focus', function (e) {
    e.target.value = "";

  });
  //DEBUG AND TESTING
  designTimeAndDebug();
});

function designTimeAndDebug() {
  //
  search("monsters", true, "thug", true);

}

function setPcNodeConditions(pcNode, conditionList) {
  clearPcNodeConditions(pcNode);

  conditionList.forEach(cond => addPcNodeCondition(pcNode, cond));

}

function addPcNodeCondition(node, condition) {
  if (!condition) return;
  var condList = node.getAttribute("data-dnd_conditions") ? node.getAttribute("data-dnd_conditions").split(",") : [];
  condList.push(condition);
  node.setAttribute("data-dnd_conditions", condList.join(","))
  var container = node.querySelector(".pcNode_condition_container");

  var newDiv = document.createElement("div");
  var para = document.createElement("p");

  newDiv.classList.add("condition_effect");
  newDiv.classList.add("secondary_tooltipped");
  newDiv.appendChild(para);
  var conditionObj = conditionList.filter(x => x.name.toLowerCase() == condition.toLowerCase())[0];
  if (!conditionObj) {
    conditionObj = { name: condition, description: "" }
  }
  if (conditionObj.condition_color_value) {
    newDiv.style.webkitTextFillColor = conditionObj.condition_color_value
    if (!conditionObj.condition_background_location) {
      newDiv.style.backgroundColor = lightenColor(conditionObj.condition_color_value)
    }
  }
  if (conditionObj.condition_background_location) {
    newDiv.style.backgroundColor = "rgba(0,0,0,0)";
    newDiv.style.backgroundImage = "url('" + conditionObj.condition_background_location.replace(/\\/g, "/") + "')";
  }
  var secTooltip = document.createElement("div");
  secTooltip.classList.add("secondary_tooltip");
  var para = document.createElement("div");
  para.innerHTML = marked("## " + condition + (conditionObj.description ? "\n" + conditionObj.description : ""));
  if (para.innerHTML.length > 0) {
    if (conditionObj.condition_background_location) {
      var img = document.createElement("img");
      img.setAttribute("src", conditionObj.condition_background_location);
      para.prepend(img);
    }
    secTooltip.appendChild(para);
    newDiv.appendChild(secTooltip);
  }

  newDiv.setAttribute("data-dnd_condition_full_name", condition);
  container.appendChild(newDiv);
}

function clearPcNodeConditions(pcNode) {
  console.log("Clearing all")
  var condList = pcNode.getAttribute("data-dnd_conditions") ? pcNode.getAttribute("data-dnd_conditions").split(",") : [];
  condList.forEach(cond => removePcNodeCondition(pcNode, cond));
}

function removePcNodeCondition(pcNode, condition) {
  console.log("Removing", condition, pcNode)
  if (!condition) return;
  var condList = pcNode.getAttribute("data-dnd_conditions") ? pcNode.getAttribute("data-dnd_conditions").split(",") : [];
  condList = condList.filter(x => x.toLowerCase() != condition.toLowerCase());
  var eles = [...pcNode.getElementsByClassName("condition_effect")];

  eles.forEach(element => {
    if (element.getAttribute("data-dnd_condition_full_name").toLowerCase() == condition.toLowerCase())
      element.parentNode.removeChild(element);
  })
}

function showSearchBox(element, index) {
  var buttons = document.getElementsByClassName("control_button");
  buttons = [...buttons];
  buttons.forEach((button) => {
    button.classList.remove("control_button_toggled")
    document.getElementById("searchbar" + button.innerHTML.toLowerCase()).classList.add("hidden");
  });
  element.classList.add("control_button_toggled");
  document.getElementById("searchbar" + element.innerHTML.toLowerCase()).classList.remove("hidden");
  document.getElementById("searchbar" + element.innerHTML.toLowerCase()).select();
}

var autofill = function () {
  var autoFillInputLists = [];
  var monsterNames, conditionNames, spellNames, itemNames;
  function updateAutoFillLists(callback) {
    //Encounters, monsters, homebrew monsters
    console.log("Updating autofill");
    autoFillInputLists.forEach(aws => aws.destroy());
    autoFillInputLists = [];
    dataAccess.getMonsters(function (data) {
      var arr = [];
      data.forEach(function (i) {
        arr.push([i.name.toLowerCase() + " - cr " + i.challenge_rating + " (mm)", i.name]);
      });

      dataAccess.getHomebrewMonsters(function (hbdata) {
        hbdata.forEach(function (i) {
          arr.push([i.name.toLowerCase() + " - cr " + i.challenge_rating + (i.source ? " " + i.source + " " : null || " (hb)"), i.name]);
        });
        dataAccess.getEncounters(function (endata) {
          endata.forEach(function (i) {
            arr.push(["Encounter: " + i.name.toLowerCase(), i.name]);
          });
          arr.sort();

          monsterNames = arr;
          autoFillInputLists.push(new Awesomplete(document.getElementById("searchbar"), { list: monsterNames, autoFirst: true }));
          document.getElementById('searchbar').addEventListener('awesomplete-selectcomplete', function (e) {
            search('monsters', true, '');
          });
          dataAccess.writeAutofillData(monsterNames, () => {
            if (callback) notifyAutoFillComplete();
          });

        });
      });
    });


    //Conditions

    dataAccess.getConditions(function (data) {
      conditionList = data;
      var arr = [];
      data.forEach(function (i) {
        arr.push(i.name);
      });
      arr.sort();
      conditionNames = arr;
      autoFillInputLists.push(new Awesomplete(document.getElementById('searchbarconditions'), { list: conditionNames, autoFirst: true, minChars: 0 }));
      document.getElementById('searchbarconditions').addEventListener('awesomplete-selectcomplete', function (e) {
        search('conditions', true, null);

      });
    });

    //Items
    dataAccess.getItems(function (data) {
      var arr = [];
      data.forEach(function (i) {
        arr.push(i.name);
      });
      arr.sort();
      itemNames = arr;
      autoFillInputLists.push(new Awesomplete(document.getElementById('searchbaritems'), { list: itemNames, autoFirst: true }));
      document.getElementById('searchbaritems').addEventListener('awesomplete-selectcomplete', function (e) {
        search('items', true, null);
      });
    });

    //Spells
    dataAccess.getSpells(function (data) {
      var arr = [];
      data.forEach(function (i) {
        arr.push([i.name.toLowerCase() + " - " + i.level, i.name]);

      });
      arr.sort();
      spellNames = arr;
      autoFillInputLists.push(new Awesomplete(document.getElementById('searchbarspells'), { list: spellNames, autoFirst: true }));
      document.getElementById('searchbarspells').addEventListener('awesomplete-selectcomplete', function (e) {
        search('spells', true, null);
      });
    });
    //Tables
    dataAccess.getTables(function (data) {
      var arr = [];
      data.forEach(function (i) {
        arr.push([i.name, i.name]);
      });
      arr.sort();
      dataAccess.getRandomTables((function (randData) {
        randData = randData.tables;
        Object.keys(randData).forEach(tbl => arr.push(["Random table: " + tbl.deserialize(), tbl.deserialize()]));

        autoFillInputLists.push(new Awesomplete(document.getElementById('searchbartables'), { list: arr, autoFirst: true, minChars: 0 }));
        document.getElementById('searchbartables').addEventListener('awesomplete-selectcomplete', function (e) {
          search('tables', true, null);
        });
      }));

    });

  }
  function notifyAutoFillComplete() {
    let window2 = remote.getGlobal('settingsWindow');

    if (window2) window2.webContents.send('update-autofill-complete');

  }
  return {
    updateAutoFillLists: updateAutoFillLists,
    notifyAutoFillComplete: notifyAutoFillComplete
  }

}()




/**
 * Encodes a string by shifting each letter by 2 in the alphabet.
 */

function shiftEncode(str, shiftAmount = 2) {
  var newString = "";
  var oldLetter;
  var newLetter;
  var newCharcode;
  for (var i = 0; i < str.length; i++) {
    oldLetter = str.charAt(i);
    if (oldLetter === " ") {
      newString += oldLetter;
      continue;
    }
    newCharcode = oldLetter.charCodeAt(0) + shiftAmount;
    if (newCharcode > 122) {
      var differ = newCharcode - 122;
      newCharcode = 96 + differ;
    }
    newLetter = String.fromCharCode(newCharcode);
    newString += newLetter;
  }
  return newString;
}


/**
 * Settings variables
 */
var settings;
function loadSettings() {

  dataAccess.getSettings(function (data) {
    settings = data;
    settings.maptool.currentMap = {};
    applySettings();
    loadParty();
  });
}

function hideAllPopups() {
  document.removeEventListener("click", hideAllPopups);
  document.querySelectorAll(".popup_menu").forEach(p => p.classList.add("hidden"))
}

function applySettings() {
  var enabled = settings.enable;
  var diceRollerE, randomizer, lootRoller, mapToolSyncBtn, mapToolBtn, saveRoller;
  diceRollerE = document.getElementById("diceRoller");

  randomzier = document.getElementById("randomizer");
  generatorBtn = document.getElementById("generators--button");
  mapToolBtn = document.getElementById("mapping--button");
  mapToolSyncBtn = document.getElementById("maptool_notify_button");
  lootRoller = document.getElementById("lootRoller");
  var mobcontroller_element = document.getElementById("mobcontroller_element")
  saveRoller = document.getElementById("saveRoller");

  if (!enabled.diceRoller) {
    diceRollerE.parentNode.classList.add("hidden");
  } else {
    diceRollerE.parentNode.classList.remove("hidden");
  }
  if (!enabled.saveRoller) {
    saveRoller.parentNode.classList.add("hidden");
  } else {
    saveRoller.parentNode.classList.remove("hidden");
  }
  if (!enabled.generator) {
    randomzier.parentNode.classList.add("hidden");
  } else {
    randomzier.parentNode.classList.remove("hidden");
  }
  if (!enabled.lootRoller) {
    lootRoller.parentNode.classList.add("hidden");
  } else {
    lootRoller.parentNode.classList.remove("hidden");
  }
  if (!enabled.mapTool) {
    mapToolSyncBtn.classList.add("hidden");
    mapToolBtn.classList.add("hidden");
  } else {
    mapToolSyncBtn.classList.remove("hidden");
    mapToolBtn.classList.remove("hidden");
  }
  if (!settings.maptool.syncToCombatPanel) {
    mapToolSyncBtn.classList.add("hidden");
  } else {
    mapToolSyncBtn.classList.remove("hidden");
  }
  if (enabled.mobController) {
    if (!mobController)
      mobController = new MobController(mobcontroller_element, diceRoller);
    mobcontroller_element.parentElement.classList.remove("hidden");
    document.getElementById("mobPanelLoadButton").classList.remove("hidden");
  } else {
    mobcontroller_element.parentElement.classList.add("hidden");
    document.getElementById("mobPanelLoadButton").classList.add("hidden");
  }
}



/**
 * Hleður party úr JSON. Uppfærir partyArray með nýjustu upplýsingum um virka spilara. 
 * Býr til Nodes fyrir AC og annað. 
 */
function loadParty() {
  console.log("Getting party")
  dataAccess.getParty(function (data) {
    partyArray = [];
    console.log("received ", data)
    partyInformationList = (data && data.partyInfo ? data.partyInfo : []);

    var members = data.members != null ? data.members : [];

    for (var i = 0; i < members.length; i++) {
      if (members[i].active) {
        partyArray.push(members[i]);

      }
    }

    partyArray.sort(function (a, b) {
      if (!a.sort_index) return -1;
      if (!b.sort_index) return 1;
      return a.sort_index - b.sort_index;
    })


    if (settings.playerPlaques) {
      partyAlternativeACArray = [];
      for (var i = 0; i < partyArray.size; i++) {
        partyAlternativeACArray.push(false);

      }
      if (partyArray.length == 0) {
        $(".pcnode:nth-child(1)").addClass("hidden");
      } else {
        $(".pcnode:nth-child(1)").removeClass("hidden");
      }

      var difference = partyArray.length - $(".pscontainer").children().length;
      if (difference > 0) {

        for (var i = 0; i < difference; i++) {
          $(".pcnode:nth-child(1)").clone().appendTo(".pscontainer");
        }
      } else if (difference < 0) {
        if (partyArray.length != 0) {
          $(".pcnode:nth-child(n+" + ($(".pscontainer").children().length + difference + 1) + ")").remove();
        } else {
          $(".pcnode").not(':nth-child(1)').remove();
        }
      }

      for (var i = 0; i < partyArray.length; i++) {
        var player = partyArray[i];
        $(".pcnode:nth-child(" + (i + 1) + ")").attr("data-pc_id", partyArray[i].id);
        $(".pcnode:nth-child(" + (i + 1) + ")").find("p").html(partyArray[i].character_name);
        $(".pcnode:nth-child(" + (i + 1) + ")").find(".pcnode_notes").html( !partyArray[i].notes ?  "No notes" : partyArray[i].notes);

        $(".pcnode:nth-child(" + (i + 1) + ")").find(".pcnode_color_bar")[0].style.backgroundColor = Util.hexToRGBA(partyArray[i].color, 0.4);
        $(".pcnode:nth-child(" + (i + 1) + ")").find(".acnode").val(partyArray[i].ac);
        $(".pcnode:nth-child(" + (i + 1) + ")").find(".pcnode__passiveperception>p").html(parseInt(partyArray[i].perception) + 10);
        if(player.darkvision){
          $(".pcnode:nth-child(" + (i + 1) + ")").find(".pcnode__darkvision").removeClass("hidden");
          $(".pcnode:nth-child(" + (i + 1) + ")").find(".pcnode__darkvision>p").html(partyArray[i].darkvision +" ft");
        }else{
          $(".pcnode:nth-child(" + (i + 1) + ")").find(".pcnode__darkvision").addClass("hidden");
        }
        
       
        if (partyArray[i].alternative_ac == "") {
          $(".pcnode:nth-child(" + (i + 1) + ")").find(".acspinner").css("display", "none");
        } else {
          $(".pcnode:nth-child(" + (i + 1) + ")").find(".acspinner").css("display", "block");
        }

      }

      initiative.refreshInputFields();
      loadPCNodeHandlers();
      $(".pscontainer").removeClass("hidden");
      $(".pscontainer").removeClass("hidden_takes_space");
    } else {
      $(".pscontainer").addClass("hidden");
    }
    combatLoader.notifyPartyArrayUpdated();

    let window2 = remote.getGlobal('maptoolWindow');
    if (window2) window2.webContents.send('notify-party-array-updated');
  });
}
function loadPCNodeHandlers() {
  [... document.querySelectorAll(".acspinner")].forEach(spinner=>{
    spinner.onclick = function(evt){
      var parent = evt.target.closest(".pcnode");
      var id = parent.getAttribute("data-pc_id");
      var index = 0, selectedPlayer;
      for( index = 0 ; index < partyArray.length ; index++){
        selectedPlayer = partyArray[index];
        if(selectedPlayer.id == id)break;
      }
      console.log(selectedPlayer)
      partyAlternativeACArray[index] = !partyAlternativeACArray[index];
      var acfield = parent.querySelector(".acnode");
      if (partyAlternativeACArray[index]) {
        acfield.value = (partyArray[index].alternative_ac);
      } else {
        acfield.value = (partyArray[index].ac);
      }
      acfield.classList.remove("pcnode_higher_ac");
      acfield.classList.remove("pcnode_lower_ac");
      acfield.classList.add("pcnode_normal_ac");

    }
  });


  $(".acnode").on('keyup input change paste focus-lost', function () {


    var parent =  $(this)[0].closest(".pcnode");
    var id = parent.getAttribute("data-pc_id");
    var index , selectedPlayer;
    for( index = 0 ; index < partyArray.length ; index++){
      selectedPlayer = partyArray[index];
      if(selectedPlayer.id == id)break;
    }
    var acIndex;
    if (partyAlternativeACArray[index]) {
      acIndex = "alternative_ac";
    } else {
      acIndex = "ac";
    }
    var acfield = $(this)[0];
    var higher = parseInt(acfield.value) > parseInt(partyArray[index][acIndex]);
    var equal = parseInt(acfield.value) === parseInt(partyArray[index][acIndex]);
    acfield.classList.remove("pcnode_higher_ac",  "pcnode_lower_ac", "pcnode_normal_ac");
    if (higher) {
      acfield.classList.add("pcnode_higher_ac");
    } else if (!equal) {
      acfield.classList.add("pcnode_lower_ac");
    } else {
      acfield.classList.add("pcnode_normal_ac");
    }



  });
}

function hideFrame(string) {
  if (string == "search") {
    document.getElementById("iframewrapper").style.display = "none";
  }

  return false;

}


function rollSaves() {
  var noRolls = parseInt($("#saveRollsNo").val());
  var dc = parseInt($("#saveRollsDc").val());
  var mod = parseInt($("#saveRollsMod").val());
  var results = 0;
  var advantage = document.querySelector("#saveRollsAdvantage").checked;
  var disadvantage = document.querySelector("#saveRollsDisadvantage").checked;
  if (isNaN(noRolls)) noRolls = 0;
  if (isNaN(dc)) dc = 0;
  if (isNaN(mod)) mod = 0;
  var roll;
  var totalSavesStringFailures = "Failed:";
  var totalSaveStringSuccessess = "Succeeded:"
  for (var i = 0; i < noRolls; i++) {
    if (advantage) {
      roll = Math.max(d(20), d(20));
    } else if (disadvantage) {
      roll = Math.min(d(20), d(20));

    } else {
      roll = d(20);
    }


    if ((mod + roll >= dc || roll == 20) && roll != 1) {
      results++;
      totalSaveStringSuccessess += (results == 1 ? "\n" : ", ") + (i + 1);

    } else {
      totalSavesStringFailures += ((i + 1) - results == 1 ? "\n" : ", ") + (i + 1);
    }
  }
  if (results == noRolls) totalSavesStringFailures += "\n None";
  if (results == 0) totalSaveStringSuccessess += "\n None";
  document.getElementById("saveRollResultsSuccess").setAttribute("data-tooltip", totalSaveStringSuccessess);
  document.getElementById("saveRollResultsFailures").setAttribute("data-tooltip", totalSavesStringFailures);

  $("#saveRollResultsSuccess").html(results);
  $("#saveRollResultsFailures").html(noRolls - results);

  $("#saveRollResultsSuccess").removeClass("warpColorsSuccess")
  $("#saveRollResultsFailures").removeClass("warpColorsFailures")
  // -> triggering reflow /* The actual magic */
  // without this it wouldn't work. Try uncommenting the line and the transition won't be retriggered.
  // Oops! This won't work in strict mode. Thanks Felis Phasma!
  // element.offsetWidth = element.offsetWidth;
  // Do this instead:
  void document.getElementById("saveRollResultsSuccess").offsetWidth;
  void document.getElementById("saveRollResultsFailures").offsetWidth;

  $("#saveRollResultsSuccess").addClass("warpColorsSuccess");
  $("#saveRollResultsFailures").addClass("warpColorsFailures");

  return false;
}






function addMob() {
  if (loadedMonster.name == null) {
    return false;
  }
  mobController.insert(loadedMonster);
}


var combatLoader = function () {
  var lastIndex = 0;
  var playerMouseUpIndexMax;
  var playerUpMouseIndex = -1;
  function loadCombat() {
    console.log(encounterIsLoaded, loadedEncounter);
    if (!encounterIsLoaded) {
      if (loadedMonster.name == null) {
        return false;
      }
      load(loadedMonster);
    } else {
      if (loadedEncounter.length == 0) {
        return false;
      }
      var count = 0;
      dataAccess.getHomebrewAndMonsters(data => {
        var numberOfCreatures = 0;
        for (var i = 0; i < loadedEncounter.length; i++) {
          numberOfCreatures = parseInt(loadedEncounter[i][1]);
          var name = loadedEncounter[i][0];
          var creature = data.find(x => x.name.toLowerCase() === name.toLowerCase());
          for (var j = 0; j < numberOfCreatures; j++) {
            load(creature);
          }
        }

        loadedEncounter = [];
      });
    }

    return false;
  }
  function countCreatures(creatureName) {
    var nameFields = document.getElementsByClassName("name_field");
    var cretCount = 0;
    for (var i = 0; i < nameFields.length; i++) {
      if (nameFields[i].value == creatureName && !nameFields[i].parentNode.classList.contains("hidden")) {
        cretCount++;
      }
    }
    return cretCount;
  }
  function popQueue(queue) {
    var outbound = [];
    while (queue.length > 0) {
      outbound.push(queue.pop());
    }
    return outbound;
  }

  function notifyPartyArrayUpdated() {
    playerMouseUpIndexMax = partyArray.length
    createAttackPcButtons();
  }

  function notifyMapTool() {
    if (loadedMonsterQueue.length == 0) return;
    let window2 = remote.getGlobal('maptoolWindow');
    if (window2) {
      window2.webContents.send("notify-map-tool-monsters-loaded", JSON.stringify(popQueue(loadedMonsterQueue)));
    } else {
      ipcRenderer.send("open-maptool-window");

      window.setTimeout(function () {
        window2 = remote.getGlobal('maptoolWindow');
        if (window2) window2.webContents.send("notify-map-tool-monsters-loaded", JSON.stringify(popQueue(loadedMonsterQueue)));
      }, 4000)
    }
  }

  function roll() {
    var buttons = document.getElementsByClassName("die_combatRoller");

    var rand;
    var mod;
    var ac;
    var advantage, disadvantage;
    var result;
    for (var i = 0; i < buttons.length; i++) {
      var row = buttons[i].parentNode;
      ac = parseInt(row.getElementsByClassName("code_ac")[0].value);
      if (ac != "") {
        mod = parseInt(row.getElementsByClassName("attack_field")[0].value) || 0;
        advantage = row.getElementsByClassName("combat_loader_advantage")[0].checked;
        disadvantage = row.getElementsByClassName("combat_loader_disadvantage")[0].checked;
        if (advantage) {
          rand = Math.max(d(20), d(20));
        } else if (disadvantage) {
          rand = Math.min(d(20), d(20));
        } else {
          rand = d(20);
        }

        var dmgField = row.getElementsByClassName("damage_field")[0];
        var formerText = dmgField.innerHTML;
        if (formerText.indexOf("=") >= 0) {
          dmgField.innerHTML =
            formerText.substring(0, formerText.indexOf("="));
        }
        if (rand == 20) {
          buttons[i].classList.remove("die_d20_normal");
          buttons[i].classList.remove("die_d20_hit");
          buttons[i].classList.add("die_d20_crit");
          result = "       = " + diceRoller.rollCritFromString(dmgField.innerHTML)
        } else if ((rand + mod) >= ac) {
          buttons[i].classList.remove("die_d20_normal");
          buttons[i].classList.remove("die_d20_crit");
          buttons[i].classList.add("die_d20_hit");
          result = "       = " + diceRoller.rollFromString(dmgField.innerHTML)
        } else {
          result = "";
          buttons[i].classList.add("die_d20_normal");
          buttons[i].classList.remove("die_d20_crit");
          buttons[i].classList.remove("die_d20_hit");

        }

        dmgField.innerHTML = dmgField.innerHTML + result;
        buttons[i].firstChild.data = rand;

      }

    }

    return false;
  }
  function rollForDamageSelectedRow() {
    var dmgField = selectedRow.parentNode.getElementsByClassName("damage_field")[0];
    var formerText = dmgField.innerHTML;

    if (formerText.indexOf("=") >= 0) {
      dmgField.innerHTML =
        formerText.substring(0, formerText.indexOf("="));
    }

    dmgField.innerHTML = dmgField.innerHTML + "       = " + diceRoller.rollFromString(dmgField.innerHTML);
  }


  function applyDmg() {
    var hp, name;
    var dmg, creatureDamage;
    var allRows = document.querySelectorAll("#combatMain .combatRow");
    var hpField, dmgField;


    for (var i = 0; i < allRows.length; i++) {
      hpField = allRows[i].getElementsByClassName("hp_field")[0];
      dmgField = allRows[i].getElementsByClassName("dmg_field")[0];
      creatureDamage = allRows[i].getElementsByClassName("damage_field")[0];
      name = allRows[i].getElementsByClassName("name_field")[0].value;
      dmg = dmgField.value;

      if (dmg == "") continue;

      hp = parseInt(hpField.value);
      dmg = parseInt(dmg);
      hp -= dmg;
      hpField.value = hp;
      if (dmg != 0) {

        var round = document.getElementById("round_counter_container").classList.contains("hidden") ? null : document.getElementsByClassName("roundcounter__value")[0].innerHTML;
        var logText = "";
        if (round != null)
          logText = "Round " + round + ": ";

        logText += (dmg > 0 ? "Damaged for " : "Healed for ") + Math.abs(dmg);
        addToCombatLog(allRows[i], logText);
      }
      healthChanged(["", allRows[i].getAttribute("data-dnd_monster_index")])
      dmgField.value = "";

    }
  }

  function revive(arr) {
    var allRows = document.querySelectorAll("#combatMain .combatRow");
    for (var i = 0; i < allRows.length; i++) {

      if (allRows[i].getAttribute("data-dnd_monster_index") != arr[1])
        continue;
      var row = allRows[i];
      var id = row.getAttribute("data-dnd_monster_id");
      return dataAccess.getHomebrewAndMonsters(data => {
        var currHp = parseInt(row.getElementsByClassName("hp_field")[0].value);
        row.getElementsByClassName("hp_field")[0].value = isNaN(currHp) || currHp <= 0 ? 1 : currHp;
        frameHistoryButtons.createButtonIfNotExists(data.find(x => x.id == id));
        row.classList.remove("hidden");
        addToCombatLog(row, "Revived");
      });
    }
  }
  function kill(arr) {
    var allRows = document.querySelectorAll("#combatMain .combatRow");
    for (var i = 0; i < allRows.length; i++) {
      var row = allRows[i];
      var monsterIndex = parseInt(row.getAttribute("data-dnd_monster_index"));
      if (monsterIndex != arr[1])
        continue;
      row.classList.add("hidden");
      row.setAttribute("data-dnd_conditions", "");
      initiative.removeLoadedMonsterInfo();
      if (loadedMonsterQueue.find(x => x.index == monsterIndex)) {
        loadedMonsterQueue.splice(loadedMonsterQueue.indexOf(x => x.index == monsterIndex), 1);
        loadedMonsterQueue.propertyChanged();
      }

      frameHistoryButtons.deleteButtonIfExists(row.getAttribute("data-dnd_monster_name"));
      return;
    }
  }

  function healthChanged(arr) {
    var allRows = document.querySelectorAll("#combatMain .combatRow");
    for (var i = 0; i < allRows.length; i++) {
      var row = allRows[i];
      var monsterIndex = parseInt(row.getAttribute("data-dnd_monster_index"));
      if (monsterIndex != arr[1])
        continue;

      var originalHp = row.getAttribute("data-dnd_original_hp");
      var currentHp = row.querySelector(".hp_field").value;
      var hpPercentage = parseInt(currentHp) / parseInt(originalHp);
      console.log("current: " + currentHp + " original " + originalHp);
      var isDead = currentHp <= 0;

      if (isDead)
        kill(arr, false)

      let window2 = remote.getGlobal('maptoolWindow');
      if (window2) window2.webContents.send('monster-health-changed', { index: monsterIndex, healthPercentage: hpPercentage, dead: isDead });
      return

    }
  }
  function loadDamageFieldHandlers() {
    var allFields = document.getElementsByClassName("damage_field");
    for (var i = 0; i < allFields.length; i++) {
      allFields[i].onclick = setDamageFieldNextAction
    }


  }
  function setDamageFieldNextAction(e) {
    var row = e.target.parentNode;
    var actions = JSON.parse(row.getAttribute("data-dnd_actions"));
    if (actions == null || actions.length == 0) return;
    var index = parseInt(row.getAttribute("data-dnd_current_action"))
    var tooltip = e.target.getAttribute("data-tooltip");
    var tooltipLines = tooltip.split("\n");
    var tooltipIndex = 0;
    for (var i = 0; i < tooltipLines.length; i++) {
      if (tooltipLines[i].substring(0, 1) == ">") {
        tooltipIndex = i;
        tooltipLines[i] = tooltipLines[i].substring(1);
        break;
      }
    }
    index++;
    tooltipIndex = 0;
    if (index == actions.length) index = 0;

    var nextAction = actions[index];

    if (actions.length > 1 && nextAction.name != null) {
      Util.showBubblyText("Switched to " + nextAction.name, { x: e.clientX, y: e.clientY }, true)
      row.getElementsByClassName("text_upper_damage_label")[0].innerHTML = nextAction.name;
    }
    var actionCompare = createActionString(nextAction)

    while (tooltipLines[tooltipIndex] != actionCompare) {
      tooltipIndex++;
      if (tooltipIndex == tooltipLines.length) break;
    }
    if (tooltipIndex < tooltipLines.length) {
      tooltipLines[tooltipIndex] = ">" + tooltipLines[tooltipIndex];
      row.getElementsByClassName("attack_field")[0].value = nextAction.attack_bonus;
      row.getElementsByClassName("damage_field")[0].innerHTML = nextAction.damage_string;
      row.setAttribute("data-dnd_current_action", index)

      e.target.setAttribute("data-tooltip", tooltipLines.join("\n"))
    }

  }
  function clearSelection() {
    while (selectedMultiselectFields.length > 0) {
      selectedMultiselectFields.pop().classList.remove("selected_field");
    }
  }

  function loadFieldHandlers() {
    loadACFieldHandlers();
    addApplyDamageOnEnterHandlers();
    loadAttackFieldOnEnterHandlers();
    loadDamageFieldHandlers();
  }




  function loadAttackFieldOnEnterHandlers() {
    var fields = [...document.querySelectorAll(".code_ac")]
    fields.forEach(field => {
      field.removeEventListener("keyup", attackOnEnter);
      field.addEventListener("keyup", attackOnEnter);
    })
    function attackOnEnter(event) {
      if (event.keyCode == 13)
        event.target.parentNode.getElementsByClassName("die_combatRoller ")[0].onclick();
    }
  }
  function addApplyDamageOnEnterHandlers() {
    var damageFields = [...document.querySelectorAll(".dmg_field")]
    damageFields.forEach(field => {
      field.removeEventListener("keyup", applyDamageOnEnter);
      field.addEventListener("keyup", applyDamageOnEnter);
    })
    function applyDamageOnEnter(event) {
      if (event.keyCode == 13)
        event.target.parentNode.getElementsByClassName("dmg_button")[0].onclick();
    }
  }
  var selectedMultiselectFields = [];
  function loadACFieldHandlers() {
    var fields = [...document.querySelectorAll(".code_ac")];
    fields.forEach(field => {
      field.onwheel = function (event) {
        if (event.deltaY > 0) {
          playerUpMouseIndex++;
          if (playerUpMouseIndex >= playerMouseUpIndexMax) {
            playerUpMouseIndex = 0;
          }
        } else {
          playerUpMouseIndex--;
          if (playerUpMouseIndex < 0) {
            playerUpMouseIndex = playerMouseUpIndexMax - 1;
          }
        }
        this.value = partyArray[playerUpMouseIndex].ac;
      };

      field.onkeydown = function (event) {

        if (event.which === 38) {
          playerUpMouseIndex++;
          if (playerUpMouseIndex >= playerMouseUpIndexMax) {
            playerUpMouseIndex = 0;
          }
          event.target.value = partyArray[playerUpMouseIndex].ac;
          return false;
        } else if (event.which === 40) {
          playerUpMouseIndex--;
          if (playerUpMouseIndex < 0) {
            playerUpMouseIndex = playerMouseUpIndexMax - 1;
          }
          event.target.value = partyArray[playerUpMouseIndex].ac;
          return false;
        }

      };

    });

    var multiSelectableFields = [...document.querySelectorAll(".multi_selectable_field_num")];
    multiSelectableFields.forEach(field => {
      field.onkeyup = function (event) {

        if (isNaN(parseInt(event.key))) return;
        var val = event.target.value;
        if (selectedMultiselectFields.length > 1) selectedMultiselectFields.forEach(field => { if (field != event.target) field.value = val });
      }

      field.onmousedown = function (event) {
        var alreadySelected;
        selectedMultiselectFields.forEach(field => { if (field == event.target) alreadySelected = true })
        if (alreadySelected) {
          selectedMultiselectFields = selectedMultiselectFields.filter(ele => ele != event.target);
          event.target.classList.remove("selected_field")
        } else {
          if (event.ctrlKey) {
            selectedMultiselectFields.push(event.target)
            event.target.classList.add("selected_field")
          } else {
            clearSelection();
          }
        }

      };
    });


  }

  function addRow() {
    lastIndex++;
    var newRow = $("#combat_loader_template").clone();
    newRow.attr("data-dnd_conditions", "");
    newRow.attr("data-dnd_monster_index", lastIndex);
    addLogPopupHandler(newRow[0]);
    newRow.appendTo("#combatMain");
    newRow.removeClass("hidden");
    loadFieldHandlers();
    return newRow[0];
  }

  function load(monster) {
    var row = addRow();
    var nameField, hpField, acField, attackField, damageField, damageLabel;
    nameField = row.getElementsByClassName("name_field")[0];
    hpField = row.getElementsByClassName("hp_field")[0];
    acField = row.getElementsByClassName("ac_field")[0];
    attackField = row.getElementsByClassName("attack_field")[0];
    damageField = row.getElementsByClassName("damage_field")[0];
    nameField.setAttribute("data-combat_log", "[\"Starting hit points are " + monster.hit_points + "\"]");
    damageLabel = row.getElementsByClassName("text_upper_damage_label")[0];

    //Validate
    if (!monster.size) monster.size = "medium";

    if (settings.enable.mapTool) {
      nameField.value = monster.name;
      row.setAttribute("data-dnd_monster_index", lastIndex);
      row.setAttribute("data-dnd_monster_name", monster.name);
      row.setAttribute("data-dnd_original_hp", monster.hit_points);
      row.setAttribute("data-dnd_monster_size", monster.size.toLowerCase());
      row.setAttribute("data-dnd_monster_id", monster.id);
    }
    hpField.value = monster.hit_points;
    acField.value = monster.armor_class;

    var actionsString = "";
    if (monster.actions != null) {
      monster.actions.sort(function (a, b) {
        if (a.name == null) return 1;
        if (b.name == null) return -1;
        if (a.name.toLowerCase() == "multiattack") return -1;
        if (b.name.toLowerCase() == "multiattack") return 1;
        if (a.damage_dice == null && b.damage_dice == null) return 0;
        if (a.damage_dice == null) return 1;
        if (b.damage_dice == null) return -1;
        return getNumValueForDiceString(b.damage_dice + (b.damage_bonus == null ? "" : "+ " + b.damage_bonus))
          - getNumValueForDiceString(a.damage_dice + (a.damage_bonus == null ? "" : "+ " + a.damage_bonus));
      });
      var attackActions = [];
      var actionPicked = false;
      for (var i = 0; i < monster.actions.length; i++) {
        if (i > 0) actionsString += "\n";
        var action = createActionString(monster.actions[i])

        var ele = JSON.parse(JSON.stringify(monster.actions[i]));
        if ((ele.damage_dice != null || ele.damage_bonus != null) && ele.attack_bonus != null) {
          ele.damage_string = (ele.damage_dice == null ?
            ele.damage_bonus == null ?
              "" : ele.damage_bonus :
            (monster.actions[i].damage_dice) + (monster.actions[i].damage_bonus == null ? "" : (monster.actions[i].damage_dice != null ? "+" : "") + monster.actions[i].damage_bonus));
          attackActions.push(ele)
          if (!actionPicked) {
            action = ">" + action;
            actionPicked = true;
          }
        }
        actionsString += action;
      }


      if (attackActions.length > 0) {
        attackField.value = attackActions[0].attack_bonus;
        damageField.innerHTML = attackActions[0].damage_string;
        damageLabel.innerHTML = attackActions[0].name;
        if (attackActions.length > 1) {
          damageField.setAttribute("data-tooltip", actionsString);
          damageField.classList.add("tooltipped")

        } else {
          damageField.classList.remove("tooltipped");
        }
      } else {
        attackField.value = "";
        damageField.innerHTML = "";
        damageLabel.innerHTML = "";
        damageField.classList.remove("tooltipped");
      }
      row.setAttribute("data-dnd_actions", JSON.stringify(attackActions));
      row.setAttribute("data-dnd_current_action", "0");

      damageField.classList.remove("label_inactive")
    }



    if (monster.name != "") {
      loadedMonsterQueue.push({ monsterId: monster.id, name: monster.name, hit_points: monster.hit_points, size: monster.size.toLowerCase(), index: lastIndex });
      initiative.addToLoadedMonsterInfo(monster.name, monster.data_extra_attributes.initiative)
      frameHistoryButtons.createButtonIfNotExists(monster);
    }
  }
  function createActionString(action) {
    return action.name + (action.attack_bonus == null ? " " : ": +" + action.attack_bonus + ", ")
      + (action.damage_dice == null ? "" : action.damage_dice) +
      (action.damage_bonus == null ? "" : (action.damage_dice != null ? "+" : "") + action.damage_bonus)
  }
  function clear() {
    $("#combatMain .combatRow").remove();
    lastIndex = 0;
    frameHistoryButtons.clearAll();
    initiative.clearLoadedMonsterInfo();
    loadedMonsterQueue.length = 0;
    loadedMonsterQueue.update();
    let window2 = remote.getGlobal('maptoolWindow');
    if (window2) window2.webContents.send('monster-list-cleared');
  }
  var selectedRow;
  function initialize() {
    loadedMonsterQueue.update = function () {
      var button = document.getElementById("maptool_notify_button");
      button.title = "Opens the map tool with loaded creatures.";
      if (loadedMonsterQueue.length == 0) {
        button.disabled = true;
        return;
      }
      button.disabled = false;
      var str = button.title;
      loadedMonsterQueue.forEach(x => str += "\n" + x.name);
      button.title = str;
    }
    addLogPopupHandler(document.querySelector(".combatRow"));
    dataAccess.getConditions(function (data) {
      var selectEle = document.getElementById("condition_list_dd");
      data.forEach(d => {
        var option = document.createElement("option");
        option.innerHTML = d.name;
        option.setAttribute("value", d.name.toLowerCase());
        selectEle.appendChild(option)
      });
      $("#condition_list_dd").chosen({
        width: "100%",
        placeholder_text_multiple: "Active conditions"
      });
    });
    $("#condition_list_dd").on("input", function (e) {
      if (selectedRow) {
        selectedRow.parentNode.setAttribute("data-dnd_conditions", $("#condition_list_dd").val().join(","));
        let window2 = remote.getGlobal('maptoolWindow');
        if (window2) window2.webContents.send('token-condition-added', $("#condition_list_dd").val(), selectedRow.parentNode.getAttribute("data-dnd_monster_index"));
      }

    });


  }
  var hpFieldDelay, lastHpFieldValue;
  function addLogPopupHandler(row) {
    document.querySelector("#combat_log_notes").addEventListener("keyup", function (e) {

      selectedRow.setAttribute("data-combat_log_notes", e.target.value);
    });
    row.querySelector(".name_field").onmousedown = function (e) {
      if (e.button != 0) return;

      if (selectedRow != e.target || document.querySelector("#combat_log_popup").classList.contains("hidden")) {

        selectedRow = e.target;
        showLog()
      } else {
        combatLoader.closeLog();
      }

      if (e.target.value == "") return;

    }

    row.querySelector(".hp_field").onfocus = function (e) {
      if (e.target.value == "") return;
      e.target.setAttribute("data-old_value", e.target.value);
    }
    row.querySelector(".hp_field").oninput = function (e) {
      window.clearTimeout(hpFieldDelay);
      hpFieldDelay = window.setTimeout(() => {
        var oldValue = e.target.getAttribute("data-old_value");
        if (oldValue == "") oldValue = 0;
        e.target.setAttribute("data-old_value", e.target.value);
        var newValue = parseInt(e.target.value);
        var diff = newValue - oldValue;

        if (diff == 0) return;
        var row = e.target.parentNode;

        var round = document.getElementById("round_counter_container").classList.contains("hidden") ? null : document.getElementsByClassName("roundcounter__value")[0].innerHTML;
        var logText = "";
        if (round != null)
          logText = "Round " + round + ": ";
        logText += (diff < 0 ? "Damaged for " : "Healed for ") + Math.abs(diff);
        addToCombatLog(row, logText)


      }, 600)

    }
  }

  function showLog() {
    if (!selectedRow || selectedRow.value == "") return;
    var conditions = selectedRow.parentNode.getAttribute("data-dnd_conditions");

    $("#condition_list_dd").val(conditions ? conditions.split(",") : "");
    var combatLog = selectedRow.getAttribute("data-combat_log");
    var notes = selectedRow.getAttribute("data-combat_log_notes") || "";
    document.querySelector("#combat_log_notes").value = notes;
    combatLog = combatLog == null ? [] : JSON.parse(combatLog);
    populateLogPopup(combatLog);

    $('#condition_list_dd').trigger('chosen:updated');
    selectedRow.parentNode.parentNode.insertBefore(document.querySelector('#combat_log_popup'), selectedRow.parentNode.nextSibling);
    document.querySelector("#combat_log_popup").classList.remove("hidden");


  }
  function addToCombatLog(row, thingyToAdd) {
    if (thingyToAdd == null) return;
    row = row.getElementsByClassName("name_field")[0];
    var log = row.getAttribute("data-combat_log");
    log = log == null || log == "" ? [] : JSON.parse(log);

    log.push(thingyToAdd);
    row.setAttribute("data-combat_log", JSON.stringify(log));
    if (row == selectedRow) {
      populateLogPopup(log);
    }

  }
  function populateLogPopup(logArray) {

    var content = document.querySelector(".combat_log_content");
    while (content.firstChild) {
      content.removeChild(content.firstChild)
    }
    var paragraphArray = [];
    while (logArray.length > 0) {
      var entry = logArray.pop();
      var newP = document.createElement("p");
      if (entry.indexOf("Revive") >= 0 || entry.indexOf("Healed") >= 0 || entry.indexOf("Starting") >= 0) {
        newP.classList.add("beneficial_log_item")
      } else {
        newP.classList.add("harmful_log_item")
      }
      newP.innerHTML = entry;
      content.appendChild(newP)
      paragraphArray.push(newP);
    }


  }

  function closeLog() {
    document.querySelector("#combat_log_popup").classList.add("hidden");
  }

  function createAttackPcButtons() {
    var cont = document.getElementById("attack_player_button_container");
    while (cont.firstChild)
      cont.removeChild(cont.firstChild);



    for (var i = 0; i < partyArray.length; i++) {
      if (!partyArray[i].active) continue;
      var button = document.createElement("button");
      button.setAttribute("data-party_index", i);
      button.classList.add("button_style");
      button.innerHTML = "Attack " + partyArray[i].character_name;
      button.onclick = function (e) {
        var index = parseInt(e.target.getAttribute("data-party_index"));
        var ac = partyAlternativeACArray[index] ? partyArray[index].alternative_ac : partyArray[index].ac;
        selectedRow.parentNode.getElementsByClassName("code_ac")[0].value = ac;
        if (selectedMultiselectFields.length > 0) {
          selectedMultiselectFields.forEach(field => field.value = ac);
        }
        selectedRow.parentNode.getElementsByClassName("die_d20")[0].click();
      }
      cont.appendChild(button);

    }
  }

  function setConditionList(row, conditionList) {

    row.setAttribute("data-dnd_conditions", conditionList.join(","));
    showLog();
  }
  return {
    createAttackPcButtons: createAttackPcButtons,
    setConditionList: setConditionList,
    showLog: showLog,
    closeLog: closeLog,
    roll: roll,
    rollForDamageSelectedRow: rollForDamageSelectedRow,
    countCreatures: countCreatures,
    applyDmg: applyDmg,
    load: load,
    loadCombat: loadCombat,
    clear: clear,
    addRow: addRow,
    loadFieldHandlers: loadFieldHandlers,
    notifyPartyArrayUpdated: notifyPartyArrayUpdated,
    notifyMapTool: notifyMapTool,
    revive: revive,
    kill: kill,
    clearSelection: clearSelection,
    setDamageFieldNextAction: setDamageFieldNextAction,
    initialize: initialize
  }

}();

var frameHistoryButtons = function () {
  function clearAll() {
    var buttons = document.getElementsByClassName("frame_history_button");
    buttons = [...buttons];
    while (buttons.length > 0) {
      var button = buttons.pop();
      button.parentNode.removeChild(button);
    }
  }
  function deleteButtonIfExists(creatureName) {
    var buttons = document.getElementsByClassName("frame_history_button");
    var cretCount = combatLoader.countCreatures(creatureName);

    if (cretCount > 0) return;
    for (var i = 0; i < buttons.length; i++) {
      if (buttons[i].innerHTML == creatureName) {
        buttons[i].parentNode.removeChild(buttons[i]);
        return;
      }
    }
  }
  function createButtonIfNotExists(creature) {
    var buttons = document.getElementsByClassName("frame_history_button");
    for (var i = 0; i < buttons.length; i++) {
      if (buttons[i].innerHTML == creature.name) return;
    }
    var newButton = document.createElement("button");
    newButton.innerHTML = creature.name;
    newButton.classList.add("button_style", "frame_history_button");
    newButton.setAttribute("toggleGroup", 4);
    newButton.setAttribute("data-monster_statblock", JSON.stringify(creature))
   
    newButton.onclick = function (event) {
      loadedMonster = JSON.parse(event.target.getAttribute("data-monster_statblock"));
      statblockPresenter.createStatblock(document.getElementById("statblock"), loadedMonster, "monsters", false)
      toggleThisButton(event.target);
    }
    document.getElementById("history_button_row").appendChild(newButton);
  }
  function unToggleButtonsExcept(targetName) {

    var buttons = document.getElementsByClassName("frame_history_button");
    if (buttons.length > 0) {
      for (var i = 0; i < buttons.length; i++) {
        buttons[i].classList.remove("frame_history_button_toggled")
      }
      for (var i = 0; i < buttons.length; i++) {
        if (buttons[i].innerHTML == targetName) {
          buttons[i].classList.add("frame_history_button_toggled");
          break;
        }
      }
    }

  }
  function toggleThisButton(button) {
    var buttons = document.getElementsByClassName("frame_history_button");
    if (buttons.length > 0) {
      for (var i = 0; i < buttons.length; i++) {
        buttons[i].classList.remove("frame_history_button_toggled")
      }
    }

    button.classList.add("frame_history_button_toggled");
  }

  function clickButtonNamed(targetName) {
    var buttons = document.getElementsByClassName("frame_history_button");
    console.log("Clicking " + targetName)
    for (var i = 0; i < buttons.length; i++) {
      if (buttons[i].innerHTML == targetName) {
        buttons[i].click();
        return;
      }
    }
  }

  return {
    deleteButtonIfExists: deleteButtonIfExists,
    createButtonIfNotExists: createButtonIfNotExists,
    unToggleButtonsExcept: unToggleButtonsExcept,
    clearAll: clearAll,
    clickButtonNamed: clickButtonNamed
  }
}();



var statblockStack = [];
var lastSearched;
function linkSearchFor(searchstring) {
  /*
    searchstring = searchstring.replace(/\.\.\//g, "");
    searchstring = searchstring.replace(/\-/g, " ");
    searchstring = searchstring.replace(/\//g, "");
  */
  search(lastSearched, true, searchstring, true)
  return false;
}
//Searchstring: String to search for
// fullMatch: boolean : whether the string should be fully matched or not.
// data: Dataset to look in, must contain attribute "name".
//combat: Whether the entity should be loaded into combat system.
function lookFor(searchstring, fullMatch, data, key, statblock) {
  for (var i = 0; i < data.length; i++) {
    if ((data[i].name.toLowerCase() == searchstring.toLowerCase() && fullMatch)
      || (data[i].name.toLowerCase().includes(searchstring.toLowerCase()) && !fullMatch)) {
      if (statblock != null) {
        foundMonster = data[i];
        statblockPresenter.createStatblock(document.getElementById("statblock"), foundMonster, statblockType, true)
        frameHistoryButtons.unToggleButtonsExcept(data[i].name);
      }

      if (key == "monsters") {
        $("#loaderButton").attr("title", "Load " + data[i].name + " into combat table. (ctrl + e)");
        loadedMonster = foundMonster;
        loadedMonster.data_extra_attributes = {};
        loadedMonster.data_extra_attributes.initiative = data[i].initiative ? data[i].initiative : getAbilityScoreModifier(data[i].dexterity);

        //Loada öll creatures.
      } else if (encounterIsLoaded) {
        loadEncounter(data[i])
      }
      document.getElementById("iframewrapper").style.display = "block";
      return true;
    }

  }
  return false;

}

function loadEncounter(encounterObject) {
  loadedEncounter = [];
  var creatures = encounterObject.creatures;
  var name;
  $("#loaderButton").attr("title", "Load " + encounterObject.name + " into combat table.");

  for (var i = 0; i < creatures.length; i++) {
    var name = Object.keys(creatures[i])[0];
    name = name.replace(/_/g, " ");

    loadedEncounter.push([name, Object.values(creatures[i])[0]]);

  }
}

function search(key, showStatblock, optionalSearchString, ignoreSearchInput) {
  var getFunction;
  switch (key) {
    case "monsters": getFunction = dataAccess.getMonsters;
      break;
    case "homebrew": getFunction = dataAccess.getHomebrewMonsters;
      break;
    case "encounters": getFunction = dataAccess.getEncounters;
      break;
    case "items": getFunction = dataAccess.getItems;
      break;
    case "spells": getFunction = dataAccess.getSpells;
      break;
    case "conditions": getFunction = dataAccess.getConditions;
      break;
    case "tables": getFunction = dataAccess.getTables;
      break;
    case "random_tables": getFunction = getRandomTablesForStatblock;
      break;
  }
  getFunction(function (data) {
    statblockType = key == "homebrew" ? "monsters" : key;
    if (key == "monsters" || key == "homebrew" || key == "encounters") {
      if (key != "encounters") {
        encounterIsLoaded = false;
      } else {
        encounterIsLoaded = true;
      }
      loadedMonster = {};
      var searchbox, searchstring;
      if (showStatblock) {
        searchbox = document.getElementById("searchbar");
        if (ignoreSearchInput) {
          searchstring = optionalSearchString;
        } else {
          searchstring = searchbox.value;
        }
        if (!searchstring) return;

      } else {
        searchstring = optionalSearchString;
      }
    } else {
      var searchbox = document.getElementById("searchbar" + key);
      var searchstring;
      if (ignoreSearchInput) {
        searchstring = optionalSearchString;
      } else {
        searchstring = searchbox.value.charAt(0).toUpperCase() + searchbox.value.slice(1);
      }
      if (!searchstring) return;
      encounterIsLoaded = false;
    }

    searchstring = searchstring.charAt(0).toUpperCase() + searchstring.slice(1);
    var found = false;
    var statblock = showStatblock ? $("#statblock") : null;

    //Look for full match
    found = lookFor(searchstring, true, data, statblockType, statblock);
    if (found == false) {
      //Look for partial match
      found = lookFor(searchstring, false, data, statblockType, statblock);

      if (found == false) {
        //Recursively look through homebrew
        if (key == "monsters") {
          return search("homebrew", showStatblock, searchstring, ignoreSearchInput);
        } else if (key == "homebrew") {
          return search("encounters", showStatblock, searchstring, ignoreSearchInput);
        } else if (key == "tables") {
          return search("random_tables", showStatblock, searchstring, true);
        } else {
          return false;
        }
      } else {
        lastSearched = key;

      }
    } else {
      lastSearched = key;
      if (key == "monsters" || key == "encounters" || key == "homebrew") {
        document.getElementById("loaderButton").classList.remove("hidden");
        if (settings.enable.mobController)
          document.getElementById("mobPanelLoadButton").classList.remove("hidden");
      } else {
        document.getElementById("loaderButton").classList.add("hidden");
        document.getElementById("mobPanelLoadButton").classList.add("hidden");
      }
    }
  });
  return false;
}

function getRandomTablesForStatblock(callback) {
  dataAccess.getRandomTables(randTables => {
    var randTables = randTables.tables;

    var data = [];
    var tblNames = Object.keys(randTables);
    for (var i = 0; i < tblNames.length; i++) {
      var tblObj = {
        title: getArrayFromObjectAttributes(randTables[tblNames[i]], "title"),
        content: getArrayFromObjectAttributes(randTables[tblNames[i]], "content"),
        followup_table: getArrayFromObjectAttributes(randTables[tblNames[i]], "followup_table")

      }
      data.push({ name: tblNames[i].deserialize(), table: tblObj })
    }

    callback(data);
    function getArrayFromObjectAttributes(objArr, attName) {
      var arr = [];
      objArr.forEach(entry => {
        arr.push(entry[attName])
      });
      return arr;
    }
  });
}

function addRemoveHandlersPopupPCStats() {
  $('[remove-parent]').off("click");
  //Add handler for remove buttons.
  $('[remove-parent]').on('click', function (e) {
    var pcId = e.target.parentNode.getAttribute("data-char_id");
    var charName = e.target.parentNode.getElementsByClassName("pc_input_character_name")[0].value;
    if (pcId == null || window.confirm("Delete " + charName + "?")) {
      jQuery(this).parent().remove();
    }
  });
}

function filterPcRowsBySelectedParty(isInitialLoad) {
  var pcRows = document.getElementsByClassName("pcRow");
  var pcInput = document.getElementById("active_party_input");
  var selectedParty = pcInput.value;

  settings.current_party = selectedParty;
  dataAccess.getSettings(function (data) {
    data.current_party = selectedParty;
    dataAccess.saveSettings(data);
  });

  [...pcRows].forEach(row => {
    var pcParty = row.getAttribute("data-pc_party");

    if (pcParty && pcParty == selectedParty || selectedParty.toLowerCase() == "any") {
      if (selectedParty.toLowerCase() != "any") {
        if (!isInitialLoad) row.getElementsByClassName("checkbox_party_menu")[0].checked = true;
      }
      row.classList.remove("hidden");
    } else {
      if (!isInitialLoad) row.getElementsByClassName("checkbox_party_menu")[0].checked = false;
      row.classList.add("hidden");
    }


  });
  $('.pcRow:visible:odd').css('background-color', 'rgba(194, 140, 29,0.4)');
  $('.pcRow:visible:even').css('background-color', 'transparent');
}

$(function () {
  //----- OPEN
  $('#party_stats_button').on('click', function (e) {

    $('#party_list_popup').fadeIn(350);

    fillPartyPopup()

    e.preventDefault();
  });

  //----- CLOSE
  $('[data-popup-close]').on('click', function (e) {
    var targeted_popup_class = jQuery(this).attr('data-popup-close');
    $('[data-popup="' + targeted_popup_class + '"]').fadeOut(350);
    //Clear pc stats
    saveParty();
    if (targeted_popup_class == $('#party_stats_button').attr('data-popup-open')) {
      $(".pcRow").not(':first').remove();
    }
    e.preventDefault();
  });
});

function addPlayerRow() {
  var row = $(".pcRow:nth-child(1)").clone();
  row.attr("data-char_id", null);
  row[0].getElementsByClassName("pc_input_character_token")[0].src = null;
  row.appendTo("#party--stats");

  var changePartyButton = row[0].getElementsByClassName("change_party_button")[0];
  changePartyButton.onclick = changePartyHandler;

  if (settings.current_party != "Any") {
    row.attr("data-pc_party", settings.current_party);
  } else {
    row.attr("data-pc_party", "");
    changePartyButton.classList.add("no_party_loaded");
  }

  [...row[0].getElementsByTagName("input")].forEach(input => input.value = "");
  row[0].getElementsByClassName("pc_input_player_name")[0].focus();
  row[0].classList.remove("hidden");

  addRemoveHandlersPopupPCStats();
  addColorPickerHandlers();

}

function addColorPickerHandlers() {
  var rows = document.querySelectorAll(".pc_input_background_color");
  rows.forEach(row => {
    row.onchange = function (evt) {
      console.log(evt.target.value)
    }
  });
}

function pickPlayerToken(evt) {
  var charId = evt.target.closest(".pcRow").getAttribute("data-char_id");

  var tokenPath = dialog.showOpenDialogSync(
    remote.getCurrentWindow(), {
    properties: ['openFile'],
    message: "Choose picture location",
    filters: [{ name: 'Images', extensions: ['jpg', 'png', 'gif'] }]
  });
  if (tokenPath == null)
    return;
  tokenPath = tokenPath[0];
  dataAccess.saveToken(charId, tokenPath);
  evt.target.setAttribute("src", tokenPath);
}

function fillPartyPopup() {
  $(".pcRow").not(':first').remove();  //Clear html to default
  dataAccess.getParty(function (data) {
    var members = (data && data.members ? data.members : []);
    var parties = ["Any"];
    partyInformationList.parties = [];
    $(".pcRow").attr("data-char_id", null);
    for (var i = 0; i < members.length - 1; i++)
      $(".pcRow:nth-child(1)").clone().appendTo("#party--stats");

    var tokenPhotos = document.getElementsByClassName("pc_input_character_token");
    [...tokenPhotos].forEach(token => token.onclick = pickPlayerToken);
    var allRows = [...document.getElementsByClassName("pcRow")];
    var index = 0;
    if (members.length > 0) {
      allRows.forEach(row => {
        ["player_name", "character_name", "dexterity",
          "perception", "level", "ac", "alternative_ac", "darkvision", "notes"].forEach(field => {
            row.getElementsByClassName("pc_input_" + field)[0].value = members[index][field];

          });
        var token = dataAccess.getTokenPath(members[index].id);

        row.getElementsByClassName("pc_input_character_token")[0].setAttribute("src", token);
        if (members[index].party && parties.indexOf(members[index].party) < 0) {

          partyInformationList.parties.push(members[index].party)
          parties.push(members[index].party)
        } else if (!members[index].party) {
          row.getElementsByClassName("change_party_button")[0].classList.add("no_party_loaded");
        }
        row.setAttribute("data-pc_party", members[index].party);
        row.setAttribute("data-char_id", members[index].id);
        row.getElementsByClassName("checkbox_party_menu")[0].checked = members[index].active;
        row.querySelector(".pc_input_background_color").value = members[index].color;
        index++;
      });
    }

    addRemoveHandlersPopupPCStats();
    addColorPickerHandlers();
    var pcInput = document.getElementById("active_party_input");
    pcInput.value = settings.current_party ? settings.current_party : "Any";
    if (partyInputAwesomeplete)
      partyInputAwesomeplete.destroy();
    partyInputAwesomeplete = new Awesomplete(pcInput, { list: parties, autoFirst: true, minChars: 0 });
    filterPcRowsBySelectedParty(true);
    var changePartyButtons = [...document.getElementsByClassName("change_party_button")];
    changePartyButtons.forEach(button => {
      button.onclick = changePartyHandler;
    });

  }
  );
}

function hideAllFloatingInputs() {
  var floats = document.getElementsByClassName("floating_input");
  [...floats].forEach(fl => {
    if (fl.awesomplete) fl.awesomplete.destroy();
    if (fl.parentNode) fl.parentNode.removeChild(fl);
  })
}

function changePartyHandler(evt) {
  var newInp = document.createElement("input");
  var newDiv = document.createElement("div");
  newInp.placeholder = "Party name"
  newDiv.classList.add("floating_input");
  newDiv.appendChild(newInp)
  newInp.classList.add("brown_input");
  document.body.appendChild(newDiv);


  newInp.awesomplete = new Awesomplete(newInp, { list: partyInformationList.parties, autoFirst: true, minChars: 0 });
  newInp.addEventListener('awesomplete-selectcomplete', (e) => {
    changePartyHandlerHelper(evt);

  });
  newInp.focus();
  newInp.addEventListener("keydown", e => {
    if (e.keyCode == 13) {
      changePartyHandlerHelper(evt);
    }

  });
  var mouseLeaveTimer;
  newInp.onfocus = (e => {
    window.clearTimeout(mouseLeaveTimer);
  });
  newInp.onfocusout = (e => {

    mouseLeaveTimer = window.setTimeout(() => {
      $(".floating_input").fadeOut(400);
      mouseLeaveTimer = window.setTimeout(() => hideAllFloatingInputs(), 400)

    }, 600);
  });

  newDiv.style.left = evt.clientX - newDiv.clientWidth / 2 + "px";
  newDiv.style.top = evt.clientY - newDiv.clientHeight / 2 + "px";


  function changePartyHandlerHelper(evt) {
    evt.target.parentNode.setAttribute("data-pc_party", newInp.value);
    if (partyInformationList.parties.indexOf(newInp.value) < 0) {
      partyInformationList.parties.push(newInp.value)
      if (partyInputAwesomeplete)
        partyInputAwesomeplete.destroy();
      var parties = [...partyInformationList.parties];
      parties.push("Any");
      partyInputAwesomeplete = new Awesomplete(document.getElementById("active_party_input"), { list: parties, autoFirst: true, minChars: 0 });
    }

    evt.target.parentNode.getElementsByClassName("change_party_button")[0].classList.remove("no_party_loaded");
    saveParty();
    var currentParty = document.querySelector("#active_party_input").value;
    if (currentParty != "Any" && currentParty != "" && currentParty != newInp.value.value) {
      evt.target.parentNode.classList.add("hidden");
    }
    hideAllFloatingInputs()
  }
}

function getRandomTableEntry(event) {
  [...document.getElementsByClassName("randomly_chosen_table_row")].forEach(row => row.classList.remove("randomly_chosen_table_row"));
  var allRows = document.getElementById("statblock").querySelectorAll("tbody>tr");
  pickOne(allRows).classList.add("randomly_chosen_table_row");
  $(".main_content_wrapper").animate({
    scrollTop: $(".randomly_chosen_table_row").offset().top - 20
  }, 600);
}

function savePcToJson() {

  saveParty(true);

}
function saveParty(showWarnings) {

  var allRows = document.getElementsByClassName("pcRow");

  var tempArr = [];
  var pcObject;
  [...allRows].forEach(row => {
    if (row.getElementsByClassName("pc_input_character_name")[0].value == "") {
      if (!showWarnings) return;
      row.getElementsByClassName("pc_input_character_name")[0].classList.add("required_field");
      if (row.getAttribute("data-pc_party") != document.getElementById("active_party_input").value) {
        document.getElementById("active_party_input").value = "Any";
        filterPcRowsBySelectedParty();
      }

      window.setTimeout(function () {
        row.getElementsByClassName("pc_input_character_name")[0].classList.remove("required_field");
      }, 3000)
      return;
    }
    pcObject = {};

    ["player_name", "character_name", "dexterity",
      "perception", "level", "ac", "alternative_ac", "darkvision", "notes"].forEach(field => {
        pcObject[field] = row.getElementsByClassName("pc_input_" + field)[0].value;
      })
    pcObject.active = row.getElementsByClassName("checkbox_party_menu")[0].checked;
    var pcColor =
      pcObject.color = row.querySelector(".pc_input_background_color").value;
    pcObject.party = row.getAttribute("data-pc_party");
    if (parseInt(pcObject.level) <= 0) pcObject.level = "1";
    tempArr.push(pcObject);
    var charId = row.getAttribute("data-char_id");
    if (!charId)
      charId = uniqueID();

    pcObject.id = charId;
  });
  if (tempArr.length < allRows.length) return;
  partyArray = tempArr;
  partyArray.sort(function (a, b) {
    if (a.player_name > b.player_name) return 1;
    if (b.player_name > a.player_name) return -1;
    return 0;
  })

  var obj = { "members": partyArray, partyInfo: partyInformationList }
  console.log("Saving party ", obj)
  $('[data-popup="' + "popup-1" + '"]').fadeOut(350);
  dataAccess.setParty(obj, function (data) {
    loadParty();
  });
}


function randomizeLoot() {
  var randint = d(100);
  var cr = parseInt($("#lootcr").val());
  var amount;
  var currency;
  if (!isNaN(cr)) {
    if (cr <= 4) {
      if (randint <= 30) {
        currency = "Copper";
        amount = dice(6, 5);

      } else if (randint <= 60) {
        currency = "Silver";
        amount = dice(6, 4);

      } else if (randint <= 70) {
        currency = "Electrum";
        amount = dice(6, 3);

      } else if (randint <= 95) {
        currency = "Gold";
        amount = dice(6, 3);
      } else {
        currency = "Platinum";
        amount = d(6);
      }

    } else if (cr <= 10) {
      if (randint <= 30) {
        currency = "Electrum ";
        amount = 2 * dice(6, 4) + d(6) * 10;
      } else if (randint <= 60) {
        currency = "Gold";
        amount = dice(6, 6) + dice(6, 2) * 10;
      } else if (randint <= 70) {
        currency = "Gold";
        amount = dice(6, 3) * 5 + dice(6, 2) * 10;
      } else if (randint <= 95) {
        currency = "Gold";
        amount = dice(6, 4) * 10;
      } else {
        currency = "Platinum";
        amount = d(6) * 10 + dice(6, 2);
      }
    } else if (cr <= 16) {
      if (randint <= 20) {
        currency = "Gold ";
        amount = 10 * dice(6, 4) + d(6) * 100;
      } else if (randint <= 35) {
        currency = "Gold";
        amount = d(6) * 150;
      } else if (randint <= 75) {
        currency = "Platinum";
        amount = dice(6, 4) * 10;
      } else {
        currency = "Platinum";
        amount = dice(6, 4) * 10;
      }
    } else {
      if (randint <= 15) {
        currency = "Gold ";
        amount = 500 * dice(6, 2) + dice(6, 8) * 100;
      } else if (randint <= 55) {
        currency = "Platinum";
        amount = d(6) * 200;
      } else {
        currency = "Platinum";
        amount = dice(6, 3) * 300
      }
    }
    $("#lootValue").val(amount + " " + currency);
  }
  return false;
}

function getNumValueForDiceString(diceStr) {
  var sum = 0;
  var plusFields = diceStr.split("+");
  var diceFields;
  for (var i = 0; i < plusFields.length; i++) {
    diceFields = plusFields[i].split(/[d,D]/);
    if (diceFields.length == 0) continue;
    if (diceFields.length % 2 == 0) {
      sum += parseInt(diceFields[0]) * expectedValueOfDice(parseInt(diceFields[1]));
    } else {
      sum += parseInt(diceFields[0]);
    }

  }
  return sum;
}

function expectedValueOfDice(diceSides) {
  return (diceSides * (diceSides + 1) / 2) / diceSides
}

function observeArrayChanges(arr, raiseChanged) {
  arr.push = function () { Array.prototype.push.apply(this, arguments); raiseChanged(); }
  arr.pop = function () { var ret = Array.prototype.pop.apply(this, arguments); raiseChanged(); return ret; }
  arr.propertyChanged = raiseChanged;
}


function advantageCheckboxChanged(e) {

  var parentRow = e.target.closest(".checkbox_row");
  var disadvCheckbox = parentRow.querySelector(".combat_loader_disadvantage");
  if (disadvCheckbox.checked) disadvCheckbox.checked = !e.target.checked;
}

function disadvantageCheckboxChanged(e) {

  var parentRow = e.target.closest(".checkbox_row");
  var advCheckbox = parentRow.querySelector(".combat_loader_advantage")
  if (advCheckbox.checked) advCheckbox.checked = false;
}

