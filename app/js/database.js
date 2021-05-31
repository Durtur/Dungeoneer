
var tab = "monsters", tabElementNameSuffix = "monsters";
const { ipcRenderer } = require('electron');

const prompt = require('electron-prompt');
const uniqueID = require('uniqid');
const dataAccess = require("./js/dataaccess");
const CRCalculator = require("./js/CRCalculator");
const statblockEditor = require("./js/statblockEditor");
const TokenSelector = require("./js/tokenSelector");
const elementCreator = require("./js/lib/elementCreator");
const remote = require('electron').remote;
const dialog = require('electron').remote.dialog;
const pathModule = require('path');
const fs = require('fs');
var marked = require('marked');
var noUiSlider = require('nouislider');
const tokenSelector = new TokenSelector();
const StatblockPresenter = require('./js/statblockpresenter');


marked.setOptions({
  renderer: new marked.Renderer(),

});

var tokenFilePath = dataAccess.tokenFilePath;

const encounterModule = new EncounterModule();

var sortFunction, encounterMonsterListSortFunction;
var reverseName = true;
var reverseSize = true;
var reverseType = true;
var reverseHP = true;
var reverseRarity = true;
var loadedData;
var writeToHomebrew = true;
var listedData;
var monsterMasterList;
var classList = [];
const monsterTags = {};
var partyArray;
var currentEntry;

setTab("homebrew"); //Default to NPC

ipcRenderer.on('update-autofill-complete', function () {
  console.log("Notified that autocomplete list is updated.")
  updateAutoFill();

});


$(document).ready(function () {
  dataAccess.getSettings(sett => {
    settings = sett;
  });
  document.getElementById("token_importer_window_button").addEventListener("click", function (evt) {
    ipcRenderer.send('open-token-importer');
  });
  populateSpellClassDropdown();
  populateDropdowns();
  dataAccess.getSettings(function (settings) {
    document.querySelector("#trim_token_checkbox").checked = settings.token_trim_enabled || false;

  });
  document.querySelector("#trim_token_checkbox").addEventListener("change", function (evt) {
    dataAccess.getSettings(function (settings) {
      settings.token_trim_enabled = document.querySelector("#trim_token_checkbox").checked;
      dataAccess.saveSettings(settings, () => { });
    });
  })

  document.querySelector("#addmonster_name").addEventListener("change", function (evt) {

    addMonsterChanged();

  });
  document.getElementById("add_tags_from_sugestion_button").addEventListener("click", function (evt) {
    var suggestions = evt.target.getAttribute("data-suggestions");
    if (!suggestions) return;
    suggestions = JSON.parse(suggestions);
    suggestions.forEach(sugg => addNpcTag(sugg));
    document.getElementById("monster_tag_suggestion_info_button").classList.add("hidden");
  });

  $(".db_name_field").on("input", function (e) {
    var nothingPresent = e.target.value == "";
    var button = e.target.closest("section").querySelector(".save_button");

    button.disabled = nothingPresent;
    if (tab == "monsters" || tab == "homebrew")
      document.getElementById("addTokenButton").disabled = nothingPresent
  })
  document.querySelector("#encounter_table_header_row").addEventListener("click", sortEncounterMasterList);

  document.getElementById("condition_image_picker").onclick = function (e) {
    var selectedConditionImagePath = dialog.showOpenDialogSync(
      remote.getCurrentWindow(), {
      properties: ['openFile'],
      message: "Choose picture location",
      filters: [{ name: 'Images', extensions: ['jpg', 'png', 'gif'] }]
    });
    if (selectedConditionImagePath == null)
      return;
    selectedConditionImagePath = selectedConditionImagePath[0];
    var imgEle = document.getElementById("condition_image_picker");
    imgEle.setAttribute("src", selectedConditionImagePath);
  }
  $(".listSearch").on("keyup paste", filterListAndShow)
  $("#encounter_monster_list_search").on("keyup paste", searchMasterListAfterInput)
  $("#spell_class_dropdown").on("change", filterListAndShow)
  $(".monsterCR").on("change keyup paste", calculateSuggestedCR);
  $("#cr_lookup_cr").on("change keyup paste", lookupCrHandler)
  document.getElementById("OCR").addEventListener("change", updateOffensiveChallengeRatingValues);
  $("#encounter_challenge_calculator_character_size").on("input", calculateEncounterDifficulty);
  $("#encounter_challenge_calculator_character_level").on("input", calculateEncounterDifficulty);

  addEncounterCalculatorHandlers();
  document.getElementById("userCurrentPartyForEncounterDiff").onclick = function (e) {
    var altInpCont = document.getElementById("encounter_challenge_manual_input");
    if (altInpCont.classList.contains("hidden")) {
      altInpCont.classList.remove("hidden");
    } else {
      altInpCont.classList.add("hidden");
      var levels = [];
      partyArray.filter(x => x.level && x.active).forEach(member => levels.push(parseInt(member.level)));

      fillEncounterDifficultyLevels(levels);

    }
    calculateEncounterDifficulty();

  }

  dataAccess.getParty(data => {
    partyArray = data.members.filter(x => x.active);
    if (partyArray) {
      $("#encounter_challenge_calculator_character_size").val(partyArray.length);
      $("#encounter_challenge_calculator_character_level").val(encounterModule.getPartyAverageLevel());
      if (partyArray.length > 0) {
        var charList = "";
        partyArray.forEach(member => charList += member.character_name + "(" + member.level + ")" + " ")
        document.getElementById("userCurrentPartyForEncounterDiffLabel").title = "Use levels of current party, consists of " + charList;
        document.getElementById("userCurrentPartyForEncounterDiff").click();
      }
      var levels = [];
      partyArray.filter(x => x.level).forEach(member => levels.push(parseInt(member.level)));
      fillEncounterDifficultyLevels(levels);

      levels.sort();
      var lowestLevel = levels[0] - 5;
      if (isNaN(lowestLevel) || lowestLevel < 0) lowestLevel = 0;

      var highestLevel = levels[levels.length - 1] + 5;
      if (isNaN(highestLevel) || highestLevel > 30) highestLevel = 30;
      //Slider for encounter table
      var slider = document.getElementById('encounter_cr_slider');
      var tooltipFormat = {
        // 'to' the formatted value. Receives a number.
        to: function (value) {
          return "CR:" + parseInt(value);
        },
        // 'from' the formatted value.
        // Receives a string, should return a number.
        from: function (value) {
          return "CR:" + parseInt(value);
        }
      };
      noUiSlider.create(slider, {
        start: [lowestLevel, highestLevel],
        connect: true,
        range: {
          'min': 0,
          'max': 30
        },

        tooltips: [tooltipFormat, tooltipFormat],
        behaviour: "drag",
        step: 1
      });
      slider.noUiSlider.on("end", displayAddEncounterMonsterList);

    }
  });

  document.getElementById("dnd_beyond_statblock_import_button").onclick = function (e) {

    prompt({
      title: 'Enter URL from DndBeyond',
      label: 'Url:',
      icon: "./app/css/img/icon.png",
      customStylesheet: "./app/css/prompt.css",
      inputAttrs: { // attrs to be set if using 'input'
        type: 'string'
      }

    })
      .then((url) => {
        //Break if user cancels
        if (url == null) return false;
        try {
          webCrawler.checkDndBeyond(url, function (data) {
            editObject(data, "");
          })
        }
        catch (err) {
          console.log(err)
        }
      });
  }
});

function addMonsterNameChanged() {

}

var monster_subtype_awesomplete;
function populateDropdowns() {
  new Awesomplete(document.getElementById("item_rarity_input"), { list: itemRarityValues, autoFirst: true, minChars: 0, sort: false });
  new Awesomplete(document.getElementById("item_type_input"), { list: itemTypeValues, autoFirst: true, minChars: 0, sort: false });
  new Awesomplete(document.getElementById("addmonster_alignment"), { list: constants.defaultCreatureAlignments, autoFirst: true, minChars: 0, sort: false });
  new Awesomplete(document.getElementById("addmonster_type"), { list: constants.defaultCreatureTypes, autoFirst: true, minChars: 0, sort: false });
  document.getElementById("addmonster_type").addEventListener("awesomplete-selectcomplete", function (e) {
    if (monster_subtype_awesomplete != null) monster_subtype_awesomplete.destroy();
    var type = document.getElementById("addmonster_type").value?.toLowerCase();
    if (!type || !constants.defaultCreatureSubTypes[type]) return;

    monster_subtype_awesomplete = new Awesomplete(document.getElementById("addmonster_subtype"), { list: constants.defaultCreatureSubTypes[type], autoFirst: true, minChars: 0, sort: false });
  });
  new Awesomplete(document.getElementById("addmonster_ac_source"), { list: getArmorTypes(), autoFirst: true, minChars: 0, sort: false });
  document.getElementById("addmonster_ac_source").addEventListener("awesomplete-selectcomplete", armorSelected)
  new Awesomplete(document.getElementById("spell_school_input"), { list: constants.spellSchools, autoFirst: true, minChars: 0, sort: false });

  //Items
  var classList = new Set();
  constants.classes.forEach(classStr => {
    var prefix = Util.IsVowel(classStr.substring(0, 1)) ? "an" : "a";
    classList.add(`by ${prefix} ${classStr}`);
  });
  new Awesomplete(document.getElementById("additem_requires_attunement_by"), { list: [...classList], autoFirst: true, minChars: 0, sort: false });
  document.getElementById("additem_requires_attunement_by").addEventListener("awesomplete-selectcomplete", function (e) {
    var checkbox = document.getElementById("additem_requires_attunement");
    if (!checkbox.checked) checkbox.checked = true;
  });
  populateAddableFieldDropdowns();
  var sizeList = [];
  creaturePossibleSizes.sizes.forEach(function (size) {
    sizeList.push(size.substring(0, 1).toUpperCase() + size.substring(1))
  })
  new Awesomplete(document.getElementsByClassName("addmonster_size")[0], { list: sizeList, autoFirst: true, minChars: 0, sort: false });

  document.getElementById("homebrewAC").oninput = (evt) => { evt.target.setAttribute("data-user_override", true) }
  document.querySelector(".addmonster_dexterity").oninput = (evt) => { armorSelected() }
  function armorSelected() {
    var acField = document.getElementById("homebrewAC");
    if (acField.getAttribute("data-user_override") && acField.value) return;

    var value = document.getElementById("addmonster_ac_source").value;
    var split = value.split(",");
    var selectedArmors = [];
    split.forEach(armor => {
      selectedArmors.push(constants.armorTypes.find(x => x.type.toLowerCase().trim() === armor.toLowerCase().trim()));
    });


    var baseAc = selectedArmors.find(x => !x.is_shield);
    var shield = selectedArmors.find(x => x.is_shield);
    console.log(baseAc)
    if (!baseAc?.mod) {
      if (!shield?.mod) {
        return;
      }
      baseAc = shield;
      shield = null;
    }
    var finalAc = parseInt(baseAc.mod) + 10;
    if (shield) finalAc += parseInt(shield.mod);
    if (baseAc.maxDex != 0) {
      var dex = document.querySelector(".addmonster_dexterity").value;
      var dexMod = dex ? getAbilityScoreModifier(dex) : 0;
      finalAc += dexMod;
    }
    acField.value = finalAc;
    calculateSuggestedCR();

  }
  function getArmorTypes() {
    var list = constants.armorTypes;

    var stringValues = list.map(x => x.type.toProperCase());
    var shields = constants.armorTypes.filter(x => x.is_shield);

    constants.armorTypes.forEach(armor => {
      if (armor.is_shield)
        return;
      shields.forEach(shield => {
        stringValues.push(`${armor.type.toProperCase()}, ${shield.type.toProperCase()}`);
      })

    });
    return stringValues;
  }

}

const specialAbilityAndActionAwesompletes = []
function populateAddableFieldDropdowns() {

  var specialAbilityList = constants.specialAbilities.map(x => x.name);
  $(".special_ability_column .specialjsonAttribute").off("awesomplete-selectcomplete");
  [...document.querySelectorAll(".special_ability_column .specialjsonAttribute")].forEach(input => {
    specialAbilityAndActionAwesompletes.push(new Awesomplete(input, { list: specialAbilityList, autoFirst: true, minChars: 0, sort: false }));
  });
  $(".special_ability_column .specialjsonAttribute").on("awesomplete-selectcomplete", specialAbilitySelected);

  $(".action_row .action_name").off("awesomplete-selectcomplete");
  var weaponList = constants.weapons.map(x => x.name);
  [...document.querySelectorAll(".action_row .action_name")].forEach(input => {
    specialAbilityAndActionAwesompletes.push(new Awesomplete(input, { list: weaponList, autoFirst: true, minChars: 2, sort: false }));
  });
  $(".action_row .action_name").on("awesomplete-selectcomplete", actionSelected);
  function actionSelected(evt) {

    var parent = evt.target.closest(".action_row");
    var selectedWeapon = constants.weapons.find(x => x.name === evt.target.value);
    var dex = document.querySelector(".addmonster_dexterity").value;
    var str = document.querySelector(".addmonster_strength").value;
    var cr = document.querySelector(".addmonster_challenge_rating").value;
    var specialAbilityList = [...document.querySelectorAll(".addRow_special_abilities .specialjsonAttribute")].map(x => x.value).filter(x => x);
    var profMod = cr ? CRCalculator.getTableForCrValue(cr)?.profBonus || 2 : 2;
    var equippedAction = statblockEditor.equipWeapon(getAbilityScoreModifier(dex), getAbilityScoreModifier(str), profMod, selectedWeapon, specialAbilityList)
    console.log(equippedAction)
    parent.querySelector(".action_attack_bonus").value = equippedAction.attackBonus;
    parent.querySelector(".action_damage_dice").value = equippedAction.damageDice;
    parent.querySelector(".action_damage_bonus").value = equippedAction.damageBonus;
    parent.querySelector(".action_description").value = equippedAction.description;
  }
  function specialAbilitySelected(evt) {
    var parent = evt.target.closest(".special_ability_column");
    var selectedAbility = constants.specialAbilities.find(x => x.name === evt.target.value);
    var isUnique = document.querySelector("#addmonster_unique").checked;
    var creatureName = !isUnique ? `the ${document.querySelector("#addmonster_name").value}` : document.querySelector("#addmonster_name").value;
    var desc = selectedAbility.description.replace(/@{CREATURE_NAME}/g, function (match, offset, string) {
      if (offset == 0 || string[offset] == "." || string[Math.max(offset - 1, 0)] == ".")
        return creatureName.toProperCase();
      return creatureName;

    });
    parent.querySelector(".specialjsonValue").value = desc;
  }
}

function createMonsterListFilterDropdown(list, elementId) {


  var dropDown = document.getElementById(elementId);
  while (dropDown.firstChild) {
    dropDown.removeChild(dropDown.firstChild);
  }
  var jqryElement = $("#" + elementId);
  jqryElement.chosen("destroy");
  if (!list || list.length == 0) return;

  list.forEach(tag => {
    createOption(tag, tag);
  });
  jqryElement.chosen({
    width: "200px"
  });

  jqryElement.on("change", function (e) {
    filterDataListExecute();
  });
  function createOption(value, dispay) {
    var newOption = document.createElement("option");
    newOption.setAttribute("value", value);
    newOption.innerHTML = dispay;
    dropDown.appendChild(newOption);
  }
}

var filterDataListTimeout;
function filterListAndShow() {
  window.clearTimeout(filterDataListTimeout);
  filterDataListTimeout = window.setTimeout(function () {
    filterDataListExecute();
  }, 300);
}

function filterDataListExecute() {

  var searchstring;
  if (tab == "monsters" || tab == "homebrew") {
    filterMonsters();
  } else if (tab == "spells") {
    filterSpells();
  } else if (tab == "items") {
    filterItems();
  } else if (tab == "encounters" || tab == "conditions") {
    var elementName = tab == "encounters" ? "encounters_list_search" : "conditions_list_search";
    searchstring = document.getElementById(elementName).value;
    searchstring = searchstring.toLowerCase();
    listedData = loadedData.filter(x => { return notNullAndContains(x.name, searchstring) })

  } else {
    var searchbox = document.getElementById(`${tab}_list_search`);
    listedData = searchbox.value ? loadedData.filter(x => x.name.toLowerCase().includes(searchbox.value)) : loadedData;
  }

  listedLength = listedData.length;
  listAll();
  addLookupHandlers();

  function filterItems() {
    searchstring = document.getElementById("items_list_search").value;
    searchstring = searchstring.toLowerCase();
    listedData = splitAndCheckAttributes(searchstring, ["name", "type", "rarity"], loadedData)
  }
  function filterSpells() {
    searchstring = document.querySelector("#spell_list_search").value.toLowerCase();
    var classArray = $("#spell_class_dropdown").val();

    listedData = splitAndCheckSpellAttributes(searchstring, ["name", "school", "casting_time", "level"], loadedData)

    if (classArray.length > 0)
      listedData = listedData.filter(
        x => {
          return x.classes != null
            && x.classes.filter(y => {
              return classArray.indexOf(y.toLowerCase().trim()) >= 0
            }
            ).length > 0
        })


  }
  function filterMonsters() {
    searchstring = document.getElementById("monsters_list_search").value.toLowerCase();


    listedData = splitAndCheckAttributes(searchstring, ["name", "type", "challenge_rating", "hit_points"], loadedData);
    filterTypes();
    function filterTypes() {
      var typesAndSubtypes = $("#monsters_list_type_select").val();
      if (typesAndSubtypes.length <= 0) return;
      var types = [];
      typesAndSubtypes.forEach(typeAndSubType => {

        if (!typeAndSubType.includes("(") || !typeAndSubType.includes("(")) {
          types.push({ type: typeAndSubType });
          return;
        }
        var type = typeAndSubType.substring(0, typeAndSubType.indexOf("("))?.trim();
        var subType = typeAndSubType.substring(typeAndSubType.indexOf("("), typeAndSubType.indexOf(")"));
        subType = subType.replace("(", "").replace(")", "").trim();
        types.push({ type: type, subtype: subType });
      });
      console.log(listedData.filter(x => x.subtype && typeof (x.subtype) != "string"));
      listedData = listedData.filter(x => types.find(y => x.type == y.type && (!y.subtype || (x.subtype && y.subtype.toLowerCase() == x.subtype.toLowerCase()))));

    }
  }

}
function notNullAndContains(string, searchstring) {
  if (searchstring == "") return true;
  if (string == null || string == "") return false;
  if ((typeof string) == "number") return notNullAndExactMatch(string + "", searchstring)
  string = string.toLowerCase().trim();
  return string.indexOf(searchstring) > -1;

}
function notNullAndExactMatch(string, searchstring) {
  if (string == null) return false;
  var splt = searchstring.split(" ");
  return string.toLowerCase() == searchstring ||
    splt.filter(x => string == x).length > 0;
}

function populateSpellClassDropdown() {
  dataAccess.getSpells(function (data) {
    const worker = runWithWorker(function () {
      self.addEventListener("message", function (e) {
        var data = e.data;

        var dropDownValues = [];
        data.forEach(function (element) {
          var exists = false;
          for (var j = 0; j < element.classes.length; j++) {
            for (var i = 0; i < dropDownValues.length; i++) {
              if (element.classes[j].trim().toLowerCase() == dropDownValues[i].value) {
                exists = true;
              }
            }
            if (!exists) {
              dropDownValues.push({ value: element.classes[j], name: element.classes[j].substring(0, 1).toUpperCase() + element.classes[j].substring(1) })

            }
          }
        });
        postMessage(dropDownValues);
        self.close();
      }, false);
    });
    worker.postMessage(data);

    worker.onmessage = function (e) {

      var dropDownValues = e.data;
      var dropDown = document.getElementById("spell_class_dropdown");
      dropDownValues.forEach(function (option) {
        var newOption = document.createElement("option");
        newOption.setAttribute("value", option.value);
        newOption.innerHTML = option.name;
        dropDown.appendChild(newOption);
        if (option.name != "All classes") classList.push(option.name)
      });
      $("#spell_class_dropdown").chosen({
        width: "200px",
        placeholder_text_multiple: "All classes"
      });

      [...document.getElementsByClassName("jsonValueClasses")].forEach(
        function (el) {
          new Awesomplete(el, { list: classList, autoFirst: true, minChars: 0 })
        }
      )
    }
  });
}
//#region GUI stuff
function hide(element) {

  document.getElementById(element).classList.add("hidden");
  return false;
}
function hideStatblock() {
  var sb = document.getElementById("statblock")
  sb.classList.add("hidden");
  document.getElementById("iframeWrapper").appendChild(sb)
}
function doneAdding(elname) {
  document.getElementById(elname).classList.add("hidden");
  loadAll();
}

function newItem() {
  var element = document.getElementById("add" + tabElementNameSuffix);
  element.getElementsByClassName("edit_header_name")[0].innerHTML = "New " + (tab.charAt(tab.length - 1) === "s" ? tab.substring(0, tab.length - 1) : tab);
  element.classList.remove("hidden");
  clearAddForm();

  showAddForm('tab');
}

function showAddForm(element) {
  if (element == "tab") {
    element = "add" + tabElementNameSuffix;
    if (tab === "encounters") {
      updateAutoFill();
    }
    $(".listWrap").addClass("hidden");
  }

  document.getElementById(element).classList.remove("hidden");

  return false;
}

function showBlock(element) {
  document.getElementById(element).classList.remove("hidden");
  return false;

}

function addClassTextBoxForSpells() {
  var newInput = document.createElement("input");
  newInput.classList.add("jsonValueClasses");
  var parentNode = document.getElementById("spell_class_row");
  parentNode.appendChild(newInput, parentNode.getElementsByClassName("awesomplete")[0])

  newInput.setAttribute("tabindex", 1)

  new Awesomplete(
    newInput, { list: classList, autoFirst: true, minChars: 0 });
  newInput.focus();
}

var readDataFunction, writeDataFunction;
function setTab(x) {

  $(".mainheader").html(x);
  hide('add' + tabElementNameSuffix);
  listedData = null;
  closeListFrame();
  fileName = x + ".json";
  tab = x;
  tabElementNameSuffix = tab == "homebrew" ? "monsters" : tab;
  var tabs = document.getElementsByClassName("tab");
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].classList.remove("toggle_button_toggled");
  }
  document.getElementById("statblock").classList.remove("single_column");
  document.getElementById(x).classList.add("toggle_button_toggled");
  document.querySelector("#add_entry_button").classList.remove("hidden");
  switch (tab) {
    case "homebrew":
      readDataFunction = dataAccess.getHomebrewMonsters;
      writeDataFunction = dataAccess.setHomebrewMonsters;
      fetchTagList();
      fetchTypeList();
      break;
    case "monsters":
      readDataFunction = dataAccess.getMonsters;
      writeDataFunction = dataAccess.setMonsters;
      document.querySelector("#add_entry_button").classList.add("hidden");
      fetchTagList();
      fetchTypeList();
      break;
    case "encounters":
      readDataFunction = dataAccess.getEncounters;
      writeDataFunction = dataAccess.setEncounters;
      updateAutoFill();
      updateMonsterLists();
      break;
    case "spells":
      readDataFunction = dataAccess.getSpells;
      writeDataFunction = dataAccess.setSpells;
      break;
    case "items":
      readDataFunction = dataAccess.getItems;
      writeDataFunction = dataAccess.setItems;
      break;
    case "conditions":
      readDataFunction = dataAccess.getConditions;
      writeDataFunction = dataAccess.setConditions;
      break;
    case "tables":
      readDataFunction = dataAccess.getTables;
      writeDataFunction = dataAccess.setTables;
      break;

  }
  window.setTimeout(() => loadAll(), 200)
  var searchBar = document.getElementsByClassName("listSearch");
  [...searchBar].forEach(bar => bar.value = "");
}


/**
 * Sýnir input fyrir töflur í add frame
 */
function showTableElements() {

  var isHidden;
  var letter = tab.substring(0, 1).toUpperCase();
  var tableControl = document.getElementsByClassName("jsonTableControl" + letter)[0];
  isHidden = tableControl.classList.contains("hidden");
  if (isHidden) {
    $(".jsonTableControl" + letter).removeClass("hidden");
    $(".jsonTable" + letter).removeClass("hidden");
  } else {
    $(".jsonTableControl" + letter).addClass("hidden");
    $(".jsonTable" + letter).addClass("hidden");
  }


}

/**
 * 
 * @param {*} horizontal ef 1 þá á aðgerðin við raðir, annars dálka
 * @param {*} add ef 1 þá á að bæta við, annars fjarlægja 
 */
function resizeTable(horizontal, add) {
  var letter = tab.substring(0, 1).toUpperCase();
  if (horizontal != 1) {
    if (add == 1) {
      var lastHeader = $(".table_header" + letter + ":last");
      lastHeader.clone().appendTo(lastHeader.parent());

      var allRows = $(".jsonTableRow" + letter);
      for (var i = 2; i < allRows.length + 2; i++) {
        var currElement = $(".jsonTableRow" + letter + ":nth-child(" + i + ")").find(".table_element" + letter + ":last");
        currElement.clone().appendTo(currElement.parent());
      }
    } else {
      if ($(".table_headerI").length == 1) return;
      var lastHeader = $(".table_header" + letter + ":last");
      lastHeader.remove();

      var allRows = $(".jsonTableRow" + letter);
      for (var i = 2; i < allRows.length + 2; i++) {
        var currElement = $(".jsonTableRow" + letter + ":nth-child(" + i + ")").find(".table_element" + letter + ":last");
        currElement.remove();
      }
    }
  } else {
    if (add == 1) {
      $(".jsonTableRow" + letter + ":nth-child(2)").clone().appendTo($(".jsonTable" + letter))
    } else {
      if ($(".jsonTableRow" + letter).length > 1) {
        $(".jsonTableRow" + letter + ":last").remove();
      }

    }
  }

}


var monsterNames;
var awesomePletes = [];
function updateAutoFill() {
  var fields;
  while (awesomePletes.length > 0) {
    awesomePletes.pop().destroy();
  }
  if (monsterNames == null) {
    dataAccess.getAutofillData(function (data) {
      data = data.filter(value => value[0].substring(0, 10) != "Encounter:");
      monsterNames = data;
      fields = document.querySelectorAll(".specialjsonAttributeE");

      fields.forEach(function (i) {
        awesomePletes.push(new Awesomplete(i, { list: monsterNames, autoFirst: true }));
        i.addEventListener("awesomplete-selectcomplete", updateCRHandler);
        i.addEventListener("input", updateCRHandlerDelayed);
      })
    });
  } else {

    fields = document.querySelectorAll(".specialjsonAttributeE");

    fields.forEach(function (i) {
      awesomePletes.push(new Awesomplete(i, { list: monsterNames, autoFirst: true }));
    });

    fields[fields.length - 1].addEventListener("awesomplete-selectcomplete", updateCRHandler);
    fields[fields.length - 1].addEventListener("input", updateCRHandlerDelayed);


  }
  var updateCRHandlerDelayed_Delay;
  function updateCRHandlerDelayed(event) {

    window.clearTimeout(updateCRHandlerDelayed_Delay);
    updateCRHandlerDelayed_Delay = window.setTimeout(function () {
      showCRForCreature(event.target);
    }, 400);

  }
  function updateCRHandler(event) {
    showCRForCreature(this);
  }


}


function updateMonsterLists() {
  dataAccess.getMonsters(data => {
    dataAccess.getHomebrewMonsters(homebrewData => {
      data = data.concat(homebrewData);
      monsterMasterList = data;
      displayAddEncounterMonsterList();
      var types = [];
      monsterMasterList.forEach(mon => {
        if (!mon.type) return;
        var type = mon.type.trim();
        type = type.substring(0, 1).toUpperCase() + type.substring(1).toLowerCase()
        if (types.indexOf(type) < 0)
          types.push(type);
      });

      var selectBox = document.getElementById("monster_type_select");
      types.forEach(type => {
        var select = document.createElement("option");
        select.setAttribute("value", type.toLowerCase());
        select.innerHTML = type.substring(0, 1).toUpperCase() + type.substring(1).toLowerCase();
        selectBox.appendChild(select);
      })
      $(".chosen-select").chosen({
        width: "38%",
        placeholder_text_multiple: "Filter monster type"
      });
    })
    $("#monster_type_select").on("change", function (e) {
      displayAddEncounterMonsterList();
    })
  });
}
var searchMasterListAfterInput_delay;
function searchMasterListAfterInput() {

  window.clearTimeout(searchMasterListAfterInput_delay);
  searchMasterListAfterInput_delay = window.setTimeout(function () {
    displayAddEncounterMonsterList();
  }, 500)
}

function fetchTypeList() {
  dataAccess.getMonsterTypes(function (types) {
    createMonsterListFilterDropdown(types, "monsters_list_type_select")
  });
}

function fetchTagList() {

  dataAccess.getTags(function (tags) {
    createMonsterListFilterDropdown(tags, "monsters_list_tag_select");
    if (monsterTags.awesomplete) return;
    monsterTags.list = tags;
    var input = document.querySelector("#addmonster_tag_input");
    monsterTags.awesomplete = new Awesomplete(input, { list: tags, autoFirst: true, minChars: 0, sort: false })
    input.addEventListener("awesomplete-selectcomplete", function (e) {
      console.log(e)
      addNpcTag(e.text.value);
      e.target.value = "";
    });
    input.addEventListener("keydown", (e) => {
      if (e.key != "Enter") return;
      addNpcTag(e.target.value);
      e.target.value = "";
    });
  });

}


function displayAddEncounterMonsterList() {
  var table = document.querySelector(".encounter_table");
  var tbody = table.querySelector("tbody");
  var statblock = document.getElementById("statblock");
  statblock.classList.add("hidden");
  document.body.appendChild(statblock);
  while (tbody.firstChild) {
    tbody.removeChild(tbody.firstChild);
  }
  var tr;
  if (encounterMonsterListSortFunction) {
    monsterMasterList.sort(encounterMonsterListSortFunction);
  }
  var filtered, filterTextSplt, filterText = document.getElementById("encounter_monster_list_search").value;

  if (filterText.replace(" ", "") != "") {
    filterTextSplt = filterText.split("&");
    if (filterTextSplt.length == 1) {
      filtered = monsterMasterList.filter(
        entry => {
          return (
            notNullAndContains(entry.name, filterText) ||
            notNullAndContains(entry.type, filterText) ||
            notNullAndExactMatch(entry.challenge_rating + "", filterText)
          )
        }
      )
    } else {

      filtered = monsterMasterList.filter(
        entry => {
          var ret = true;
          for (var i = 0; i < filterTextSplt.length; i++) {
            if (!(notNullAndContains(entry.name, filterTextSplt[i]) ||
              notNullAndContains(entry.type, filterTextSplt[i]) ||
              notNullAndExactMatch(entry.challenge_rating + "", filterTextSplt[i])
            )) ret = false;
          }
          return ret;
        }
      )
    }

  } else {
    filtered = monsterMasterList;
  }

  var slider = document.getElementById('encounter_cr_slider');
  var crValues = slider.noUiSlider.get();

  var lowestCr = parseInt(crValues[0]);
  var highestCr = parseInt(crValues[1]);
  filtered = filtered.filter(x => {
    var cr = parseInt(x.challenge_rating);
    return cr >= lowestCr && cr <= highestCr;
  })

  var selectedTypes = $('#monster_type_select').val();
  if (selectedTypes.length > 0) {
    filtered = filtered.filter(x => {
      return x.type && selectedTypes.indexOf(x.type.toLowerCase()) >= 0;
    })
  }

  filtered.forEach(entry => {
    if (!entry.challenge_rating) entry.challenge_rating = 0;
    tr = document.createElement("tr");
    ["name", "type", "challenge_rating"].forEach(attribute => {
      var inner = "";
      if (entry[attribute]) {
        inner = entry[attribute];
      }
      var td = document.createElement("td");
      td.innerHTML = inner;
      tr.appendChild(td);

    });
    var button = document.createElement("button");
    button.onclick = addMonsterFromListToEncounter;
    button.innerHTML = "+";
    button.className = "small button_style  show_on_hover";
    tr.insertBefore(button, tr.querySelector("td:nth-child(2)"));
    tbody.appendChild(tr);
  });

  $(".encounter_table>tbody>tr").off("click");
  $(".encounter_table>tbody>tr").on("click", function (e) {
    if ($(this).hasClass("selected_row")) {
      hideStatblock();
      [...document.querySelectorAll(".selected_row")].forEach(e => e.classList.remove("selected_row"));
      return;
    }
    var string = $(this).find(':first-child').html();

    var foundMonster = monsterMasterList.filter(x => x.name == string)[0];
    console.log(tab)
    new StatblockPresenter(document.getElementById("statblock"), foundMonster, tab)
    document.getElementById("statblock").classList.remove("hidden");
    [...document.querySelectorAll(".selected_row")].forEach(e => e.classList.remove("selected_row"));
    $(this).addClass("selected_row");


    this.parentNode.insertBefore(document.getElementById("statblock"), this.nextSibling);
  });

}

function addMonsterFromListToEncounter(e) {
  var monName = e.target.parentNode.querySelector("td:first-child").innerHTML;

  var freeNameInputs = [...document.querySelectorAll(".specialjsonAttributeE")].filter(x => x.value == "" || x.value == monName);

  if (freeNameInputs.length == 0) {
    addRow();
    freeNameInputs = [...document.querySelectorAll(".specialjsonAttributeE")].filter(x => x.value == "");
  }
  var inp = freeNameInputs[0];

  var numInp = inp.closest(".row").getElementsByClassName("specialjsonValueE")[0];
  if (numInp.value == "") {
    numInp.value = 1;
  } else {
    numInp.value = parseInt(numInp.value) + 1;
  }
  inp.value = monName;
  showCRForCreature(inp);


}

function splitAndCheckSpellAttributes(searchString, attributes, motherList) {
  var filterTextSplt = searchString.split("&");
  return motherList.filter(
    entry => {
      return filterTextSplt.filter(searchValue => {
        if (searchValue == "ritual" && entry.ritual) return true;
        var ret = false;
        attributes.forEach(attribute => {
          if (notNullAndContains(entry[attribute], searchValue))
            ret = true;
        })
        return ret;
      }).length == filterTextSplt.length;
    }
  )
}

function splitAndCheckAttributes(searchString, attributes, motherList) {
  var tags = $("#monsters_list_tag_select").val();
  if (tags.length > 0) {
    motherList = motherList.filter(x => x.tags && x.tags.find(y => tags.includes(y)));
  }

  var filterTextSplt = searchString.split("&");
  return motherList.filter(
    entry => {
      return filterTextSplt.filter(searchValue => {
        var ret = false;
        attributes.forEach(attribute => {
          if (notNullAndContains(entry[attribute], searchValue))
            ret = true;
        })
        return ret;
      }).length == filterTextSplt.length;
    }
  )

}
function sortEncounterMasterList(event) {

  if (event.target.nodeName.toUpperCase() !== "TH") return;
  var sortAttribute = event.target.getAttribute("data-sort_attr");
  var sortMultiplier = event.target.getAttribute("data-sort_direction");
  if (sortMultiplier == null) {
    sortMultiplier = 1;
  } else {
    sortMultiplier = parseInt(sortMultiplier);
  }

  if (sortAttribute == "challenge_rating") {
    encounterMonsterListSortFunction = function (a, b) {
      var s = parseInt(a[sortAttribute]);
      var k = parseInt(b[sortAttribute]);
      if (isNaN(s)) s = 0;
      if (isNaN(k)) k = 0;
      if (s > k) return 1 * sortMultiplier;
      if (s < k) return -1 * sortMultiplier;
      return 0;
    }
  } else {
    encounterMonsterListSortFunction = function (a, b) {
      var s = a[sortAttribute];
      var k = b[sortAttribute];
      if (s > k) return 1 * sortMultiplier;
      if (s < k) return -1 * sortMultiplier;
      return 0;
    }
  }
  sortMultiplier *= -1;
  event.target.setAttribute("data-sort_direction", sortMultiplier);
  displayAddEncounterMonsterList();
}
function closeListFrame() {
  var tabElementName = tab == "homebrew" ? "monsters" : tab;
  $(`#listFrame__${tabElementName} .listRow`).remove();
  sortFunction = null;
  loadedData = null;
  $(".listWrap").addClass("hidden");
}

function getRandomEncounter() {
  var allowedMonsters = [];
  var nameEles = document.querySelectorAll(".encounter_table td:first-child");
  nameEles.forEach(name => allowedMonsters.push(name.innerHTML));

  var levels = [];
  partyArray.filter(x => x.level && x.active).forEach(member => levels.push(parseInt(member.level)));

  encounterModule.getRandomEncounter(
    levels,
    pickOne(["easy", "medium", "hard", "deadly", "2x deadly"]),
    pickOne(["solitary", "squad", "mob"]),
    allowedMonsters,
    null,
    null,
    function (enc) {

      var encName = document.querySelector(".object_nameE").value;
      var description = document.querySelector(".add_encounter_description").value;
      if (encName) enc.name = encName;
      if (description) enc.description = description;
      editObject(enc, "E");
    }
  )

}

function deleteFromHomebrew(toRemove) {
  readDataFunction(function (data) {
    //Find index of first
    var index = indexOfId(data, toRemove);
    if (index == -1) return false;
    data.splice(index, 1);
    if (tab == "monsters" || tab == "homebrew") {
      var tokens = getAllTokenPaths(toRemove);
      tokens.forEach(token => {
        fs.unlink(token, function (err) {
          if (err) console.log(err)
        })
      })
    }
    //Write json
    writeDataFunction(data, function () { window.setTimeout(() => loadAll(), 200) });
    hide("statblock");


  });
}
//#endregion

//#region encounters & calculators CR 
function showCRForCreature(element) {
  var monsterCR, monsterListString;
  var searchValue = element.value.toLowerCase();
  for (var i = 0; i < monsterNames.length; i++) {
    if (monsterNames[i][1].toLowerCase() == searchValue) {
      monsterListString = monsterNames[i][0];
    }
  }
  if (monsterListString == null) return;
  var crString = monsterListString.substring(monsterListString.lastIndexOf(" - cr ") + 6);

  if (crString === "1/8") {
    monsterCR = 0.125;
  } else if (crString === "1/4") {
    monsterCR = 0.25;
  } else if (crString === "1/2") {
    monsterCR = 0.5;
  } else {
    monsterCR = parseInt(crString);
  }
  var parent = element.parentNode.parentNode;

  parent.getElementsByClassName("encounter_creature_cr")[0].value = monsterCR;
  updateCRTotalXP()
}

function addEncounterHandler(element) {
  element.off("change keyup paste");
  element.on("change keyup paste", updateCRTotalXP);
}

var updateCRTimeout;
function updateCRTotalXP() {
  document.querySelector("#encounter_challenge_calculator_value").value = "";
  window.clearTimeout(updateCRTimeout);
  updateCRTimeout = window.setTimeout(function () {
    console.log("Updating cr")
    var allCrs = [];

    var numFields, crFields;
    numFields = document.querySelectorAll(".specialjsonValueE");
    crFields = document.querySelectorAll(".encounter_creature_cr");


    for (var i = 0; i < crFields.length; i++) {
      for (var j = 0; j < parseInt(numFields[i].value); j++) {
        allCrs.push(crFields[i].value);
      }

    }
    xpSum = encounterModule.getXpSumForEncounter(allCrs, document.querySelector("#encounter_challenge_calculator_character_size").value);
    document.querySelector("#encounter_challenge_calculator_value").value = xpSum.adjusted;
    document.querySelector("#encounter_challenge_calculator_value_unadjusted").value = xpSum.unadjusted;
    calculateEncounterDifficulty();
  }, 100)

}
function addEncounterCalculatorHandlers() {
  addEncounterHandler($(".encounter_creature_cr"));
  addEncounterHandler($(".specialjsonValueE"));

}

function lookupCrHandler() {
  var cr = document.querySelector("#cr_lookup_cr").value;
  var lookupObj = CRCalculator.getTableForCrValue(cr.trim());
  document.querySelector(".cr_lookup_results").classList.add("hidden");
  if (!lookupObj)
    return;
  document.querySelector(".cr_lookup_results").classList.remove("hidden");
  var damageRange = `${lookupObj.minDmg} - ${lookupObj.maxDmg}`;
  var hpRange = `${lookupObj.minHP} - ${lookupObj.maxHP}`;
  document.querySelector(".cr_lookup_results .attack_bonus_cr_lookup").innerHTML = lookupObj.attack_bonus_string || lookupObj.attack_bonus;
  document.querySelector(".cr_lookup_results .save_dc_cr_lookup").innerHTML = lookupObj.saveDc_string || lookupObj.saveDc;
  document.querySelector(".cr_lookup_results .armor_class_cr_lookup").innerHTML = lookupObj.ac_string || lookupObj.ac;
  document.querySelector(".cr_lookup_results .average_damage_cr_lookup").innerHTML = damageRange;
  document.querySelector(".cr_lookup_results .proficiency_bonus_cr_lookup").innerHTML = `+${lookupObj.profBonus}`;
  document.querySelector(".cr_lookup_results .hit_points_cr_lookup").innerHTML = hpRange;
}

function calculateSuggestedCR() {
  var hp = parseInt($("#homebrewHP").val());
  var predictedDmg = parseInt($("#predictedDamageOutput").val());
  var attackBonus = parseInt($("#mainAttackBonus").val());
  var saveDc = parseInt(document.querySelector("#cr_calculator_save_dc").value);
  var ac = parseInt($("#homebrewAC").val());
  if (!attackBonus && !predictedDmg && !saveDc && !hp && !ac) {
    document.querySelector(".cr_calculator_results").classList.add("hidden");
    return;
  }

  var res = CRCalculator.calculateCR(ac, hp, attackBonus, predictedDmg, saveDc);
  console.log(res)
  document.querySelector("#DCR").innerHTML = res.dcr_entry.cr;
  document.querySelector("#OCR").innerHTML = res.ocr_entry.cr;
  document.querySelector("#suggestedCR").innerHTML = res.cr_entry.cr;

  document.querySelector(".cr_calculator_results").classList.remove("hidden");
  document.querySelector("#offensive_cr_row .attack_bonus_cr_calculator").innerHTML = `+ ${res.ocr_entry.attack_bonus_string || res.ocr_entry.attack_bonus}`;
  document.querySelector("#offensive_cr_row .average_damage_cr_calculator").innerHTML = `${res.ocr_entry.minDmg} - ${res.ocr_entry.maxDmg}`;
  document.querySelector("#offensive_cr_row .save_dc_cr_calculator").innerHTML = `${res.ocr_entry.saveDc_string || res.ocr_entry.saveDc}`;
  document.querySelector("#offensive_cr_row .proficiency_bonus_cr_calculator").innerHTML = `+${res.ocr_entry.profBonus}`;


  document.querySelector("#defensive_cr_row .armor_class_cr_calculator").innerHTML = `${res.dcr_entry.ac_string || res.dcr_entry.ac}`;
  document.querySelector("#defensive_cr_row .hit_points_cr_calculator").innerHTML = `${res.dcr_entry.minHP}-${res.dcr_entry.maxHP}`;
}

function updateOffensiveChallengeRatingValues() {

}

function calculateEncounterDifficulty() {
  console.log("Calculating encounter diff")
  var partySize, partyLevel, xpValue;

  xpValue = parseInt(document.querySelector("#encounter_challenge_calculator_value").value);

  var allLevels = [];
  var altInpCont = document.getElementById("encounter_challenge_manual_input");

  console.log("Levels: ", allLevels)
  if (!altInpCont.classList.contains("hidden")) {
    partySize = parseInt(document.querySelector("#encounter_challenge_calculator_character_size").value);
    partyLevel = parseInt(document.querySelector("#encounter_challenge_calculator_character_level").value);

    if (isNaN(partySize) || isNaN(partyLevel))
      return;

    for (var i = 0; i < partySize; i++)allLevels.push(partyLevel)
    var levels = [];
    while (partySize > 0) {
      levels.push(partyLevel);
      partySize--;
    }
    var table = encounterModule.getEncounterTableForPlayers(levels);
    for (var i = 0; i < 4; i++) {
      difficulty = ["easy", "medium", "hard", "deadly"][i];
      document.querySelector("#encounter_" + difficulty + "_value").innerHTML = table[i] + " xp";
    }
    document.querySelector("#encounter_trivial_value").innerHTML = "<" + table[0] + " xp";
  } else {

    for (var i = 0; i < partyArray.length; i++)allLevels.push(partyArray[i].level)
  }

  if (isNaN(xpValue)) {
    var progressBar = document.querySelector(".progress_bar_encounter_difficulty>div");
    progressBar.style.transform = "scale(0.005, 1)";
    progressBar.style.backgroundColor = "grey";
    return;

  }
  var ratio = xpValue / parseInt(document.querySelector("#encounter_deadly_value").innerHTML);
  var progressBar = document.querySelector(".progress_bar_encounter_difficulty>div");
  if (ratio > 1) ratio = 1;
  if (ratio < 1) {
    progressBar.classList.add("rounded_right_edges");
  } else {
    progressBar.classList.remove("rounded_right_edges");
  }
  var colors = ["rgb(0, 62, 0)", "rgb(1, 1, 86)", "rgb(113, 0, 0)", "black"];
  var index = -1;
  document.querySelector("#encounter_trivial_value").parentNode.classList.remove("current_encounter_difficulty_text");
  ["easy", "medium", "hard", "deadly"].forEach(difficulty => {
    document.querySelector("#encounter_" + difficulty + "_value").parentNode.classList.remove("current_encounter_difficulty_text")
    var sum = parseInt(document.querySelector("#encounter_" + difficulty + "_value").innerHTML);
    if (xpValue >= sum) {
      index++;
    }
  });
  if (index >= 0) {
    document.querySelector("#encounter_" + ["easy", "medium", "hard", "deadly"][index] + "_value").parentNode.classList.add("current_encounter_difficulty_text");
    progressBar.style.backgroundColor = colors[index];
  } else {
    progressBar.style.backgroundColor = "grey";
    document.querySelector("#encounter_trivial_value").parentNode.classList.add("current_encounter_difficulty_text");
  }

  progressBar.style.transform = "scale(" + ratio + ", 1)";


  document.querySelector("#encounter_challenge_calculator_result").value = encounterModule.getEncounterDifficultyString(xpValue, allLevels);
}

function fillEncounterDifficultyLevels(levelArray) {

  var table = encounterModule.getEncounterTableForPlayers(levelArray);
  document.querySelector("#encounter_trivial_value").innerHTML = "<" + table[0] + " xp"
  for (var i = 0; i < 4; i++) {
    difficulty = ["easy", "medium", "hard", "deadly"][i];
    document.querySelector("#encounter_" + difficulty + "_value").innerHTML = table[i] + " xp";
  }
}

//#endregion


//Lists all elements of Homebrew database in rows.
function loadAll() {
  console.log("Load all", readDataFunction);
  readDataFunction(function (data) {
    loadedData = data;
    //skítamix þartil ég bæti við id á öðru
    data.map(x => { if (!x.id) x.id = x.name });
    listLength = loadedData.length;
    listedData = null;
    filterListAndShow();
    addSorters();
    addLookupHandlers();

  });

  return false;

}



function listAll() {
  console.log("List all")
  if (listedData == null) {
    listedData = loadedData;
  }

  var data = listedData;
  console.log(data)
  var tabElementName = tab == "homebrew" ? "monsters" : tab;
  if (sortFunction != null) {
    data.sort(sortFunction);
  }

  hide("statblock")
  $("#listFrame__" + tabElementName).removeClass("official_content_row");
  if (!$("#listFrame__" + tabElementName).is(":visible")) {
    $("#listFrame__" + tabElementName).removeClass("hidden");
  }
  var allRows = [...$("#listFrame__" + tabElementName + ">.listRow")];
  if (data.length > allRows.length) {
    for (var i = allRows.length; i < data.length; i++) {

      var newRow = $(`#listFrame__${tabElementName}_template`).clone();

      newRow.removeClass("hidden");
      newRow.appendTo("#listFrame__" + tabElementName);
    }
  } else if (data.length < allRows.length) {
    while (data.length < allRows.length) {
      var toRemove = allRows.pop()
      toRemove.parentNode.removeChild(toRemove)
    }
  }
  var allRows = $("#listFrame__" + tabElementName + ">.listRow");
  if (tabElementName == "monsters") {
    for (var i = 0; i < data.length; i++) {
      if (data[i].name == null) data[i].name = "None";
      if (data[i].challenge_rating == null) data[i].challenge_rating = 0;
      if (data[i].type == null) data[i].type = "None";
      if (data[i].hit_points == null) data[i].hit_points = 0;
      var allInputs = allRows[i].getElementsByTagName("input");
      allRows[i].setAttribute("data-entry_id", data[i].id);
      allInputs[0].value = (data[i].name);
      allInputs[1].value = (data[i].challenge_rating);
      allInputs[2].value = (data[i].type);
      allInputs[3].value = (data[i].hit_points);
    }
  } else if (tabElementName == "spells") {
    for (var i = 0; i < data.length; i++) {
      if (data[i].name == "") data[i].name = "None";
      if (data[i].casting_time == "") data[i].casting_time = "None";
      if (data[i].school == "") data[i].school = "None";
      if (data[i].level == "") data[i].level = "0";

      var row = allRows[i];

      if (data[i].source == "official") {
        row.classList.add("official_content_row");
      } else {
        row.classList.remove("official_content_row");
      }

      row.setAttribute("data-entry_id", data[i].id)
      row.querySelector("input:nth-child(1)").value = data[i].name;
      row.querySelector("input:nth-child(2)").value = data[i].casting_time;
      row.querySelector("input:nth-child(3)").value = data[i].school;
      row.querySelector("input:nth-child(4)").value = data[i].level;
    }

  } else if (tabElementName == "items") {

    for (var i = 0; i < data.length; i++) {
      if (data[i].name == "") data[i].name = "None";
      if (data[i].type == "") data[i].type = "None";
      if (data[i].rarity == "") data[i].rarity = "None";
      var row = allRows[i];
      row.setAttribute("data-entry_id", data[i].id)
      row.querySelector("input:nth-child(1)").value = data[i].name;
      row.querySelector("input:nth-child(2)").value = data[i].type;
      row.querySelector("input:nth-child(3)").value = data[i].rarity;

    }

  } else if (tabElementName == "conditions" || tabElementName == "encounters" || tabElementName == "tables") {
    for (var i = 0; i < data.length; i++) {
      if (data[i].name == "") data[i].name = "None";
      allRows[i].setAttribute("data-entry_id", data[i].id);
      allRows[i].querySelector("input:nth-child(1)").value = data[i].name;
    }
  }

}

async function addTokensToCurrentMonster() {
  var type = document.getElementById("addmonster_type").value;
  var name = document.getElementById("addmonster_name").value;
  await tokenSelector.getNewTokenPaths(true, imagePaths => {
    if(!imagePaths)return;
    imagePaths.forEach(path => {
      createToken(path.replace(/\\/g, "/"));
    })
  }, {name:name, type:type});
}

function fillCurrentMonsterTokens(entryId, isCopy) {
  document.querySelectorAll(".token").forEach(tok => tok.parentNode.removeChild(tok));

  var paths = getAllTokenPaths(entryId);
  console.log("All token paths for token " + entryId, paths);
  paths.forEach(p => {
    createToken(p, true, isCopy)
  })
}

function getAllTokenPaths(entryId) {
  var paths = [];
  var i = 0;

  while (true) {
    var pathStr = pathModule.join(tokenFilePath, entryId.toLowerCase() + i + ".png");

    if (fs.existsSync(pathStr)) {
      paths.push(pathStr);

      i++;
    } else {
      return paths;
    }
  }
}
var tokenRemoveQueue = [];
function createToken(pathStr, isOldToken, isCopy) {
  console.log("Creating token", pathStr)
  var token = document.createElement("img");
  token.classList.add("token");
  token.setAttribute("data-file_path", pathStr);
  if (!isOldToken || isCopy) {
    token.setAttribute("data-is_new_token", "t");
  }
  token.setAttribute("src", pathStr.replace(/\\/g, "/"));
  token.addEventListener("click", function (e) {

    var isNewToken = e.target.getAttribute("data-is_new_token");
    if (!isNewToken) {
      var tokenToRemove = e.target.getAttribute("data-file_path");
      tokenRemoveQueue.push(tokenToRemove);
    }
    e.target.parentNode.removeChild(e.target);
  });
  document.getElementById("maptool_token_container").appendChild(token);
}

function readHomebrewOrMonsters(callback) {
  if (currentEntry && !writeToHomebrew) {
    return dataAccess.getMonsters(callback);
  } else {
    return dataAccess.getHomebrewMonsters(callback);
  }
}

function writeHomebrewOrMonsters(data, callback) {
  if (currentEntry && !writeToHomebrew) {
    return dataAccess.setMonsters(data, callback)
  } else {
    return dataAccess.setHomebrewMonsters(data, callback)
  }

}

function copyEntry(entryId) {
  showAddForm("tab");
  editCopyHelper(entryId)
}

/**
 * Fyllir út í viðgeidandi fields í add glugganum út frá gefnum upplýsingum í jsoni
 * @param {*} entryId strengur sem tekur id færslu sem á að fylla út reitina 
 */

function editEntry(entryId) {
  editCopyHelper(entryId, true)

}

function clearAddForm() {
  var element = document.getElementById("add" + tabElementNameSuffix);
  //Brute force this
  [...element.querySelectorAll("input, textarea")].forEach(input => {
    if (!input.readOnly)
      input.value = "";
  });
  document.getElementById("homebrewAC").removeAttribute("data-user_override")
  currentEntry = null;
  var letter = getLetterFromTabName();
  if (letter == "") {
    document.querySelectorAll(".token").forEach(tok => tok.parentNode.removeChild(tok));
    var tagCont = document.querySelector("#addmonster_tag_container");
    while (tagCont.firstChild) tagCont.removeChild(tagCont.firstChild);
  }
  if (letter == "C") document.getElementById("condition_image_picker").setAttribute("src", "");
  addMonsterChanged();
}

function addMonsterChanged() {
  var value = document.querySelector("#addmonster_name").value;
  var infoBtn = document.getElementById("monster_tag_suggestion_info_button");
  if (!value) {
    infoBtn.classList.add("hidden");
    return;
  }
  var monsterSplit = value.trim().toLowerCase().split(" ");
  var tagSuggestions = new Set();
  monsterSplit.forEach(monsterName => {
    constants.creature_habitats.forEach(habitat => {
      if (habitat.creatures.find(x => x == monsterName || x.split(" ").find(y => y == monsterName)) && !tagExists(habitat.name)) {
        tagSuggestions.add(habitat.name);
      }
    });
  });

  var addBtn = document.getElementById("add_tags_from_sugestion_button");
  tagSuggestions = [...tagSuggestions];
  addBtn.setAttribute("data-suggestions", JSON.stringify(tagSuggestions))
  if (tagSuggestions.length == 0) {
    infoBtn.classList.add("hidden");
    return;
  }
  var cont = document.querySelector("#monster_tag_suggestion_info_button .monster_tag_suggestion_container");
  while (cont.firstChild)
    cont.removeChild(cont.firstChild);
  infoBtn.classList.remove("hidden");
  var p = document.createElement("p");
  p.innerHTML = tagSuggestions.join(", ");
  cont.appendChild(p);

}

function getLetterFromTabName() {

  if (tab == "monsters" || tab == "homebrew")
    return "";
  return tab.substring(0, 1).toUpperCase(); //Verður "I" eða "E" eða "S"
}

function editCopyHelper(entryId, isEdit) {
  clearAddForm();
  var entry;
  if (entryId) {
    entry = loadedData.find(x => {
      return x.id == entryId
    });
    if (!entry.description) entry.description = "";
  }

  if (isEdit) {
    currentEntry = { name: entry.name, id: entryId };
    $("#add" + tabElementNameSuffix + ">.edit_header_name").html("Editing " + entry.name);
  } else {
    $("#add" + tabElementNameSuffix + ">.edit_header_name").html("New " + (tab.charAt(tab.length - 1) === "s" ? tab.substring(0, tab.length - 1) : tab));
  }
  showAddForm("tab");

  $("#add" + tabElementNameSuffix + " .save_button")[0].disabled = false;
  var letter = getLetterFromTabName();
  if (letter == "") {
    document.getElementById("addTokenButton").disabled = false;
    fillCurrentMonsterTokens(entryId, !isEdit);
  }
  editObject(entry, letter);
}

function editSpell(dataObject) {
  fillClasses(dataObject);
  ["name", "level", "description", "casting_time", "duration", "higher_levels", "range", "components", "school"].
    forEach(prop => {
      var box = document.querySelector(".spell_" + prop);
      box.value = dataObject[prop];

    });

  function fillClasses(dataObject) {
    var classes = dataObject.classes;
    if (classes == null) return;

    var classBoxes = document.querySelectorAll(".jsonValueClasses");
    var difference = classes.length - classBoxes.length;

    if (difference > 0) {
      for (var k = 0; k < difference; k++) {
        addClassTextBoxForSpells();
      }
    }
    classBoxes = document.querySelectorAll(".jsonValueClasses");
    for (var k = 0; k < classes.length; k++) {
      classBoxes[k].value = classes[k];
    }
    delete dataObject.classes;
  }
}

const hiddenAttributes = ["source", "id"];
function editObject(dataObject, letter) {
  if (letter == "S") {
    return editSpell(dataObject);
  } else if (letter === "E") {
    return editEncounter(dataObject)
  } else if (letter === "") {
    addTags(dataObject);
    addACSource(dataObject);
  } else if (letter == "I") {
    return editItem(dataObject);
  }

  var valuesElements = [...document.querySelectorAll(".jsonValue" + letter)];
  var keysElements = [...document.querySelectorAll(".jsonAttribute" + letter)];
  keysElements.forEach(x => x.value = "");
  valuesElements.forEach(x => x.value = "");

  hiddenAttributes.forEach(attr => { if (dataObject[attr]) delete dataObject[attr] })


  var loadedKeys = Object.keys(dataObject);
  var loadedValues = Object.values(dataObject);

  document.getElementById("condition_image_picker").setAttribute("src", "");

  checkIfTableExistsAndRemove(loadedKeys, loadedValues);
  removeFromObject("condition_color_value", loadedKeys, loadedValues);
  removeFromObject("condition_background_location", loadedKeys, loadedValues);
  removeFromObject("encounter_xp_value", loadedKeys, loadedValues);

  if (letter === "") {
    fillNpcRequiredStats(loadedKeys, loadedValues);
  }


  if (letter == "" && addFieldsIfNeeded(loadedKeys.length - valuesElements.length)) {
    valuesElements = [...document.querySelectorAll(".jsonValue" + letter)];
    keysElements = [...document.querySelectorAll(".jsonAttribute" + letter)];
  }

  for (var i = 0; i < loadedKeys.length; i++) {
    if (["number", "string"].indexOf(typeof loadedValues[i]) != -1) {
      valuesElements[i].value = "" + loadedValues[i];
      keysElements[i].value = "" + loadedKeys[i].deserialize();

    } else {
      if (loadedKeys[i] == "actions" || loadedKeys[i] == "legendary_actions") {
        var actionRows = document.querySelectorAll(loadedKeys[i] == "actions" ? ".action_row" : ".legendary_action_row");
        var difference = loadedValues[i].length - actionRows.length;

        //Tékka hvort það séu nógu margir fields og bæta við ef þarf. 
        if (difference > 0) {
          for (var diff = 0; diff < difference; diff++) {
            addRow(loadedKeys[i]);
          }
          actionRows = document.querySelectorAll(loadedKeys[i] == "actions" ? ".action_row" : ".legendary_action_row");
        }


        for (var j = 0; j < loadedValues[i].length; j++) {
          var currentAction = loadedValues[i][j];
          if (currentAction.name != null) actionRows[j].getElementsByClassName("action_name")[0].value = currentAction.name;
          if (currentAction.attack_bonus != null) actionRows[j].getElementsByClassName("action_attack_bonus")[0].value = currentAction.attack_bonus;
          if (currentAction.damage_dice != null) actionRows[j].getElementsByClassName("action_damage_dice")[0].value = currentAction.damage_dice;
          if (currentAction.damage_bonus != null) actionRows[j].getElementsByClassName("action_damage_bonus")[0].value = currentAction.damage_bonus;
          if (currentAction.description != null) actionRows[j].getElementsByClassName("action_description")[0].value = currentAction.description;

        }
      } else if (loadedKeys[i] == "special_abilities" || loadedKeys[i] == "creatures") {
        subvalues = document.querySelectorAll(".specialjsonValue" + letter);
        subkeys = document.querySelectorAll(".specialjsonAttribute" + letter);

        subvalues.forEach(function (x) { x.value = "" });
        subkeys.forEach(function (x) { x.value = "" });
        var specialAbility = loadedValues[i];

        if (specialAbility.length > subkeys.length) {
          for (var k = 0; k <= specialAbility.length - subkeys.length; k++) {
            addRow(loadedKeys[i]);
          }
          subvalues = document.querySelectorAll(".specialjsonValue" + letter);
          subkeys = document.querySelectorAll(".specialjsonAttribute" + letter);
        }

        for (var j = 0; j < specialAbility.length; j++) {
          subvalues[j].value = Object.values(specialAbility[j])[0];
          subkeys[j].value = Object.keys(specialAbility[j])[0].deserialize();
        }

      } else if (loadedKeys[i] == "description") {
        var descriptionStringCompacted = "";

        for (var j = 0; j < loadedValues[i].length; j++) {
          if (typeof loadedValues[i][j] === "string") {
            descriptionStringCompacted += loadedValues[i][j] + "\n";
          } else {
            if (loadedValues[i][j]["table"] != null) {
              populateTable(loadedValues[i][j]["table"]);
            }

          }

        }

        valuesElements[i].value = descriptionStringCompacted;
      } else if (loadedKeys[i] === "reactions") {
        addReactionsToForm(loadedValues[i]);
      }

    }

  }
  if (tab == "conditions") {
    if (dataObject["condition_background_location"]) {
      document.getElementById("condition_image_picker").setAttribute("src", dataObject["condition_background_location"]);
    }
  }
  calculateSuggestedCR();
  window.scrollTo(0, document.body.scrollHeight);

  function addReactionsToForm(reactionArr) {
    var subvalues = document.querySelectorAll(".reaction_row>.reaction_value");
    var diff = reactionArr.length - subvalues.length;
    while (diff > 0) {
      addRow("reactions");
      diff--;
    }
    subvalues = document.querySelectorAll(".reaction_row>.reaction_value");
    subkeys = document.querySelectorAll(".reaction_row>.reaction_name");
    for (var j = 0; j < reactionArr.length; j++) {
      var name = Object.keys(reactionArr[j])[0];
      var value = Object.values(reactionArr[j])[0];
      subvalues[j].value = value;
      subkeys[j].value = name.deserialize();
    }

  }
  function addTags(dataObject) {
    var tags = [];
    if (dataObject.tags && dataObject.tags.length > 0) {
      tags = dataObject.tags;
      delete dataObject.tags;
    }
    monsterTags.awesomplete.list = [...monsterTags.list.filter(x => tags.indexOf(x) < 0)];
    tags.forEach(tag => addNpcTag(tag))
  }
  function addACSource(dataObject) {
    if (!dataObject.ac_source) return;
    document.getElementById("addmonster_ac_source").value = dataObject.ac_source.join(", ").toProperCase();
    delete dataObject.ac_source;
  }
  function fillFieldAndRemoveFromObject(property, keys, values) {
    var valueElement = document.getElementsByClassName("addmonster_" + property)[0];
    if (valueElement == null) {
      return console.log(property, " is undefined")
    }
    var val = removeFromObject(property, keys, values);
    valueElement.value = val ? val : "";
  }

  function editItem(dataObject) {
    ["name", "description", "type", "rarity"].forEach(prop => {
      document.querySelector(`.additem_${prop}`).value = dataObject[prop];
    });
    document.querySelector(".additem_requires_attunement").checked = dataObject.requires_attunement;
    document.querySelector(".additem_requires_attunement_by").value = dataObject.requires_attunement_by || "";
    if (dataObject.table)
      populateTable(dataObject.table);
  }

  function editEncounter(dataObject) {

    var nameField = document.querySelector(".object_nameE");
    nameField.value = dataObject.name;
    document.querySelector(".add_encounter_description").value = dataObject.description;

    var diff = dataObject.creatures.length - document.querySelectorAll(".specialjsonAttributeE").length;
    addFieldsIfNeeded(diff);
    var nameFields = document.querySelectorAll(".specialjsonAttributeE");
    var countFields = document.querySelectorAll(".specialjsonValueE");
    for (var i = 0; i < nameFields.length; i++) {
      if (!dataObject.creatures[i]) break;
      var name = Object.keys(dataObject.creatures[i])[0].toProperCase();
      var count = Object.values(dataObject.creatures[i])[0];
      nameFields[i].value = name.deserialize();
      countFields[i].value = count;
      showCRForCreature(nameFields[i]);
    }
  }

  function removeFromObject(property, keys, values) {
    var i;
    for (i = 0; i < values.length; i++) {
      if (keys[i] == property) {
        var ret = values[i];
        keys.splice(i, 1);
        values.splice(i, 1);
        return ret;
      }
    }
  }
  function addFieldsIfNeeded(diff) {
    var added = false;
    console.log("Adding fields " + diff)
    for (var diffi = 0; diffi < diff; diffi++) {
      addRow();
      added = true;
    }
    return added;
  }
  function checkIfTableExistsAndRemove(keyArray, valueArray) {
    var index = keyArray.indexOf("table");
    if (index < 0) {
      return;
    }
    populateTable(valueArray[index])
    keyArray.splice(index, 1);
    valueArray.splice(index, 1);
  }

  function fillNpcRequiredStats(keyArray, valueArray) {
    var legActionFields = document.querySelectorAll(".legendaryjsonValue");
    var actionFields = document.querySelectorAll(".actionjsonValue");
    var actionFields = document.querySelectorAll(".actionjsonValue");
    var specialAttrFields = document.querySelectorAll(".specialjsonAttribute");
    var specialFields = document.querySelectorAll(".specialjsonValue");

    ["name", "size", "description", "type", "hit_dice", "speed", "strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma", "senses", "languages"
      , "challenge_rating", "subtype", "alignment", "armor_class", "hit_points", "skills",
      "damage_resistances", "damage_immunities", "condition_immunities", "damage_vulnerabilities"].forEach(entry => fillFieldAndRemoveFromObject(entry, keyArray, valueArray));

    document.querySelector("#addmonster_unique").checked = removeFromObject("unique", keyArray, valueArray);

    var savingThrowInputs = [...document.querySelectorAll(".saving_throw_input")];
    savingThrowInputs.forEach(inp => {
      var attr = inp.getAttribute("data-dnd_attr");
      for (var i = 0; i < keyArray.length; i++) {
        if (keyArray[i] != attr) continue;
        inp.value = valueArray[i];
        removeFromObject(attr, keyArray, valueArray);
        break;
      }
    });
    valuesElements.forEach(function (x) { x.value = "" });
    keysElements.forEach(function (x) { x.value = "" });
    actionFields.forEach(function (x) { x.value = "" })
    specialFields.forEach(function (x) { x.value = "" })
    specialAttrFields.forEach(function (x) { x.value = "" })
    legActionFields.forEach(function (x) { x.value = "" })
  }
}

function tagExists(tagName) {
  var cont = document.querySelector("#addmonster_tag_container");
  var exists;
  [...cont.querySelectorAll("para")].forEach(p => {
    if (p.innerHTML == tagName) exists = true;
  });
  return exists;
}

function addNpcTag(tagName) {
  if (!tagName || tagExists(tagName)) return;
  var cont = document.querySelector("#addmonster_tag_container");
  cont.appendChild(elementCreator.createDeletableParagraph(tagName));
  if (monsterTags.list.indexOf(tagName) < 0) {
    monsterTags.list.push(tagName);
  }
}

function populateTable(tableArray) {
  showTableElements();
  var letter = tab.substring(0, 1).toUpperCase();
  var headers = document.querySelectorAll(".table_header" + letter);
  var rowCells = document.querySelectorAll(".table_element" + letter);
  var columnCount = headers.length;
  var rowCount = rowCells.length / columnCount;


  var headerValues = Object.keys(tableArray)
  var elementArray = Object.values(tableArray);


  //Dálkar í DOMI eru færri en dálkar í json fylki
  if (headerValues.length > columnCount) {
    for (var i = columnCount; i < headerValues.length; i++) {
      resizeTable(0, 1);
    }
    //Dálkar í DOMI eru fleiri
  } else if (headerValues.length < columnCount) {
    for (var i = headerValues.length; i < columnCount; i++) {
      resizeTable(0, 0);
    }
  }

  //Raðir færri í DOMI
  if (elementArray[0].length > rowCount) {
    for (var i = rowCount; i < elementArray[0].length; i++) {
      resizeTable(1, 1);
    }
    //Raðir í fleiri í DOMI
  } else if (rowCount > elementArray[0].length) {
    for (var i = elementArray[0].length; i < rowCount; i++) {
      resizeTable(1, 0);
    }

  }

  //Fylla út í töflu
  rowCells = document.querySelectorAll(".table_element" + letter);
  headers = document.querySelectorAll(".table_header" + letter);
  for (var i = 0; i < headers.length; i++) {
    headers[i].value = headerValues[i];
  }


  for (var i = 0; i < headers.length; i++) {
    for (var j = 0; j < elementArray[0].length; j++) {
      rowCells[i + (j * headers.length)].value = elementArray[i][j]

    }

  }
}



function copyParentHandler(button) {
  var toEdit = button.closest(".listRow").getAttribute("data-entry_id");
  copyEntry(toEdit);
}

function editParentHandler(button) {
  var toEdit = button.closest(".listRow").getAttribute("data-entry_id");
  editEntry(toEdit);
}


function removeParentHandler(button) {
  var toRemove = button.closest(".listRow").getAttribute("data-entry_id");
  var name = button.closest(".listRow").querySelector(".listRow__inner").getElementsByTagName("input")[0].value;
  if (window.confirm("Remove " + name + " from database?")) {
    deleteFromHomebrew(toRemove);
    jQuery(this).parent().remove();
  }
}


function addLookupHandlers() {
  $(".listRow").children(".listRow__inner").off("click");
  $(".listRow").children(".listRow__inner").on("click", function (e) {
    if ($(this).parent().hasClass("selected_row")) {
      hideStatblock();
      document.querySelectorAll(".selected_row").forEach(e => e.classList.remove("selected_row"));
      return;
    }
    window.scrollTo(0, 110);
    searchFor($(this).parent().attr("data-entry_id"));
    document.querySelectorAll(".selected_row").forEach(e => e.classList.remove("selected_row"));

    $(this).parent().addClass("selected_row");
    this.parentNode.parentNode.insertBefore(document.getElementById("statblock"), this.parentNode.nextSibling);

  });

}

function addSorters() {
  $("#listFrame__" + tabElementNameSuffix + ">.listRow_header>.listRow__inner>input").off("click");
  $("#listFrame__" + tabElementNameSuffix + ">.listRow_header>.listRow__inner>input").on("click", function () {
    sortBy(this.value);
    listAll();
    hide("statblock");

  });
}


function sortBy(sorter) {

  switch (sorter) {
    case "Name":

      reverseName = !reverseName;

      if (!reverseName) {
        sortFunction = function (a, b) {
          var s = a.name.toLowerCase();
          var k = b.name.toLowerCase();
          if (s > k) return 1;
          if (s < k) return -1;
          return 0;

        };
      } else {
        sortFunction = function (a, b) {
          var s = a.name.toLowerCase();
          var k = b.name.toLowerCase();
          if (s < k) return 1;
          if (s > k) return -1;
          return 0;

        };


      }

      break;

    case "CR":

      reverseSize = !reverseSize;

      if (!reverseSize) {
        sortFunction = function (a, b) {
          var s = encounterModule.parseCR(a.challenge_rating);
          var k = encounterModule.parseCR(b.challenge_rating);
          if (s > k) return 1;
          if (s < k) return -1;
          if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
          if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;
          return 0;

        };
      } else {
        sortFunction = function (a, b) {
          var s = encounterModule.parseCR(a.challenge_rating);
          var k = encounterModule.parseCR(b.challenge_rating);
          if (s < k) return 1;
          if (s > k) return -1;
          if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
          if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;
          return 0;

        };


      }
      break;

    case "Cast time":
      reverseSize = !reverseSize;

      if (!reverseSize) {
        sortFunction = function (a, b) {
          var s = a.casting_time.toLowerCase();
          var k = b.casting_time.toLowerCase();
          if (s > k) return 1;
          if (s < k) return -1;
          if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
          if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;
          return 0;

        };
      } else {
        sortFunction = function (a, b) {
          var s = a.casting_time.toLowerCase();
          var k = b.casting_time.toLowerCase();
          if (s < k) return 1;
          if (s > k) return -1;
          if (a.name.toLowerCase() > b.name.toLowerCase()) return -1;
          if (a.name.toLowerCase() < b.name.toLowerCase()) return 1;
          return 0;

        };


      }

      break;

    case "Type":
      reverseType = !reverseType;
      if (!reverseType) {
        sortFunction = function (a, b) {
          var s = a.type.toLowerCase();
          var k = b.type.toLowerCase();
          if (s > k) return 1;
          if (s < k) return -1;
          if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
          if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;
          return 0;

        };
      } else {
        sortFunction = function (a, b) {
          var s = a.type?.toLowerCase();
          var k = b.type?.toLowerCase();
          if (!k) return 1;
          if (!s) return -1;
          if (s < k) return 1;
          if (s > k) return -1;
          if (a.name.toLowerCase() > b.name.toLowerCase()) return -1;
          if (a.name.toLowerCase() < b.name.toLowerCase()) return 1;
          return 0;
        };
      }

      break;
    case "School":
      reverseType = !reverseType;
      if (!reverseType) {
        sortFunction = function (a, b) {
          var s = a.school.toLowerCase();
          var k = b.school.toLowerCase();
          if (s > k) return 1;
          if (s < k) return -1;
          if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
          if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;
          return 0;

        };
      } else {
        sortFunction = function (a, b) {
          var s = a.school.toLowerCase();
          var k = b.school.toLowerCase();
          if (s < k) return 1;
          if (s > k) return -1;
          if (a.name.toLowerCase() > b.name.toLowerCase()) return -1;
          if (a.name.toLowerCase() < b.name.toLowerCase()) return 1;
          return 0;
        };
      }

      break;
    case "HP":


      reverseHP = !reverseHP;
      if (!reverseHP) {
        sortFunction = function (a, b) {
          return a.hit_points - b.hit_points;
        };
      } else {
        sortFunction = function (a, b) {
          return b.hit_points - a.hit_points;
        };
      }

      break;


    case "Level":
      reverseHP = !reverseHP;
      if (!reverseHP) {
        sortFunction = function (a, b) {
          return a.level - b.level;
        };
      } else {
        sortFunction = function (a, b) {
          return b.level - a.level;
        };
      }

      break;

    case "Rarity":
      reverseRarity = !reverseRarity;
      if (!reverseRarity) {
        sortFunction = function (a, b) {
          var s = evaluateRarity(a.rarity.toLowerCase());
          var k = evaluateRarity(b.rarity.toLowerCase());
          return s - k;
        };
      } else {
        sortFunction = function (a, b) {
          var s = evaluateRarity(a.rarity.toLowerCase());
          var k = evaluateRarity(b.rarity.toLowerCase());
          return k - s;
        };
      }

      break;
  }

}


function searchFor(id) {

  readDataFunction(function (data) {
    lookFor(id, data);
    document.getElementById("iframeWrapper").classList.remove("hidden");
  });

  return false;

}

function addRow(str) {
  var container;
  var className;
  if (str != null) {

    if (str == "special_abilities" || str == "actions") {
      while (specialAbilityAndActionAwesompletes.length > 0)
        specialAbilityAndActionAwesompletes.pop().destroy();
      $(".addRow_" + str + ">.row:first-child").first().clone().appendTo($(".addRow_" + str));;

      return populateAddableFieldDropdowns();
    }
    $(".addRow_" + str + ">.row:first-child").first().clone().appendTo($(".addRow_" + str));
    return;
  }
  if (tab == "monsters" || tab == "homebrew") {
    container = ".addRow";
    child = "nth-child(21)";
    className = "jsonValue";
  }
  //sértilfelli því það veldur bugs að klóna awesomplete
  if (tab == "encounters") {
    var newRow = document.createElement("div");
    newRow.classList.add("row");

    var newCreatureInput = document.createElement("input");
    newCreatureInput.setAttribute("placeholder", "Creature");
    newCreatureInput.classList.add("specialjsonAttributeE");
    newRow.appendChild(newCreatureInput);

    var newNumberOfCreatures = document.createElement("input");
    newNumberOfCreatures.setAttribute("type", "number");
    newNumberOfCreatures.classList.add("specialjsonValueE", "smaller");
    newRow.appendChild(newNumberOfCreatures);

    var newCreatureCr = document.createElement("input");
    newCreatureCr.setAttribute("type", "number");
    newCreatureCr.setAttribute("placeholder", "CR");
    newCreatureCr.setAttribute("min", "0");
    newCreatureCr.setAttribute("max", "30");
    newCreatureCr.classList.add("encounter_creature_cr", "smaller");
    newRow.appendChild(newCreatureCr);

    [newCreatureInput, newNumberOfCreatures, newCreatureCr].forEach(element => element.setAttribute("tabindex", "1"));
    document.getElementById("encounter_row_container").appendChild(newRow);
    addEncounterCalculatorHandlers();

    updateAutoFill();
  } else {
    var newRow = $(container + ">.row>.jsonAttribute").first().parent().clone();
    var nodes = newRow.find("." + className);
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].value = "";
    }
    newRow.appendTo(container);
  }

}


function AddActionArray(attributeKey, rowElementClass, thingyToSave) {
  var rows = document.querySelectorAll(rowElementClass);
  var actionArr = [];
  rows.forEach(row => {
    var obj = {};
    ["name", "attack_bonus", "damage_dice", "damage_bonus", "description"].forEach(property => {
      var value = row.querySelector(".action_" + property).value;
      if (value) obj[property] = value;
    });
    if (Object.keys(obj).length === 0 && obj.constructor === Object) return;
    actionArr.push(obj);
  });


  if (actionArr.length != 0) thingyToSave[attributeKey.serialize()] = actionArr;
}

//Data has name attribute, return index  of
// entry with key name. Returns -1 if not found.
function indexOfName(data, key) {
  return indexOfProp(data, key, "name");
}

//Data has name attribute, return index  of
// entry with key name. Returns -1 if not found.
function indexOfId(data, key) {
  return indexOfProp(data, key, "id");
}

function indexOfProp(data, key, prop) {
  var index = 0;
  if (data == null || key == null || data.length == 0) return -1;
  while (data[index][prop] != key) {
    index++;
    if (index >= data.length) {
      return -1;
    }
  }
  return index;
}



function saveHomebrew() {

  var letter = tab == "monsters" || tab == "homebrew" ? "" : tab.substring(0, 1).toUpperCase();
  var valueBoxes = document.getElementsByClassName("jsonValue" + letter);
  var attributeBoxes = document.getElementsByClassName("jsonAttribute" + letter);
  var name = document.querySelector(".object_name" + letter).value;
  if (name == "") {
    $('#save_failed').finish().fadeIn("fast").delay(2500).fadeOut("slow");
    document.getElementById("save_failed").innerHTML = "Cannot save an entry without a name"
    window.scroll(0, 0);
    return;
  }

  readDataFunction(data => {
    var thingyToSave = data.find(x => x.id == currentEntry?.id) || { id: null };

    var attribute;

    if (tab == "spells") {
      //Classes
      var classValueBoxes = document.querySelectorAll(".jsonValueClasses");
      var classes = [];
      classValueBoxes.forEach(function (element) {
        if (element.value != "") classes.push(element.value.toLowerCase().trim());
      });
      thingyToSave.classes = classes;
      thingyToSave.ritual = document.getElementById("ritual_casting_spell_checkbox").checked;
      addProperty("name", thingyToSave, null, "spell_");
      addProperty("description", thingyToSave, null, "spell_");
      addProperty("school", thingyToSave, null, "spell_");
      addProperty("range", thingyToSave, null, "spell_");
      addProperty("duration", thingyToSave, null, "spell_");
      addProperty("level", thingyToSave, null, "spell_");
      addProperty("components", thingyToSave, null, "spell_");
      addProperty("casting_time", thingyToSave, null, "spell_");
      addProperty("higher_levels", thingyToSave, null, "spell_");
    }
    if (tab == "monsters" || tab == "homebrew") {
      addProperty("name", thingyToSave);
      addProperty("size", thingyToSave, "Medium");
      addProperty("description", thingyToSave);
      addProperty("type", thingyToSave)
      addProperty("subtype", thingyToSave)
      addProperty("alignment", thingyToSave, "Unaligned")
      addProperty("armor_class", thingyToSave)
      addProperty("hit_points", thingyToSave)
      addProperty("hit_dice", thingyToSave);
      addProperty("ac_source", thingyToSave)
      addProperty("speed", thingyToSave)
      addProperty("strength", thingyToSave, 8)
      addProperty("dexterity", thingyToSave, 8)
      addProperty("constitution", thingyToSave, 8)
      addProperty("intelligence", thingyToSave, 8)
      addProperty("wisdom", thingyToSave, 8)
      addProperty("charisma", thingyToSave, 8)
      addProperty("senses", thingyToSave)
      addProperty("damage_resistances", thingyToSave)
      addProperty("damage_immunities", thingyToSave);
      addProperty("damage_vulnerabilities", thingyToSave)
      addProperty("condition_immunities", thingyToSave)
      addProperty("languages", thingyToSave)
      addProperty("skills", thingyToSave);
      addProperty("challenge_rating", thingyToSave, 0);
      thingyToSave.ac_source = document.getElementById("addmonster_ac_source").value.split(",");
      thingyToSave.tags = [...document.querySelectorAll("#addmonster_tag_container para")].map(x => x.innerHTML);

      thingyToSave.unique = document.querySelector("#addmonster_unique").checked;
      var savingThrowInputs = [...document.querySelectorAll(".saving_throw_input")];
      savingThrowInputs.forEach(inp => {
        var attr = inp.getAttribute("data-dnd_attr");
        if (inp.value != null && inp.value != "" && inp.value != "0") {
          thingyToSave[attr] = inp.value;
        }
      });
    } else if (tab == "encounters") {
      thingyToSave.encounter_xp_value = parseInt(document.querySelector("#encounter_challenge_calculator_value").value);
    }
    else if (tab == "items") {
      thingyToSave.requires_attunement = document.querySelector(".additem_requires_attunement").checked;
      thingyToSave.requires_attunement_by = document.querySelector(".additem_requires_attunement_by").value || "";
    }
    //Populate normal attributes

    for (var i = 0; i < valueBoxes.length; i++) {

      if ((attributeBoxes[i].value != "" && valueBoxes[i].value != "" && valueBoxes[i].value != " ") ||
        (tab != "monsters" && tab != "homebrew")) {
        attribute = attributeBoxes[i].value.serialize();
        thingyToSave[attribute] = valueBoxes[i].value;

      }
    }

    //populate special abilities
    if (tab == "monsters" || tab == "homebrew") {

      valueBoxes = document.querySelectorAll(".addRow_special_abilities .specialjsonValue");
      attributeBoxes = document.querySelectorAll(".addRow_special_abilities .specialjsonAttribute");
      var attribute = "special_abilities";

      //populate actions
      AddActionArray("actions", ".action_row", thingyToSave);
      //populate legendary actions
      AddActionArray("legendary_actions", ".legendary_action_row", thingyToSave);
      //Populate special abilities


      AddReactions(thingyToSave);
    } else if (tab == "encounters") {
      valueBoxes = document.getElementsByClassName("specialjsonValueE");
      attributeBoxes = document.getElementsByClassName("specialjsonAttributeE");
      var attribute = "creatures";
    }

    if (tab == "monsters" || tab == "encounters" || tab == "homebrew") {
      var specialActions = [];
      var specialAction = {};
      for (var i = 0; i < valueBoxes.length; i++) {

        if (attributeBoxes[i].value != "" && valueBoxes[i].value != "" && valueBoxes[i].value != " ") {
          specialAction = {};

          specialAction[serialize(attributeBoxes[i].value)] = valueBoxes[i].value;
          specialActions.push(specialAction);

        }
      }
      console.log(attribute, valueBoxes, attributeBoxes)
      thingyToSave[attribute] = specialActions;

    }
    //Populate tables
    else if (tab == "items" || tab == "tables") {
      var tableObject = {};

      //Fylla út í töflu
      rowCells = document.querySelectorAll(".table_element" + letter);
      headers = document.querySelectorAll(".table_header" + letter);
      var currentColumn;
      for (var i = 0; i < headers.length; i++) {
        currentColumn = [];
        for (var j = 0; j < rowCells.length / headers.length; j++) {
          currentColumn.push(rowCells[i + (j * headers.length)].value)
        }

        if (headers[i].value != "") tableObject[headers[i].value] = currentColumn;
      }


      thingyToSave.source = thingyToSave.source || "Homebrew";

      if (Object.keys(tableObject).length != 0) thingyToSave.table = tableObject;
    } else if (tab == "conditions") {
      thingyToSave.condition_background_location = document.querySelector("#condition_image_picker").getAttribute("src");
    }

    //Search for existing entry
    saveDataObject(thingyToSave);


    function saveDataObject(thingyToSave) {
      console.log("CurrentlyEditing ", currentEntry)
      if (!thingyToSave.id) thingyToSave.id = uniqueID();
      if (tab == "monsters" && !currentEntry) {
        return handleDataSave(thingyToSave, dataAccess.getHomebrewMonsters, dataAccess.setHomebrewMonsters)
      } else {
        return handleDataSave(thingyToSave, readDataFunction, writeDataFunction);
      }

      function handleDataSave(thingyToSave, getFunction, setFunction) {
        getFunction(function (data) {

          if (currentEntry) {
            data = data.filter(d => d.id != currentEntry.id)
          }


          data.push(thingyToSave);
          data = data.sort(function (a, b) {
            if (a.name < b.name) return -1;
            if (b.name < a.name) return 1;
            return 0;
          })
          setFunction(data, function (err) {
            // hide('add' + tabElementNameSuffix);
            $('#save_success').finish().fadeIn("fast").delay(2500).fadeOut("slow");
            document.querySelector("#save_success").scrollIntoView({ block: "end", inline: "nearest" });

            if (tab == "monsters" || tab == "homebrew") {
              if (tokenRemoveQueue.length == 0) {
                saveTokens(thingyToSave.id);
              } else {
                while (tokenRemoveQueue.length > 0) {
                  fs.unlink(tokenRemoveQueue.pop(), (err) => {
                    if (err) throw err;
                    if (tokenRemoveQueue.length == 0)
                      saveTokens(thingyToSave.id);
                  });
                }
              }

              tokenRemoveQueue = [];

              window.setTimeout(function () {
                dataAccess.getTags(function (tags) {
                  monsterTags.list = tags;
                  createMonsterListFilterDropdown(tags, "monsters_list_tag_select");
                });
              }, 1500)
            }

            let window2 = remote.getGlobal('mainWindow');
            if (window2) window2.webContents.send('update-autofill');

          });

        })
      }
    }
    function saveTokens(newId) {

      //Move tokens
      if (tab == "monsters" || tab == "homebrew") {
        var tokens = [...document.querySelectorAll(".token")];
        tokens = tokens.filter(x => x.getAttribute("data-is_new_token"));
        if (tokens.length == 0) return;

        var i = 0;
        while (fs.existsSync(pathModule.resolve(tokenFilePath + "/" + newId.toLowerCase() + i + ".png")))
          i++;
        tokens.forEach(tok => {
          var oldPath = pathModule.resolve(tok.getAttribute("data-file_path"));
          var newPath = pathModule.resolve(tokenFilePath + "/" + newId.toLowerCase() + i + ".png");
          if (newPath == oldPath) return;
          dataAccess.saveToken(newId.toLowerCase() + i, oldPath, document.querySelector("#trim_token_checkbox").checked);
          i++;
        });
      }

      currentEntry = null;
      hide(`addframe_${tab}`)
      $("#add" + tabElementNameSuffix + ">.edit_header_name").html("New " + (tab.charAt(tab.length - 1) === "s" ? tab.substring(0, tab.length - 1) : tab));
      loadAll();


    }
    function addProperty(property, object, fallbackValue, classPrefix) {

      var valueElement = document.getElementsByClassName((classPrefix ? classPrefix : "addmonster_") + property)[0];

      if (valueElement.value == "" && !fallbackValue) return;
      object[property] = valueElement.value ? valueElement.value : fallbackValue;
    }

    function AddReactions(thingyToSave) {
      var reactionRows = [...document.querySelectorAll(".addRow_reactions>.reaction_row")];
      var reactionArr = [];
      reactionRows.forEach(row => {
        var key = row.querySelector(".reaction_name").value;
        var value = row.querySelector(".reaction_value").value;
        console.log(key, value)
        var obj = {};
        if (key && value) {
          obj[key.serialize()] = value;
          reactionArr.push(obj);
        }

      });
      if (reactionArr.length > 0)
        thingyToSave.reactions = reactionArr;
    }
  });
}


// data: Dataset to look in, must contain attribute "name".
//combat: Whether the entity should be loaded into combat system.

function lookFor(id, data) {
  for (var i = 0; i < Object.keys(data).length; i++) {

    if (data[i].id == id) {

      foundMonster = data[i];
      console.log(tab)
      new StatblockPresenter(document.getElementById("statblock"), foundMonster, (tab == "monsters" || tab == "homebrew") ? "monsters" : tab)
      showAddForm("statblock");
      return true;
    }
  }
  return false;
}

/**Býr til html töflu úr json obj sem hefur uppbyggingu
 * "h1"[1,2,3],
 * "h2"[3,4,5].
 **/
function generateHTMLTable(jsonObj) {

  var expectedLength = Object.values(jsonObj)[0].length;
  for (var i = 1; i < Object.values(jsonObj).length; i++) {
    if (Object.values(jsonObj)[i].length != expectedLength) {
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
    newNode.innerHTML = arr;
    currentRow.appendChild(newNode);
  }
  currentHeader = document.createElement("tbody");
  for (var i = 0; i < expectedLength; i++) {
    currentRow = document.createElement("tr");
    currentHeader.appendChild(currentRow);
    for (var j = 0; j < columnCount; j++) {
      newNode = document.createElement("td");
      newNode.innerHTML = Object.values(jsonObj)[j][i];
      currentRow.appendChild(newNode);

    }
  }
  newTable.appendChild(currentHeader);
  return newTable;
}

function evaluateRarity(str) {
  switch (str) {
    case "common":
      return 0;

    case "uncommon":
      return 1

    case "rare":
      return 2;

    case "very rare":
      return 3;
    case "legendary":
      return 4;
    case "artifact":
      return 5;

  }
  return -1;
}





