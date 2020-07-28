
var tab = "monsters", tabElementNameSuffix = "monsters";
const { ipcRenderer } = require('electron');


var fileName;

var marked = require('marked');
var noUiSlider = require('nouislider');
marked.setOptions({
  renderer: new marked.Renderer(),
  gfm: true,
  tables: true,
  breaks: true,
  pedantic: true,
  sanitize: false,
  smartLists: false,
  smartypants: true
});

var tokenFilePath;

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
var settings;
var partyArray;
var currentEntryName, currentlyEditingEntry;

setTab("homebrew"); //Default to NPC

ipcRenderer.on('update-autofill-complete', function () {
  console.log("Notified that autocomplete list is updated.")
  updateAutoFill();

});
/*
function fixSpells() {
 
  fs.readFile(resourcePath + "spells.json", function read(err, data) {
    if (err) {
      return console.log(err);
    }

    data = JSON.parse(data);
    for(var i = 0 ;  i<data.length ; i++) {
      var element = data[i];
      if(element.higher_levels == null)element.higher_levels= "";
      if(element.name == null)element.name= "";
      if(element.level == null)element.level= "";
      if(element.school == null)element.school= "";
      if(element.description == null)element.description= "";
      if(element.components == null)element.components= "";
      if(element.range == null)element.range= "";
      if(element.casting_time == null)element.casting_time= "";
      if(element.duration == null)element.duration= "";
      if(element.ritual == null)element.ritual= "";
      var newEle = {};
      newEle.classes = element.classes;
      newEle.name = element.name;
      newEle.level = element.level;
      newEle.school = element.school;
      newEle.description = element.description;
      newEle.higher_levels = element.higher_levels;
      newEle.components = element.components;
      newEle.range = element.range;
      newEle.casting_time = element.casting_time;
      newEle.duration = element.duration;
      newEle.ritual = element.ritual;
      data[i] = newEle;


     

    }
    fs.writeFile(resourcePath + "spells.json", JSON.stringify(data, null, "\t"), function (err) {
      if (err) {
        return console.log(err);
      }
    });
  });
}
*/

var conditionImagePath;
$(document).ready(function () {
  dataAccess.getSettings(sett => {
    settings = sett;
    tokenFilePath = defaultTokenPath;
  })
  populateSpellClassDropdown();
  populateDropdowns();
  $(".db_name_field").on("input", function (e) {
    var nothingPresent = e.target.value == "";
    var button = e.target.closest("section").querySelector(".save_button");

    button.disabled = nothingPresent;
    if (tab == "monsters" || tab == "homebrew")
      document.getElementById("addTokenButton").disabled = nothingPresent
  })
  document.querySelector("#encounter_table_header_row").addEventListener("click", sortEncounterMasterList);
  $("#condition_color_picker").spectrum({
    preferredFormat: "rgb",
    allowEmpty: false,
    showAlpha: true,
    chooseText: "ok",
    showInput: true
  });
  document.getElementById("condition_image_picker").onclick = function (e) {
    conditionImagePath = dialog.showOpenDialog(
      remote.getCurrentWindow(), {
        properties: ['openFile'],
        message: "Choose picture location",
        filters: [{ name: 'Images', extensions: ['jpg', 'png', 'gif'] }]
      });
    if (conditionImagePath == null)
      return;
    var imgEle = document.getElementById("condition_image_picker");
    imgEle.setAttribute("src", conditionImagePath);
  }
  $(".listSearch").on("keyup paste", filterDataListFromSearch)
  $("#encounter_monster_list_search").on("keyup paste", searchMasterListAfterInput)
  $("#spell_class_dropdown").on("change", filterDataListFromSearch)

  $(".monsterCR").on("change keyup paste", calculateSuggestedCR);
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

  document.getElementById("dnd_beyond_crawler_input").onchange = function (e) {
    var url = e.target.value;
    try {
      webCrawler.checkDndBeyond(url, function (data) {
        editObject(data, "");
      })
    }
    catch (err) {
      console.log(err)
    }
  }
});
function populateDropdowns() {
  new Awesomplete(document.getElementById("item_rarity_input"), { list: itemRarityValues, autoFirst: true, minChars: 0, sort: false });
  new Awesomplete(document.getElementById("item_type_input"), { list: itemTypeValues, autoFirst: true, minChars: 0, sort: false });
  new Awesomplete(document.getElementById("addmonster_type"), { list: constants.defaultCreatureTypes, autoFirst: true, minChars: 0, sort: false });
  new Awesomplete(document.getElementById("spell_school_input"), { list: constants.spellSchools, autoFirst: true, minChars: 0, sort: false });

  var sizeList = [];
  creaturePossibleSizes.sizes.forEach(function (size) {
    sizeList.push(size.substring(0, 1).toUpperCase() + size.substring(1))
  })
  new Awesomplete(document.getElementsByClassName("addmonster_size")[0], { list: sizeList, autoFirst: true, minChars: 0, sort: false });

}

var filterDataListTimeout;
function filterDataListFromSearch() {
  window.clearTimeout(filterDataListTimeout);
  filterDataListTimeout = window.setTimeout(function () {
    filterDataListExecute();
  }, 500);
}

function filterDataListExecute() {

  var searchstring, name;
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

      var dropDownValues = event.data;
      var dropDown = document.getElementById("spell_class_dropdown");
      dropDownValues.forEach(function (option) {
        var newOption = document.createElement("option");
        newOption.setAttribute("value", option.value);
        newOption.innerHTML = option.name;
        dropDown.appendChild(newOption);
        if (option.name != "All classes") classList.push(option.name)
      });
      $("#spell_class_dropdown").chosen({
        width: "180px",
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
  element.getElementsByClassName("edit_header_name")[0].innerHTML = "New " + tab;
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
  parentNode.insertBefore(newInput, parentNode.getElementsByClassName("awesomplete")[0])

  newInput.setAttribute("tabindex", 1)

  new Awesomplete(
    newInput, { list: classList, autoFirst: true, minChars: 0 })
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
    tabs[i].style.backgroundColor = "#451A17";
  }
  document.getElementById("statblock").classList.remove("single_column");
  document.getElementById(x).style.backgroundColor = "#DE3C2B";
  switch (tab) {
    case "homebrew":
      readDataFunction = dataAccess.getHomebrewMonsters;
      writeDataFunction = dataAccess.setHomebrewMonsters;
      break;
    case "monsters":
      readDataFunction = dataAccess.getMonsters;
      writeDataFunction = dataAccess.setMonsters;
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
      console.log(fields)
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
    console.log(event)
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
        var type = mon.type.trim();
        type = type.substring(0, 1).toUpperCase() + type.substring(1).toLowerCase()
        if (types.indexOf(type) < 0)
          types.push(type);
      });
      console.log(types)
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



function displayAddEncounterMonsterList() {
  var table = document.querySelector(".encounter_table");
  var tbody = table.querySelector("tbody");

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
    console.log(string)
    var foundMonster = monsterMasterList.filter(x => x.name == string)[0];
    statblockPresenter.createStatblock(document.getElementById("statblock"), foundMonster, tab)
    showAddForm("statblock");
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
  $(".listRow").not(':nth-child(4)').remove();
  sortFunction = null;
  loadedData = null;
  $(".listWrap").addClass("hidden");
}

function getRandomEncounter() {
  if (
    dialog.showMessageBox(remote.getCurrentWindow(), {
      type: "question",
      buttons: ["Ok", "Cancel"],
      title: "Generate random encounter?",
      message: "Do you wish to randomize an encounter and fill the form? Any unsaved information will be lost."
    }) == 1) return;

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
    function (enc) {
      editObject(enc, "E");
    }
  )

}

function deleteFromHomebrew(toRemove) {
  readDataFunction(function (data) {
    //Find index of first
    var index = indexOfName(data, toRemove);
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
    writeDataFunction(data, function (data) { loadAll(); });
    hide("statblock");

  }
  );
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


function calculateSuggestedCR() {
  var cr = 0;
  var hp = parseInt($("#homebrewHP").val());
  var predictedDmg = parseInt($("#predictedDamageOutput").val());
  var attackBonus = parseInt($("#mainAttackBonus").val());
  var ac = parseInt($("#homebrewAC").val());
  if (predictedDmg == null) predictedDmg = 0;
  if (hp == null) hp = 0;
  if (attackBonus == null) attackBonus = 0;
  if (ac == null) ac = 0;
  var dCr;
  var oCr;
  var curr;
  var currHp;
  if (hp < 70) {
    dCr = 1 / 2;
    if (hp < 50) {
      dCr = 1 / 4;
      if (hp < 36) {
        dCr = 1 / 8;
        if (hp < 7) {
          dCr = 0;
        }
      }
    }
  } else if (hp < 356) {
    dCr = 20;
    currHp = 356;
    while (currHp > hp) {
      currHp -= 15;
      dCr--;
    }
  }
  var expectedAC;
  if (dCr <= 30) {
    expectedAC = 19;
    if (dCr <= 16) {
      expectedAC = 18;
      if (dCr <= 12) {
        expectedAC = 17;
        if (dCr <= 9) {
          expectedAC = 16;
          if (dCr <= 7) {
            expectedAC = 15;
            if (dCr <= 4) {
              expectedAC = 14;
              if (dCr <= 3) {
                expectedAC = 13;
              }
            }
          }
        }
      }
    }
  }


  if (Math.abs(expectedAC - ac) >= 2) {
    dCr -= Math.floor((expectedAC - ac) / 2);
  }



  if (predictedDmg < 9) {
    oCr = 1 / 2;
    if (predictedDmg < 6) {
      oCr = 1 / 4;
      if (predictedDmg < 5) {
        oCr = 1 / 8;
        if (predictedDmg < 4) {
          oCr = 0;
        }
      }
    }
  } else if (predictedDmg < 123) {
    oCr = 20;
    currHp = 122;
    while (currHp > predictedDmg) {
      currHp -= 6;
      oCr--;
    }
  } else {
    oCr = 0;
  }



  if (oCr <= 20) {
    expectedAC = 10;
    if (oCr <= 16) {
      expectedAC = 9;
      if (oCr <= 15) {
        expectedAC = 8;
        if (oCr <= 10) {
          expectedAC = 7;
          if (oCr <= 7) {
            expectedAC = 6;
            if (oCr <= 4) {
              expectedAC = 5;
              if (oCr <= 3) {
                expectedAC = 4;
                if (oCr <= 2) {
                  expectedAC = 3;

                }
              }
            }
          }
        }
      }
    }
  }


  if (Math.abs(expectedAC - attackBonus) >= 2) {
    oCr -= Math.floor((expectedAC - attackBonus) / 2);
  }

  if (dCr != null && oCr != null) {
    cr = Math.ceil((dCr + oCr) / 2);
    $("#DCR").val(dCr);
    $("#OCR").val(oCr);
  } else if (dCr != null) {
    cr = dCr;
    $("#DCR").val(dCr);
  } else {
    cr = oCr;
    $("#OCR").val(oCr);

  }

  $("#suggestedCR").val(cr);
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
  }else{
    
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
  readDataFunction(function (data) {
    loadedData = data;
    listLength = loadedData.length;
    listAll();

    $(".listRow:nth-child(4)>button").prop('title', '');
    addSorters();
    addLookupHandlers();

    $(".listRow:nth-child(4)>button").off("click");

  });

  return false;

}



function listAll() {

  if (listedData == null) {
    listedData = loadedData;
  }
  var data = listedData;
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
  if (data.length > allRows.length - 1) {
    for (var i = allRows.length; i < data.length + 1; i++) {
      var newRow = $("#listFrame__" + tabElementName + ">.listRow:nth-child(4)").clone();
      newRow.appendTo("#listFrame__" + tabElementName);
    }
  } else if (data.length < allRows.length - 1) {
    while (data.length < allRows.length - 1) {
      var toRemove = allRows.pop()
      toRemove.parentNode.removeChild(toRemove)
    }

  }
  var allRows = $("#listFrame__" + tabElementName + ">.listRow");
  console.log(allRows.length, data.length)
  if (tabElementName == "monsters") {
    for (var i = 0; i < data.length; i++) {
      if (data[i].name == null) data[i].name = "None";
      if (data[i].challenge_rating == null) data[i].challenge_rating = 0;
      if (data[i].type == null) data[i].type = "None";
      if (data[i].hit_points == null) data[i].hit_points = 0;
      var allInputs = allRows[i + 1].getElementsByTagName("input");
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
      if (data[i].source == "official")
        $("#listFrame__" + tabElementName + ">.listRow:nth-child(" + (i + 5) + ")").addClass("official_content_row");
      $("#listFrame__" + tabElementName + ">.listRow:nth-child(" + (i + 5) + ")>.listRow__inner>input:nth-child(1)").val(data[i].name);
      $("#listFrame__" + tabElementName + ">.listRow:nth-child(" + (i + 5) + ")>.listRow__inner>input:nth-child(2)").val(data[i].casting_time);
      $("#listFrame__" + tabElementName + ">.listRow:nth-child(" + (i + 5) + ")>.listRow__inner>input:nth-child(3)").val(data[i].school);
      $("#listFrame__" + tabElementName + ">.listRow:nth-child(" + (i + 5) + ")>.listRow__inner>input:nth-child(4)").val(data[i].level);
    }

  } else if (tabElementName == "items") {

    for (var i = 0; i < data.length; i++) {
      if (data[i].name == "") data[i].name = "None";
      if (data[i].type == "") data[i].type = "None";
      if (data[i].rarity == "") data[i].rarity = "None";

      $("#listFrame__" + tabElementName + ">.listRow:nth-child(" + (i + 5) + ")>.listRow__inner>input:nth-child(1)").val(data[i].name);
      $("#listFrame__" + tabElementName + ">.listRow:nth-child(" + (i + 5) + ")>.listRow__inner>input:nth-child(2)").val(data[i].type);
      $("#listFrame__" + tabElementName + ">.listRow:nth-child(" + (i + 5) + ")>.listRow__inner>input:nth-child(3)").val(data[i].rarity);

    }

  } else if (tabElementName == "conditions" || tabElementName == "encounters" || tabElementName == "tables") {
    for (var i = 0; i < data.length; i++) {
      if (data[i].name == "") data[i].name = "None";
      $("#listFrame__" + tabElementName + ">.listRow:nth-child(" + (i + 5) + ")>.listRow__inner>input:nth-child(1)").val(data[i].name);
    }
  }

}

function addTokensToCurrentMonster() {
  var imagePaths = dialog.showOpenDialog(remote.getCurrentWindow(), {
    properties: ['openFile', 'multiSelections'],
    message: "Choose picture location",
    filters: [{ name: 'Images', extensions: ['png'] }]
  });

  imagePaths.forEach(path => {
    createToken(path.replace(/\\/g, "/"));
  })
}

function fillCurrentMonsterTokens(entryName) {
  document.querySelectorAll(".token").forEach(tok => tok.parentNode.removeChild(tok));
  var i = 0;
  var paths = getAllTokenPaths(entryName);
  paths.forEach(p => {
    createToken(p, true)
  })
}

function getAllTokenPaths(entryName) {
  var paths = [];
  var i = 0;

  while (true) {
    var pathStr = pathModule.join(tokenFilePath, entryName.toLowerCase() + i + ".png");

    if (fs.existsSync(pathStr)) {
      paths.push(pathStr);

      i++;
    } else {
      return paths;
    }
  }
}
var tokenRemoveQueue = [];
function createToken(pathStr, isOldToken) {
  console.log("Creating token", pathStr)
  var token = document.createElement("div");
  token.classList.add("token");
  token.setAttribute("data-file_path", pathStr);
  if (!isOldToken) {
    token.setAttribute("data-is_new_token", "t");
  }
  token.style.backgroundImage = "url('" + pathStr.replace(/\\/g, "/") + "')";
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
  if (currentlyEditingEntry && !writeToHomebrew) {
    return dataAccess.getMonsters(callback);
  } else {
    return dataAccess.getHomebrewMonsters(callback);
  }
}

function writeHomebrewOrMonsters(data, callback) {
  if (currentlyEditingEntry && !writeToHomebrew) {
    return dataAccess.setMonsters(data, callback)
  } else {
    return dataAccess.setHomebrewMonsters(data, callback)
  }

}

function copyEntry(entryName) {
  showAddForm("tab");
  $("#add" + tabElementNameSuffix + ">.edit_header_name").html("New " + tab.substring(0, tab.length - 1));
  editCopyHelper(entryName)
}

/**
 * Fyllir út í viðgeidandi fields í add glugganum út frá gefnum upplýsingum í jsoni
 * @param {*} entryName strengur sem tekur nafn færslu sem á að fylla út reitina 
 */

function editEntry(entryName) {
  $("#add" + tabElementNameSuffix + ">.edit_header_name").html("Editing " + entryName);
  currentlyEditingEntry = entryName;
  editCopyHelper(entryName)

}

function clearAddForm(){
  var element = document.getElementById("add" + tabElementNameSuffix);
  //Brute force this
  [...element.querySelectorAll("input, textarea")].forEach(input => {
    if (!input.readOnly)
      input.value = "";
  });
  currentlyEditingEntry = null;
  var letter = getLetterFromTabName();
  if (letter == "") document.querySelectorAll(".token").forEach(tok => tok.parentNode.removeChild(tok));

}

function getLetterFromTabName() {

  if (tab == "monsters" || tab == "homebrew")
    return "";
  return tab.substring(0, 1).toUpperCase(); //Verður "I" eða "E" eða "S"
}

function editCopyHelper(entryName) {
  clearAddForm();
  showAddForm("tab");
  //gera betur, þarf að virka fyrir allt
  $("#add" + tabElementNameSuffix + " .save_button")[0].disabled = false;
  var letter = getLetterFromTabName();
  if (letter == "") {
    document.getElementById("addTokenButton").disabled = false;
    fillCurrentMonsterTokens(entryName);
  }
  currentEntryName = entryName;

  editObject(loadedData.filter(x => {
    return x.name.toLowerCase() == entryName.toLowerCase()
  })[0], letter);
}


const hiddenAttributes = ["source"];
function editObject(dataObject, letter) {
  if (dataObject == null) {
    console.log("No data obj")
    return;
  }
  var valuesElements = [...document.querySelectorAll(".jsonValue" + letter)];
  var keysElements = [...document.querySelectorAll(".jsonAttribute" + letter)];
  keysElements.forEach(x => x.value = "");
  valuesElements.forEach(x => x.value = "");

  hiddenAttributes.forEach(attr => { if (dataObject[attr]) delete dataObject[attr] })
  if (letter === "S")
    fillClasses(dataObject);
  var loadedKeys = Object.keys(dataObject);
  var loadedValues = Object.values(dataObject);

  document.getElementById("condition_image_picker").setAttribute("src", "");
  document.getElementById("condition_color_picker").value = "#fff";

  checkIfTableExistsAndRemove(loadedKeys, loadedValues);
  removeFromObject("condition_color_value", loadedKeys, loadedValues);
  removeFromObject("condition_background_location", loadedKeys, loadedValues);
  removeFromObject("encounter_xp_value", loadedKeys, loadedValues);

  if (letter === "")
    fillNpcRequiredStats(loadedKeys, loadedValues);

  //Refetch
  if (addFieldsIfNeeded(loadedKeys.length - valuesElements.length)) {
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
          console.log(loadedValues[i])
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
        var specialAction = loadedValues[i];

        if (specialAction.length > subkeys.length) {
          for (var k = 0; k <= specialAction.length - subkeys.length; k++) {
            addRow(loadedKeys[i]);
          }
          subvalues = document.querySelectorAll(".specialjsonValue" + letter);
          subkeys = document.querySelectorAll(".specialjsonAttribute" + letter);
        }
        for (var j = 0; j < specialAction.length; j++) {
          subvalues[j].value = Object.values(specialAction[j])[0];
          subkeys[j].value = Object.keys(specialAction[j])[0].deserialize();
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
      }

    }

  }
  if (tab == "encounters") {
    var fields = document.getElementsByClassName("specialjsonAttributeE");
    [...fields].forEach(element => showCRForCreature(element))
  } else if (tab == "conditions") {
    if (dataObject["condition_background_location"]) {
      document.getElementById("condition_image_picker").setAttribute("src", dataObject["condition_background_location"]);
      document.getElementById("condition_image_label").innerHTML = dataObject["condition_background_location"];
    }
    if (dataObject["condition_color_value"])
      document.getElementById("condition_color_picker").value = dataObject["condition_color_value"];

  }
  calculateSuggestedCR();
  window.scrollTo(0, document.body.scrollHeight);

  function fillFieldAndRemoveFromObject(property, keys, values) {
    var valueElement = document.getElementsByClassName("addmonster_" + property)[0];
    if (valueElement == null) {
      return console.log(property, " is undefined")
    }
    var val = removeFromObject(property, keys, values);
    valueElement.value = val ? val : "";
  }

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

    //Sértilfelli fyrir NPC og monster þar sem það eru nokkrir fields sem þurfa að vera til staðar
    ["name", "size", "description", "type", "hit_dice", "speed", "strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma", "senses", "languages"
      , "challenge_rating", "subtype", "alignment", "armor_class", "hit_points"].forEach(entry => fillFieldAndRemoveFromObject(entry, keyArray, valueArray));
    valuesElements.forEach(function (x) { x.value = "" });
    keysElements.forEach(function (x) { x.value = "" });
    actionFields.forEach(function (x) { x.value = "" })
    specialFields.forEach(function (x) { x.value = "" })
    specialAttrFields.forEach(function (x) { x.value = "" })
    legActionFields.forEach(function (x) { x.value = "" })
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
  var toEdit = button.parentNode.parentNode.getElementsByClassName("listRow__inner")[0]
    .querySelector("input:first-child").value;
  copyEntry(toEdit);
}

function editParentHandler(button) {
  var toEdit = button.parentNode.parentNode.getElementsByClassName("listRow__inner")[0]
    .querySelector("input:first-child").value;
  editEntry(toEdit);
}


function removeParentHandler(button) {
  var toRemove = button.parentNode.parentNode.getElementsByClassName("listRow__inner")[0]
    .querySelector("input:first-child").value;
  if (window.confirm("Remove " + toRemove + " from database?")) {
    deleteFromHomebrew(toRemove);
    jQuery(this).parent().remove();
  }
}


function addLookupHandlers() {
  $(".listRow:not(:nth-child(4))").children(".listRow__inner").off("click");
  $(".listRow:not(:nth-child(4))").children(".listRow__inner").on("click", function (e) {
    if ($(this).parent().hasClass("selected_row")) {
      hideStatblock();
      document.querySelectorAll(".selected_row").forEach(e => e.classList.remove("selected_row"));
      return;
    }
    window.scrollTo(0, 110);
    searchFor($(this).find(':first-child').val());
    document.querySelectorAll(".selected_row").forEach(e => e.classList.remove("selected_row"));

    $(this).parent().addClass("selected_row");
    this.parentNode.parentNode.insertBefore(document.getElementById("statblock"), this.parentNode.nextSibling);

  });

}

function addSorters() {
  $("#listFrame__" + tabElementNameSuffix + ">.listRow:nth-child(4)>.listRow__inner>input").off("click");
  $("#listFrame__" + tabElementNameSuffix + ">.listRow:nth-child(4)>.listRow__inner>input").on("click", function () {
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
          var s = a.type.toLowerCase();
          var k = b.type.toLowerCase();
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




function homebrewSearch() {
  var searchstring = document.getElementById("settingsSearch").value;
  searchFor(searchstring);


  return false;
}


function searchFor(searchstring) {
  readDataFunction(function (data) {
    if (!lookFor(searchstring, true, data, true, $("#statblock"))) {
      lookFor(searchstring, false, data, true, $("#statblock"))
    }
    document.getElementById("iframeWrapper").classList.remove("hidden");
  });

  return false;

}

function addRow(str) {
  var container;
  var className;
  if (str != null) {
    console.log(str)
    var newRow = $(".addRow_" + str + ">.row:first-child").first().clone().appendTo($(".addRow_" + str));
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




function addAttributeArray(valueBoxes, attributeBoxes, attributeKey, thingyToSave) {
  var specialActions = [];
  var specialAction = {};


  for (var i = 0; i < valueBoxes.length; i++) {
    if (attributeBoxes[i].value != "" && valueBoxes[i].value != "" && valueBoxes[i].value != " ") {
      attribute = attributeBoxes[i].value.serialize();
      specialAction[attribute] = valueBoxes[i].value;
    }
    if ((i + 1) % 5 == 0 && i > 0 && specialAction != null && specialAction != [] && !isEmpty(specialAction)) {
      specialActions.push(specialAction);
      specialAction = {};
    }
  }
  if (specialActions.length != 0) thingyToSave[attributeKey] = specialActions;
}



//Data has name attribute, return index  of
// entry with key name. Returns -1 if not found.
function indexOfName(data, key) {
  var index = 0;
  if (data == null || key == null || data.length == 0) return -1;
  while (data[index].name != key) {
    index++;
    if (index >= data.length) {
      return -1;
    }
  }
  return index;
}


function saveHomebrew(promptCollisions) {
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
  var thingyToSave = {};
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

  }
  if (tab == "monsters" || tab == "homebrew") {
    //Sértilfelli fyrir NPC og monster þar sem það eru nokkrir fields sem þurfa að vera til staðar
    addProperty("name", thingyToSave);
    addProperty("size", thingyToSave, "Medium");
    addProperty("description", thingyToSave);
    addProperty("type", thingyToSave)
    addProperty("subtype", thingyToSave)
    addProperty("alignment", thingyToSave, "Unaligned")
    addProperty("armor_class", thingyToSave)
    addProperty("hit_points", thingyToSave)
    addProperty("hit_dice", thingyToSave)
    addProperty("speed", thingyToSave)
    addProperty("strength", thingyToSave)
    addProperty("dexterity", thingyToSave)
    addProperty("constitution", thingyToSave)
    addProperty("intelligence", thingyToSave)
    addProperty("wisdom", thingyToSave)
    addProperty("charisma", thingyToSave)
    addProperty("senses", thingyToSave)
    addProperty("languages", thingyToSave)
    addProperty("challenge_rating", thingyToSave, 0)

  } else if (tab == "encounters") {
    thingyToSave.encounter_xp_value = parseInt(document.querySelector("#encounter_challenge_calculator_value").value);
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

    valueBoxes = document.getElementsByClassName("specialjsonValue");
    attributeBoxes = document.getElementsByClassName("specialjsonAttribute");
    var attribute = "special_abilities";

    //populate actions
    addAttributeArray(document.getElementsByClassName("actionjsonValue"), document.getElementsByClassName("actionjsonAttribute"), "actions", thingyToSave);


    //populate legendary actions
    addAttributeArray(document.getElementsByClassName("legendaryjsonValue"), document.getElementsByClassName("legendaryjsonAttribute"), "legendary_actions", thingyToSave);
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


    thingyToSave.source = "Homebrew";
    thingyToSave.description = thingyToSave.description;
    if (Object.keys(tableObject).length != 0) thingyToSave.table = tableObject;
  } else if (tab == "conditions") {
    thingyToSave.condition_color_value = document.getElementById("condition_color_picker").value;
    thingyToSave.condition_background_location = conditionImagePath;
  }

  //Search for existing entry
  saveDataObject(thingyToSave);


  function saveDataObject(thingyToSave) {
    if (tab == "monsters" && !currentlyEditingEntry) {
      return handleDataSave(thingyToSave, dataAccess.getHomebrewMonsters, dataAccess.setHomebrewMonsters)
    } else {
      return handleDataSave(thingyToSave, readDataFunction, writeDataFunction);
    }

    function handleDataSave(thingyToSave, getFunction, setFunction) {
      getFunction(function (data) {
        if (currentlyEditingEntry) {
          data = data.filter(d => d.name != currentlyEditingEntry)
        }

        var collisionIndex = indexOfName(data, thingyToSave.name);
        if (collisionIndex != -1) {
          if (window.confirm(thingyToSave.name + " already found in database. Do you wish to overwrite?")) {
            data.splice(collisionIndex, 1);
          } else {
            return false;
          }
        }

        data.push(thingyToSave);
        data = data.sort(function (a, b) {
          if (a.name < b.name) return -1;
          if (b.name < a.name) return 1;
          return 0;
        })
        setFunction(data, function (err) {
          hide('add' + tabElementNameSuffix);
          $('#save_success').finish().fadeIn("fast").delay(2500).fadeOut("slow");
          window.scroll(0, 0);

          if (tokenRemoveQueue.length == 0) {
            saveTokens(thingyToSave.name);
          } else {
            while (tokenRemoveQueue.length > 0) {
              fs.unlink(tokenRemoveQueue.pop(), (err) => {
                if (err) throw err;
                if (tokenRemoveQueue.length == 0)
                  saveTokens(thingyToSave.name);
              });
            }
          }

          tokenRemoveQueue = [];
          currentlyEditingEntry = false;
          let window2 = remote.getGlobal('mainWindow');
          if (window2) window2.webContents.send('update-autofill');
        });

      })
    }
  }
  function saveTokens(newName) {

    //Move tokens
    if (tab == "monsters" || tab == "homebrew") {
      var tokens = [...document.querySelectorAll(".token")];
      var i = 0;
      tokens.forEach(tok => {
        var isNewToken = tok.getAttribute("data-is_new_token") != null;
        var oldPath = tok.getAttribute("data-file_path");
        var newPath = tokenFilePath + "/" + newName.toLowerCase() + i + ".png";
        if (!isNewToken && (currentlyEditingEntry || currentEntryName == newName)) {
          fs.renameSync(oldPath, newPath);
          //Copy
        } else {
          console.log("Copy ", oldPath, newPath)
          fs.createReadStream(oldPath).pipe(fs.createWriteStream(newPath));
        }
        i++;
      });
    }

    currentlyEditingEntry = null;
    $("#add" + tabElementNameSuffix + ">.edit_header_name").html("New " + tab.substring(0, tab.length - 1));
    loadAll();
  }
  function addProperty(property, object, fallbackValue) {

    var valueElement = document.getElementsByClassName("addmonster_" + property)[0];
    var keyElement = valueElement.parentNode.getElementsByClassName("attr")[0];
    //Awesomplete haxxx
    if (keyElement == null) {
      keyElement = valueElement.parentNode.parentNode.getElementsByClassName("attr")[0];
    }

    if (valueElement.value == "" && !fallbackValue) return;
    object[serialize(keyElement.value)] = valueElement.value ? valueElement.value : fallbackValue;
  }
}

//Searchstring: String to search for
// fullMatch: boolean : whether the string should be fully matched or not.
// data: Dataset to look in, must contain attribute "name".
//combat: Whether the entity should be loaded into combat system.

function lookFor(searchstring, fullMatch, data, combat, statblock) {
  for (var i = 0; i < Object.keys(data).length; i++) {

    if ((data[i].name.toLowerCase() == searchstring.toLowerCase() && fullMatch)
      || (data[i].name.toLowerCase().includes(searchstring.toLowerCase()) && !fullMatch)) {

      foundMonster = data[i];
      statblockPresenter.createStatblock(document.getElementById("statblock"), foundMonster, (tab == "monsters" || tab == "homebrew") ? "monsters" : tab)
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





