


var loadedMonster = {};
var loadedMonsterQueue = [];

var loadedEncounter = [];

const marked = require('marked');
const dataAccess = require("./js/dataaccess");
const initiative = require("./js/initiative")
const DnDBeyondImporter = require("./js/DnDBeyondImporter");

const CharacterSyncer = require("./js/characterSyncer");
const Modals = require("./js/modals")
const ThemeManager = require("./js/themeManager");
const fs = require("fs");
const StatblockPresenter = require("./js/statblockpresenter");
const { ipcRenderer } = require('electron');

const icon = window.api.getAppPath().replaceAll("\\", "/") + "/app/css/img/icon.png";
const customStylesheet = window.api.getAppPath().replaceAll("\\", "/") + "/app/css/prompt.css";
// const prompt = require('electron-prompt');
const uniqueID = require('uniqid');
const NotePad = require('./js/notepad/notepad');

const charSyncers = [];


marked.setOptions({
  renderer: new marked.Renderer(),

});
dataAccess.initialize();


const encounterModule = new EncounterModule();
const dndBeyondImporter = new DnDBeyondImporter();
var mobController, notePad;

var encounterIsLoaded;

var partyArray, partyInformationList, partyInputAwesomeplete, conditionList;
var partyAlternativeACArray;
var NOTEPAD_AUTOSAVE;
/* #region IPC */

ipcRenderer.on('update-all-pawns', function () {
  combatLoader.sendMapToolUpdates();
});

ipcRenderer.on('update_available', function () {
  console.log("Update available");
});

ipcRenderer.on('update_downloaded', function () {
  console.log("Update downloaded");
});

ipcRenderer.on('update-autofill', function () {

  autofill.updateAutoFillLists(true);

});
ipcRenderer.on('notify-maptool-selection-changed', function (evt, args) {
  combatLoader.setSelectedRows(args.selected);
});
function notifyMapToolConditionsChanged(index, conditions, isPlayer) {

  window.api.messageWindow('maptoolWindow', 'condition-list-changed', { index: index, conditions: conditions, isPlayer: isPlayer });
}

ipcRenderer.on('condition-list-changed', function (evt, args) {

  var conditionList = args.conditionList;
  var index = args.index;
  var combatRow = [...document.querySelectorAll("#combatMain .combatRow")].filter(x => parseInt(x.querySelector(".combat_row_monster_id").innerHTML) == index)[0];
  if (combatRow) {
    combatLoader.setConditionList(combatRow, conditionList.map(x => { return { condition: x.toLowerCase() } }));
  } else {
    //Is player
    var pcNode = [...document.querySelectorAll(".pcnode_name>p")].filter(x => x.innerHTML == index)[0];
    if (pcNode) {
      setPcNodeConditions(pcNode.parentNode, conditionList, true);
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
    var index = allRows[i].querySelector(".combat_row_monster_id").innerHTML;
    var size = allRows[i].getAttribute("data-dnd_monster_size");
    var monsterId = allRows[i].getAttribute("data-dnd_monster_id");
    if (name == "" || allRows[i].classList.contains("hidden"))
      continue;


    loadedMonsterQueue.push({ monsterId: monsterId, name: name, size: size, index: index });

  }
  loadedMonsterQueue.update();
  if (mobController)
    mobController.mapToolInitialized();

});

ipcRenderer.on('ipc-log', function (evt, arg) {
  console.log(evt, arg);

});

ipcRenderer.on('settings-changed', function (evt, arg) {
  console.log("Settings changed, applying...");
  loadSettings();
});

ipcRenderer.on('monster-killed', function (evt, arg) {
  combatLoader.kill(arg[1], true);
});

/* #endregion */
document.addEventListener("DOMContentLoaded", function () {

  loadSettings();
  observeArrayChanges(loadedMonsterQueue, function () {
    loadedMonsterQueue.update();
  });

  document.querySelector(".combat_toolbar .sort_by_initiative").onclick = () => combatLoader.orderBy("init")
  document.querySelector(".combat_toolbar .sort_by_hit_points").onclick = () => combatLoader.orderBy("hp")
  document.querySelector(".combat_toolbar .sort_by_name").onclick = () => combatLoader.orderBy("name")
  document.querySelector(".combat_toolbar .sort_by_number").onclick = () => combatLoader.orderBy("id")

  document.getElementById("combatMain").addEventListener("mousedown", function (evt) {
    if (evt.button == 2) {
      showPopup("popup_menu_combatrow", evt)
    }
  });
  randomizer.initialize();
  window.setTimeout(() => {
    window.api.messageWindow("maptoolWindow", 'notify-main-reloaded');
  }, 1000)

  combatLoader.initialize();
  $('.initiativeNode').on("click", initiative.roll);
  initiative.setAsMain();
  initiative.addEventListener(evt => {
    window.api.messageWindow("maptoolWindow", 'intiative-updated', evt);
    var actor = initiative.currentActor();
    combatLoader.setCurrentActor(actor?.current.name);
  });
  document.querySelectorAll("#initiative_control_bar button").forEach(button => {
    button.addEventListener("click", function () {
      document.querySelector("#initiative_control_bar").classList.add("hidden");
    })
  });

  document.querySelector(".pcnode:nth-child(1)").onmousedown = pcNodeMouseDownHandler;
  dataAccess.getConditions(function (conditions) {
    var pcNodeInp = document.getElementById("add_pc_node_condition_input");
    new Awesomplete(pcNodeInp, { list: conditions.map(x => x.name), minChars: 0, autoFirst: true });
    pcNodeInp.addEventListener('awesomplete-selectcomplete', function (e) {

      addPcNodeCondition(selectedPcNode, e.text.value);
      document.getElementById("add_pc_node_condition_input").classList.add("hidden");
      hidePcNodePopup();
    });
  });

  combatLoader.loadFieldHandlers();
  diceRoller.loadHandlers();
  autofill.updateAutoFillLists();
  document.getElementById("lootcr").oninput = function () { randomizeLoot(); }
  document.getElementById("lootcr").onkeydown = function (evt) { if (evt.key == "Enter") randomizeLoot() }
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
    } else if (e.key.toLowerCase() == "e" && e.ctrlKey) {

      if (loadedMonster) combatLoader.loadCombat()
    } else if (e.key.toLowerCase() == "i" && e.altKey) {

      initiative.roll();
    } else if (e.key.toLowerCase() == "d" && e.ctrlKey) {
      addMob();
    }
  });
  document.addEventListener("click", function (e) {
    if (!e.target.classList.contains("multi_selectable_field_num")) {
      combatLoader.clearSelection();
    }
  });

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
  //designTimeAndDebug();
});

function designTimeAndDebug() {
  //
  search("monsters", true, "aboleth", true);

}

function setPcNodeConditions(pcNode, conditionList, originMapTool = false) {
  clearPcNodeConditions(pcNode);
  conditionList.forEach(cond => addPcNodeCondition(pcNode, cond));
  if (!originMapTool) {
    notifyMapToolConditionsChanged(pcNode.querySelector(".pcnode_name>p").innerHTML, conditionList, true)
  }
}

function advantageCheckboxChanged(event) {
  var parent = event.target.closest(".combatRow");
  if (event.target.classList.contains("combat_loader_disadvantage") && event.target.checked) {
    parent.querySelector(".combat_loader_advantage").checked = false;
  } else if (event.target.classList.contains("combat_loader_advantage") && event.target.checked) {
    parent.querySelector(".combat_loader_disadvantage").checked = false;
  }
}

function addPcNodeCondition(node, condition, originMapTool = false) {
  if (!condition) return;


  var condList = node.getAttribute("data-dnd_conditions") ? node.getAttribute("data-dnd_conditions").split(",") : [];
  if (condList.includes(condition))
    return;
  condList.push(condition);

  if (!originMapTool)
    notifyMapToolConditionsChanged(node.querySelector(".pcnode_name>p").innerHTML, condList, true);
  node.setAttribute("data-dnd_conditions", condList.join(","))
  var container = node.querySelector(".pcNode_condition_container");
  var newDiv = createConditionBubble(condition);
  newDiv.onclick = function (e) {

    var conditionList = node.getAttribute("data-dnd_conditions")?.split(",") || [];
    var removed = newDiv.getAttribute("data-condition");
    conditionList = conditionList.filter(x => x != removed);
    node.setAttribute("data-dnd_conditions", conditionList.join(","));
    notifyMapToolConditionsChanged(node.querySelector(".pcnode_name>p").innerHTML, conditionList, true);
    newDiv.parentNode.removeChild(newDiv);
  }
  container.appendChild(newDiv);
}

function createConditionBubble(condition, causedByText) {

  var newDiv = document.createElement("div");
  var para = document.createElement("p");
  newDiv.setAttribute("data-condition", condition);
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
  para.innerHTML = marked("## " + conditionObj.name + (causedByText ? `\nCaused by: ${causedByText}` : "") + (conditionObj.description ? "\n" + conditionObj.description : ""));
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
  return newDiv;
}

function clearPcNodeConditions(pcNode) {

  var eles = [...pcNode.getElementsByClassName("condition_effect")];
  pcNode.setAttribute("data-dnd_conditions", "")
  eles.forEach(element => {
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
        arr.push([i.name.toProperCase() + " - cr " + i.challenge_rating + " (mm)", i.name]);
      });

      dataAccess.getHomebrewMonsters(function (hbdata) {
        hbdata.forEach(function (i) {
          arr.push([i.name.toProperCase() + " - cr " + i.challenge_rating + (i.source ? " " + i.source.toUpperCase() + " " : null || " (hb)"), i.name]);
        });
        dataAccess.getEncounters(function (endata) {
          endata.forEach(function (i) {
            arr.push(["Encounter: " + i.name.toProperCase(), i.name]);
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
        arr.push(i.name.toProperCase());
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
        arr.push(i.name.toProperCase());
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
        arr.push([i.name.toProperCase() + " - " + i.level, i.name]);

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
        arr.push([i.name.toProperCase(), i.name]);
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
    window.api.messageWindow('databaseWindow', 'update-autofill-complete');

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

function loadScratchPad() {
  if (notePad) return;
  dataAccess.getScratchPad(data => {

    notePad = new NotePad(data, false, null);
    document.getElementById("notebook_container").appendChild(notePad.container());
    notePad.render();
    notePad.onChange((delta, oldDelta, source) => {
      window.clearTimeout(NOTEPAD_AUTOSAVE);
      NOTEPAD_AUTOSAVE = window.setTimeout(() => {
        dataAccess.setScratchPad(notePad.getContents())
      }, 1500);
    });
  });
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
    loadScratchPad();

  });
}

function hideAllPopups(evt) {
  if (evt && evt.target.closest(".popup_menu"))
    return;
  document.removeEventListener("click", hideAllPopups);
  hidePcNodePopup();
  [...document.querySelectorAll(".popup_menu")].filter(p => !p.getAttribute("data-persist_popup")).forEach(p => p.classList.add("hidden"))
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
  if (!settings.countRounds) {
    document.querySelector(".combat_toolbar .sort_by_initiative").classList.add("hidden");
  } else {
    document.querySelector(".combat_toolbar .sort_by_initiative").classList.remove("hidden");
  }
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
  var header = document.querySelector(".mainpage_header");
  var initCont = document.querySelector(".initiative");
  if (settings.coverImagePath) {
    header.classList.add("extra_fat_header");
    initCont.classList.add("initative_has_cover_image");
    header.style.backgroundImage = Util.cssify(settings.coverImagePath.path);
  } else {
    header.classList.remove("extra_fat_header");
    initCont.classList.remove("initative_has_cover_image");

  }
}


function loadParty() {
  console.log("Getting party")
  charSyncers.forEach(x => x.destroy());
  charSyncers.length = 0;

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
      addPlayerPlaques();
    } else {
      $(".pscontainer").addClass("hidden");
    }
    combatLoader.notifyPartyArrayUpdated();
    window.api.messageWindow("maptoolWindow", 'notify-party-array-updated');
  });
}

function showPopup(id, evt) {
  console.log("Show popup")
  var menu = document.querySelector(`#${id}`);
  menu.classList.remove("hidden");

  var scrollDistY = document.querySelector(".main_content_wrapper").scrollTop;
  menu.style.top = evt.clientY + scrollDistY + "px";
  menu.style.left = evt.clientX + "px";
  document.addEventListener("click", hideAllPopups);
}
var selectedPcNode;
function pcNodeMouseDownHandler(evt) {
  if (evt.button == 2) //mouse left
  {
    hideAllPopups();
    showPopup("popup_menu_players", evt);
    selectedPcNode = evt.target.closest(".pcnode");

  }
}

function hidePcNodePopup() {
  var menu = document.querySelector("#popup_menu_players");
  menu.classList.add("hidden");
  document.getElementById("add_pc_node_condition_input").value = "";
  document.getElementById("add_pc_node_condition_btn").classList.remove("hidden");
  document.getElementById("add_pc_node_condition_input").classList.add("hidden");
}

function addPlayerCondition() {
  var pcNodeInp = document.getElementById("add_pc_node_condition_input");
  document.getElementById("add_pc_node_condition_btn").classList.add("hidden");
  pcNodeInp.classList.remove("hidden");
  pcNodeInp.focus();
}

function clearPlayerConditions() {
  clearPcNodeConditions(selectedPcNode);
  hidePcNodePopup();
}

function addPlayerPlaques() {
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
      var cloned = $(".pcnode:nth-child(1)").clone();
      cloned.appendTo(".pscontainer");
      cloned[0].onmousedown = pcNodeMouseDownHandler;
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

    var node = $(".pcnode:nth-child(" + (i + 1) + ")");

    node.attr("data-pc_id", partyArray[i].id);
    node.find("p").html(partyArray[i].character_name);
    node.find(".pcnode_notes").html(!partyArray[i].notes ? "No notes" : partyArray[i].notes);

    node.find(".pcnode_color_bar")[0].style.backgroundColor = Util.hexToRGBA(partyArray[i].color, 0.4);
    node.find(".acnode").val(partyArray[i].ac);
    node.find(".pcnode__passiveperception>p").html(parseInt(partyArray[i].perception) + 10);
    if (player.darkvision) {
      node.find(".pcnode__darkvision").removeClass("hidden");
      node.find(".pcnode__darkvision>p").html(partyArray[i].darkvision + " ft");
    } else {
      node.find(".pcnode__darkvision").addClass("hidden");
    }

    if (partyArray[i].alternative_ac == "") {
      node.find(".acspinner").css("display", "none");
    } else {
      node.find(".acspinner").css("display", "block");
    }
    if (player.external_source) {
      charSyncers.push(new CharacterSyncer(player.external_source.url, node[0], dndBeyondImporter))
    }

  }

  loadPCNodeHandlers();
  $(".pscontainer").removeClass("hidden");
  $(".pscontainer").removeClass("hidden_takes_space");
}
function loadPCNodeHandlers() {
  [...document.querySelectorAll(".acspinner")].forEach(spinner => {
    spinner.onclick = function (evt) {
      var parent = evt.target.closest(".pcnode");
      var id = parent.getAttribute("data-pc_id");
      var index = 0, selectedPlayer;
      for (index = 0; index < partyArray.length; index++) {
        selectedPlayer = partyArray[index];
        if (selectedPlayer.id == id) break;
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
    var parent = $(this)[0].closest(".pcnode");
    var id = parent.getAttribute("data-pc_id");
    var index, selectedPlayer;
    for (index = 0; index < partyArray.length; index++) {
      selectedPlayer = partyArray[index];
      if (selectedPlayer.id == id) break;
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
    acfield.classList.remove("pcnode_higher_ac", "pcnode_lower_ac", "pcnode_normal_ac");
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
      new StatblockPresenter(document.getElementById("statblock"), loadedMonster, "monsters", false)
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
        new StatblockPresenter(document.getElementById("statblock"), foundMonster, statblockType, true)
        frameHistoryButtons.unToggleButtonsExcept(data[i].name);
        hideOrShowStatblockButtons();
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
  function hideOrShowStatblockButtons() {
    document.getElementById("loaderButton").classList.add("hidden");
    document.getElementById("mobPanelLoadButton").classList.add("hidden");
    if (key == "monsters" || key == "encounters" || key == "homebrew") {
      document.getElementById("loaderButton").classList.remove("hidden");
      if (settings.enable.mobController && key != "encounters") {
        console.log(key)
        document.getElementById("mobPanelLoadButton").classList.remove("hidden");
      }

    }
  }
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
    case "monsters": getFunction = dataAccess.getHomebrewAndMonsters;
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
    statblockType = key;
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
  var emphasisColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--alt-emphasis-color');
  $('.pcRow:visible:odd').css('background-color', emphasisColor);
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
  var linkButton = row[0].querySelector(".link_button");
  linkButton.setAttribute("data-linked", "false");
  linkButton.onclick = (e) => {
    showCharacterLinkModal(e.target);
  }
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

  var row = evt.target.closest(".pcRow");
  var tokenPath = window.dialog.showOpenDialogSync({
    properties: ['openFile'],
    message: "Choose picture location",
    filters: [{ name: 'Images', extensions: constants.imgFilters }]
  });
  if (tokenPath == null)
    return;
  tokenPath = tokenPath[0];

  row.setAttribute("data-token_to_save", tokenPath);
  evt.target.setAttribute("src", tokenPath);
}

function showCharacterLinkModal(linkbutton) {
  var modalCreate = Modals.createModal("Add character source", (result) => {

  });
  var modal = modalCreate.modal;
  var dndBeyondButton = Util.ele("button", " button_style margin padding", "DnDBeyond")
  modal.appendChild(dndBeyondButton);

  dndBeyondButton.onclick = (e) => {
    modal.close();
    Modals.prompt("Character URL", 'Enter the public URL for your DnDBeyond character:',
      (value) => {
        //Break if user cancels
        if (!value) return;;
        dndBeyondImporter.getCharacter(value, function (character, errorCode) {
          console.log(character);

          if (errorCode || !character) {
            console.error("Error contacting DnDBeyond", errorCode);
            Util.showFailedMessage(`${errorCode || ""}: Character retrieval failed`);
            return;
          }

          var charId = linkbutton.closest(".pcRow").getAttribute("data-char_id");

          setCharacterSource(charId, value, "dndbeyond");
          linkbutton.setAttribute("data-linked", "true");
        });


      });

  }
  if (linkbutton.getAttribute("data-linked") == "true") {
    var removeButton = Util.ele("button", " button_style  padding red", "Remove");
    modal.appendChild(removeButton);
    removeButton.onclick = (e) => {
      modal.close();
      var charId = linkbutton.closest(".pcRow").getAttribute("data-char_id");
      setCharacterSource(charId, null, null);
      linkbutton.setAttribute("data-linked", "false");
    }
  }
  document.body.appendChild(modalCreate.parent);

}

function setCharacterSource(charId, url, source) {
  dataAccess.getParty(party => {
    var members = party.members;

    var member = members.find(x => x.id == charId);
    if (!member) throw "member not found";

    member.external_source = source == null ? null :
      {
        url: url,
        source: source
      };
    dataAccess.setParty(party, () => { });
  });
}

function fillPartyPopup() {
  $(".pcRow").not(':first').remove();  //Clear html to default
  dataAccess.getParty(function (data) {
    var members = (data && data.members ? data.members : []);
    var parties = ["Any"];
    partyInformationList.parties = [];
    $(".pcRow").attr("data-char_id", null);
    for (var i = 0; i < members.length - 1; i++) {
      var row = $(".pcRow:nth-child(1)").clone();
      row.appendTo("#party--stats");
    }

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
        var pMember = members[index];
        var token = dataAccess.getTokenPathSync(pMember.id);
        var linkButton = row.querySelector(".link_button");
        linkButton.setAttribute("data-linked", pMember.external_source ? "true" : "false");
        linkButton.onclick = (e) => {
          showCharacterLinkModal(e.target)
        }
        row.getElementsByClassName("pc_input_character_token")[0].setAttribute("src", token);
        if (pMember.party && parties.indexOf(pMember.party) < 0) {

          partyInformationList.parties.push(pMember.party)
          parties.push(pMember.party)
        } else if (!pMember.party) {
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
    saveParty(false, true);
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
  allRows.pickOne().classList.add("randomly_chosen_table_row");
  $(".main_content_wrapper").animate({
    scrollTop: $(".randomly_chosen_table_row").offset().top - 20
  }, 600);
}

function savePcToJson() {

  saveParty(true);

}
function saveParty(showWarnings, dontClose) {
  dataAccess.getParty(party => {


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

      var charId = row.getAttribute("data-char_id");
      pcObject = {};
      if (!charId) {
        charId = uniqueID();
      } else {
        pcObject = party.members.find(x => x.id == charId);
        if (!pcObject) throw "party member not found";
      }

      ["player_name", "character_name", "dexterity",
        "perception", "level", "ac", "alternative_ac", "darkvision", "notes"].forEach(field => {
          pcObject[field] = row.getElementsByClassName("pc_input_" + field)[0].value;
        })
      pcObject.active = row.getElementsByClassName("checkbox_party_menu")[0].checked;
      pcObject.color = row.querySelector(".pc_input_background_color").value;
      pcObject.party = row.getAttribute("data-pc_party");
      if (parseInt(pcObject.level) <= 0) pcObject.level = "1";
      tempArr.push(pcObject);


      var saveTokenPath = row.getAttribute("data-token_to_save");
      if (saveTokenPath)
        dataAccess.saveToken(charId, saveTokenPath);
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
    if (dontClose) return;
    $('[data-popup="' + "popup-1" + '"]').fadeOut(350);
    dataAccess.setParty(obj, function (data) {
      loadParty();
    });
  });
}


function randomizeLoot() {
  var randint = d(100);

  var cr = parseInt($("#lootcr").val());
  var amount;
  var currency;
  console.log(cr)
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

