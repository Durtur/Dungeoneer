const dataAccess = require("./js/dataaccess");
const mathyUtil = require("./js/mathyUtil")
const remote = require('electron').remote;
const dialog = require('electron').remote.dialog;

function testRumours() {
    dataAccess.getGeneratorData(function (data) {
        var rumorArray = generateRumors(data.rumors.length * 2, data);
        console.log(rumorArray)
        dataAccess.writeTempFile("testRumors.json", JSON.stringify(rumorArray), () => { });
    });
}



var marked = require('marked');
marked.setOptions({
    renderer: new marked.Renderer(),
    gfm: true,
    tables: false,
    breaks: false,
    pedantic: false,
    sanitize: false,
    smartLists: true,
    smartypants: false
});
var listOfAllMonsters = [];
var awesompleteSelectionSetMonsters = [];
var encounterSetAwesompletes = [];

const { clipboard } = require('electron')

const { ipcRenderer } = require('electron');


var fs = require('fs');

//UI stuff
//Tree view
function activeTreeviews() {
    var toggler = document.getElementsByClassName("treeview_caret");
    var i;

    for (i = 0; i < toggler.length; i++) {
        toggler[i].addEventListener("click", function () {
            this.parentElement.querySelector(".treeview_nested").classList.toggle("treeview_active");
            this.classList.toggle("treeview_caret-down");
        });
    }
}


function switchNpcGeneratorDetails(index) {
    var buttons = document.getElementsByClassName("creature_generation_buttons")[0].querySelectorAll("button");
    var selectedButton = buttons[index];
    var lastState = selectedButton.getAttribute("toggled");
    if (lastState == "true") {
        //Off
        var otherButton = [...buttons].filter(x => x != selectedButton)[0];
        otherButton.setAttribute("toggled", true);

    }
    var creatureDetails = document.getElementById("generator_creature_details");
    var creatureNames = document.getElementById("generator_creature_name_details");

    if (creatureNames.classList.contains("hidden")) {
        creatureNames.classList.remove("hidden");
        creatureDetails.classList.add("hidden");
    } else {
        creatureNames.classList.add("hidden");
        creatureDetails.classList.remove("hidden");
    }
}
document.addEventListener("DOMContentLoaded", function () {
    setTab("npc"); //Default to NPC
    populateGenerationSetMenu();
    updateScrollList();
    updateRandomTableNames();
    updateEncounterSetNames();

    // concatDescriptionArrays();
    document.getElementById("reroll_tavern_button").addEventListener("click", function (evnt) {
        dataAccess.getGeneratorData(function (data) {
            generateTavernRumorsAndMenu(data);
        });
    });

    document.getElementById("reroll_shop_button").addEventListener("click", function (devt) {
        dataAccess.getItems(data => generateShop(data, false));
    });
    document.getElementById("regenerate_name_button").addEventListener("click", function (e) {
        rerollNpc("name");
    });

    document.getElementById("regenerate_creature_button").addEventListener("click", function (e) {
        rerollNpc("creature");
    });
    document.querySelector("#copyButton").addEventListener("click", function () {
        var npcString = document.querySelector("#generated_npc_name").innerHTML;
        npcString += "\n";
        npcString += document.querySelector("#generated_npc_profession").innerHTML
        npcString += "\n";
        npcString += document.querySelector("#generated_npc_description").innerHTML
        clipboard.writeText(npcString)
    });

    document.querySelector("#generate_npc_button").addEventListener("click", function () {
        document.querySelector("#regenerate_name_button").classList.remove("hidden");
        document.querySelector("#regenerate_creature_button").classList.remove("hidden");

        var dropDownGender = document.querySelector("#choose_gender");
        var dropDownType = document.querySelector("#choose_type_generated_creature");
        var type = dropDownType.options[dropDownType.selectedIndex].value;
        var gender = dropDownGender.options[dropDownGender.selectedIndex].value;
        var dropDownSet = document.querySelector("#choose_nameset");
        var set = dropDownSet.options[dropDownSet.selectedIndex].value;
        dataAccess.getGeneratorData(function (data) {
            var foundNameSet = null;
            //Finna valið nafnamengi
            for (var i = 0; i < Object.keys(Object.values(data)[0]).length; i++) {
                if (set === Object.keys(Object.values(data)[0])[i]) {
                    foundNameSet = Object.values(Object.values(data)[0])[i];
                }
            }
            var generatedNameTextField = document.querySelector("#generated_npc_name");
            var values = generateNPC(data, gender, foundNameSet, type)
            generatedNameTextField.innerHTML = values.firstname + " " + values.lastname;
            if (values.age)
                values.profession += ` (${values.age})`;

            document.querySelector("#generated_npc_profession").innerHTML = values.profession;
            document.querySelector("#generated_npc_description").innerHTML = values.description;

        });

    });

    document.querySelector("#generate_shop_button").addEventListener("click", function () {
        dataAccess.getItems(function (data) {
            document.getElementById("reroll_shop_button").classList.remove("hidden");
            generateShop(data, true);
        });

    });
    dataAccess.getMonsters(mData => {
        dataAccess.getHomebrewMonsters(hData => {
            mData.forEach(mon => listOfAllMonsters.push(mon.name));
            hData.forEach(mon => listOfAllMonsters.push(mon.name));
            listOfAllMonsters.sort();
        })
    });
    dataAccess.getGeneratorData(function (data) {
        replacementValues = data.replacement_values;

        var creatures = data.generated_creatures;
        var creatureTypes = Object.keys(creatures);

        updateCreatureTypeList(creatureTypes);
        updateCreatureNamesetsList(data.names)
        populateCreatureTypeSelect(creatureTypes);

    });

    document.getElementById("save_creature_set_button").onclick = function (e) {
        dataObj = getJsonObjectFromTreeList();
        var creatureSet = document.getElementById("creature_type_name_input").value.serialize();
        dataAccess.getGeneratorData(function (data) {
            console.log(data.generated_creatures[creatureSet]);
            data.generated_creatures[creatureSet] = dataObj;
            dataAccess.setGeneratorData(data, function (data, err) {
                if (err) {
                    Util.showFailedMessage("Save failed");
                } else {
                    Util.showSuccessMessage("Saved");
                    clearTreeView();
                    document.getElementById("creature_type_name_input").value = "";
                    document.getElementById("delete_creature_set_button").disabled = true;
                }
            });
        });
    }

    document.getElementById("delete_creature_set_button").onclick = function (e) {
        var set = document.getElementById("creature_type_name_input").value;
        if (dialog.showMessageBox(remote.getCurrentWindow(), {
            type: "question",
            buttons: ["Ok", "Cancel"],
            title: "Delete nameset?",
            message: "Do you wish to delete the " + set + " creature set?"
        }) == 1) return;
        dataAccess.getGeneratorData(function (data) {
            delete data.generated_creatures[set.serialize()];
            dataAccess.setGeneratorData(data, function (data, err) {
                if (err) {
                    Util.showFailedMessage("An error occurred");
                } else {
                    Util.showSuccessMessage("Creature set deleted");
                    clearTreeView();
                    document.getElementById("creature_type_name_input").value = "";
                    document.getElementById("delete_creature_set_button").disabled = true;
                }
            });
        });
    };

    document.getElementById("delete_nameset_button").onclick = function (e) {
        var nameSet = document.getElementById("creature_namesets_name_input").value;
        if (dialog.showMessageBox(remote.getCurrentWindow(), {
            type: "question",
            buttons: ["Ok", "Cancel"],
            title: "Delete nameset?",
            message: "Do you wish to delete the " + nameSet + " nameset?"
        }) == 1) return;
        dataAccess.getGeneratorData(function (data) {
            delete data.names[nameSet.serialize()];
            dataAccess.setGeneratorData(data, function (data, err) {
                if (err) {
                    Util.showFailedMessage("An error occurred");
                } else {
                    Util.showSuccessMessage("Nameset deleted");
                    clearTreeView();
                    document.getElementById("creature_namesets_name_input").value = "";
                    document.getElementById("delete_nameset_button").disabled = true;
                }
            });
        });
    };

    document.getElementById("save_nameset_button").onclick = function (e) {

        dataObj = getJsonObjectFromTreeList();
        if (dataObj == null) throw "Dataobject null";

        var nameSet = document.getElementById("creature_namesets_name_input").value.serialize();

        dataAccess.getGeneratorData(function (data) {

            data.names[nameSet] = dataObj;
            dataAccess.setGeneratorData(data, function (data, err) {
                if (err) {
                    Util.showFailedMessage("Save failed");
                } else {
                    Util.showSuccessMessage("Saved");
                    clearTreeView();
                    document.getElementById("creature_namesets_name_input").value = "";
                    document.getElementById("delete_nameset_button").disabled = true;
                }
            });

        });


        document.getElementById("save_nameset_button").disabled = true;
    }

    function clearTreeView() {
        var domTree = document.getElementById("creature_navigator");
        while (domTree.firstChild)
            domTree.removeChild(domTree.firstChild);
        document.getElementById("currently_editing_navigator").innerHTML = "";

    }

    function getJsonObjectFromTreeList() {
        var domTree = document.getElementById("creature_navigator").firstChild;
        var dataObj = {};
        nextLevel(dataObj, domTree, "");
        return dataObj;
        function nextLevel(obj, dom, lastAttribute) {

            if (dom.childNodes == null) return;
            if (![...dom.childNodes].find(x => x.classList.contains("treeview_attribute"))) {
                var attributeElement = [...dom.childNodes].find(x => x.classList && x.classList.contains("treeview_caret"));
                if (!attributeElement) {
                    for (var i = 0; i < dom.childNodes.length; i++)nextLevel(obj, dom.childNodes[i], lastAttribute);
                    return;
                }
                var attr = attributeElement.innerHTML;
                if (!obj[lastAttribute] && lastAttribute) obj[lastAttribute] = {};
                nextLevel(lastAttribute ? obj[lastAttribute] : obj, [...dom.childNodes].find(x => x.classList.contains("treeview_nested")), attr);
            } else {
                var attrList = [...dom.childNodes].filter(x => x.classList.contains("treeview_attribute")).map(x => x.firstChild.innerHTML);
                obj[lastAttribute] = attrList ? attrList : [];
            }
        }
    }

    function populateCreatureTypeSelect(creatureTypes) {

        var creatureNameSelect = document.getElementById("choose_type_generated_creature");
        creatureTypes.forEach(cretType => {

            var newOption = document.createElement("option");
            newOption.setAttribute("value", cretType);
            var unSerialized = unSerialize(cretType);
            console.log(unSerialized);
            newOption.innerHTML = unSerialized.substring(0, 1).toUpperCase() + unSerialized.substring(1).toLowerCase();
            creatureNameSelect.appendChild(newOption);
        })
    }

    function updateCreatureNamesetsList(names) {
        console.log(Object.keys(names))
        var input = document.getElementById("creature_namesets_name_input");
        new Awesomplete(input, { list: Object.keys(names), autoFirst: true, minChars: 0, maxItems: 120 });
        input.addEventListener('awesomplete-selectcomplete', function (e) {
            dataAccess.getGeneratorData(data => {
                var creature = data.names[e.target.value];
                document.getElementById("currently_editing_navigator").innerHTML = e.target.value + " names" + (creature == null ? " (new)" : "");
                if (!creature) {
                    creature = { male: [""], female: [""], lastnames: [""] };
                } else {
                    document.getElementById("delete_nameset_button").disabled = false;
                }
                createCreatureTreeList(creature);
                document.getElementById("save_nameset_button").disabled = false;
            });

        });
    }

    function updateCreatureTypeList(creatureTypes) {
        var input = document.getElementById("creature_type_name_input");
        new Awesomplete(input, { list: creatureTypes, autoFirst: true, minChars: 0, maxItems: 120 });
        input.addEventListener('keydown', function (e) {
            if (e.keyCode == 13)
                populateCreatureTreeView(e);
        });
        input.addEventListener('awesomplete-selectcomplete', populateCreatureTreeView);
        function populateCreatureTreeView(e) {
            dataAccess.getGeneratorData(data => {

                var creature = data.generated_creatures[e.target.value];
                document.getElementById("currently_editing_navigator").innerHTML = e.target.value + (creature == null ? " (new)" : "");
                if (creature == null) {
                    creature = {
                        professions: {

                            common: [""],
                            uncommon: [""],
                            rare: [""]
                        },
                        traits: [""],
                        hooks: [""],
                        appearance: {
                            face_aesthetics: [""],
                            face_shape: [""],
                            build: [""]
                        }
                    }
                } else {
                    document.getElementById("delete_creature_set_button").disabled = false;
                }
                document.getElementById("save_creature_set_button").disabled = false;
                createCreatureTreeList(creature);


            });
        }
    }

});

function rerollNpc(key) {
  
    var dropDownGender = document.querySelector("#choose_gender");
    var dropDownType = document.querySelector("#choose_type_generated_creature");
    var type = dropDownType.options[dropDownType.selectedIndex].value;
    var gender = dropDownGender.options[dropDownGender.selectedIndex].value;
    var dropDownSet = document.querySelector("#choose_nameset");
    gender = gender == "any" ? pickOne(["male", "female"]) : gender;
    var set = dropDownSet.options[dropDownSet.selectedIndex].value;
    dataAccess.getGeneratorData(function (data) {
        var foundNameSet = null;
        //Finna valið nafnamengi
        for (var i = 0; i < Object.keys(Object.values(data)[0]).length; i++) {
            if (set === Object.keys(Object.values(data)[0])[i]) {
                foundNameSet = Object.values(Object.values(data)[0])[i];
            }
        }
        var generatedNameTextField = document.querySelector("#generated_npc_name");
        if (key == "name") {
         
            var values = generateNPC(data, gender, foundNameSet, type)
            replaceName(values);
        } else if (key == "creature") {
            var names = generatedNameTextField.innerHTML.split(" ");
            if (names[1] == null) names[1] = "";
            var values = generateNPC(data,gender, { male: [names[0]], lastnames: [names[1]], female: [names[0]], lastnames: [names[1]] }, type)
            if (values.age)
                values.profession += ` (${values.age})`;
            replaceDescription(values);
        }

        function replaceDescription() {
            document.querySelector("#generated_npc_profession").innerHTML = values.profession;
            document.querySelector("#generated_npc_description").innerHTML = values.description;
        }

        function replaceName() {
            var oldName = generatedNameTextField.innerHTML.split(" ")[0];

            generatedNameTextField.innerHTML = values.firstname + " " + values.lastname;
            if (oldName == "") return;
            var descriptionEle = document.querySelector("#generated_npc_description");

            descriptionEle.innerHTML = descriptionEle.innerHTML.replace(new RegExp(oldName, "g"), values.firstname)
        }

    });


}

var editingListAttribute = false;
function createCreatureTreeList(object) {
    var cont = document.getElementById("creature_navigator");
    while (cont.firstChild)
        cont.removeChild(cont.firstChild);


    var list = document.createElement("ul")
    list.classList = "treeview_list";
    iterate(object, list, 10)

    cont.appendChild(list);
    cont.classList.remove("hidden");
    activeTreeviews();
    document.getElementById("save_nameset_button").disabled = false;

    function iterate(arr, parentElement, infiniteLoopGuard) {
        if (infiniteLoopGuard == 0) return;

        Object.keys(arr).forEach(function (key) {
            var li = document.createElement("li");
            if (typeof arr[key] == "object") {
                var caret = document.createElement("span");

                li.appendChild(caret);
                caret.classList = "treeview_caret";
                caret.innerHTML = unSerialize(key);
                var ul = document.createElement("ul");
                ul.classList = "treeview_nested";

                li.appendChild(ul);
                parentElement.appendChild(li)
                return iterate(arr[key], ul, infiniteLoopGuard - 1)
            }
            //attribute
            parentElement.appendChild(li);
            parentElement.classList.add("attribute_list");
            parentElement.addEventListener("dblclick", addRowToAttListHandler);
            li.classList.add("treeview_attribute")
            createParagraph(arr[key], li)




        });

    }
    function addRowToAttListHandler(evt) {
        console.log("Editing: " + editingListAttribute)
        if (editingListAttribute) return;
        if (evt.target.tagName == "P")
            return;
        var parentList = evt.target.closest(".treeview_nested ");
        addRowToAttList(parentList);
    }

    function addRowToAttList(parentList) {
        console.log("Create new row on enter")
        var li = document.createElement("li");
        li.classList = "treeview_attribute";
        parentList.appendChild(li)
        createEditParagraph("", li);
        li.scrollIntoView();
    }
    function createParagraph(text, li) {
        if (text == null || text == "") {
            if (li && li.parentNode)
                li.parentNode.removeChild(li);
            return;
        }
        var p = document.createElement("p");
        p.innerHTML = text;
        p.ondblclick = editListAttribute;
        li.appendChild(p);
        return p;
    }

    function createEditParagraph(text, li) {
        var input = document.createElement("input");
        input.value = text;
        input.setAttribute("data-old_value", text);
        li.appendChild(input);
        input.select();
        input.addEventListener("keydown", leaveOnEnterOrEsc);
        editingListAttribute = true;
        input.addEventListener("blur", stopEditing);
        function leaveOnEnterOrEsc(evt) {
            if (evt.keyCode == 13 || evt.keyCode == 27) {
                //esc 
                if (evt.keyCode == 27) {
                    evt.target.value = evt.target.getAttribute("data-old_value")
                    //create new line straight away if enter
                } else if (evt.keyCode == 13) {
                    if (evt.target.value != "") {
                        var parentList = input.closest(".treeview_nested");
                     
                        window.setTimeout(() => {
                            editingListAttribute = false;

                            addRowToAttList(parentList);

                        }, 100);

                    }

                }
                document.activeElement.blur();
            }
        }

        function stopEditing(evt) {
            window.setTimeout(() => {
                if (evt.target != document.activeElement)
                    doStopEditing(evt);
            }, 50);

            function doStopEditing(evt) {
                editingListAttribute = false;
                var oldText = evt.target.getAttribute("data-old_value");
      
                var text = evt.target.value;
                var parent = evt.target.parentNode;
                if (parent.contains(evt.target)) parent.removeChild(evt.target);
                createParagraph(text, parent);
                if (oldText != text) parent.classList.add("new_treeview_attribute");
                //Sort alphabetically
                var container = parent.parentNode;
                if (!container) return;
                var nodeList = [...container.childNodes];
                while (nodeList.firstChild)
                    nodeList.removeChild(nodeList.firstChild);
                nodeList.sort(function (a, b) {
                    var first = a.querySelector("p").innerHTML.toUpperCase();
                    var second = b.querySelector("p").innerHTML.toUpperCase();
                    if (first < second) return 1;
                    if (second < first) return -1;
                    return 0;
                });
                while (nodeList.length > 0)
                    container.appendChild(nodeList.pop());

            }


        }
    }

    function editListAttribute(event) {

        editingListAttribute = true;
        var para = event.target.parentNode.getElementsByTagName("p")[0];
        createEditParagraph(para.innerHTML, para.parentNode)
        para.parentNode.removeChild(para);
    }


}


function generateShop(data, generateDescription) {
    var shopWealthDropdown = document.querySelector("#shop_wealth");
    var shopWealth = shopWealthDropdown.selectedIndex;
    var shopTypeDropdown = document.querySelector("#shop_type");
    var shopType = shopTypeDropdown.options[shopTypeDropdown.selectedIndex].value;
    var shopSizeDropdown = document.querySelector("#shop_size");
    var shopSize = shopSizeDropdown.selectedIndex;
    shopSize++;
    var shopPricingDropdown = document.querySelector("#shop_pricing");
    var shopPricing = shopPricingDropdown.options[shopPricingDropdown.selectedIndex].value;
    shopPricing = parseFloat(shopPricing);
    var currentRarity;

    var shopInventoryArray = [];
    tooltipsForTable = [];
    var shopInventory = {};
    shopInventory.Name = [];
    shopInventory.Rarity = [];
    shopInventory.Price = [];
    dataAccess.getScrolls(function (scrollData) {
        if (shopType.toLowerCase() != "general") {
            if (shopType === "scroll") {
                data = scrollData;
            } else {
                data = typeFilter(data, shopType)
            }
            //Velja nokkur scroll til að henda inn í  
        } else {
            var currentScrollRarity;

            for (var i = 0; i <= shopWealth; i++) {
                currentScrollRarity = [];
                for (var j = 0; j < scrollData.length; j++) {
                    if (evaluateRarity(scrollData[j].rarity) == i) {
                        currentScrollRarity.push([scrollData[j].name, scrollData[j].rarity, scrollData[j].type, { description: scrollData[j].description }])

                    }
                }
                var chosen = pickX(currentScrollRarity, shopSize * (d(2) - 1));
                shopInventoryArray = shopInventoryArray.concat(chosen);
            }



        }
        for (var i = 0; i <= shopWealth; i++) {
            currentRarity = [];
            for (var j = 0; j < data.length; j++) {
                if (evaluateRarity(data[j].rarity) == i) {
                    currentRarity.push([data[j].name, data[j].rarity, data[j].type,
                    {
                        description: data[j].description,
                        attunement: (data[j].requires_attunement ? `(requires attunement${data[j].requires_attunement_by ? " " + data[j].requires_attunement_by : ""})` : "")
                    }])
                }

            }
            chosen = pickX(currentRarity, shopSize * d(4));
            shopInventoryArray = shopInventoryArray.concat(chosen);
        }

        shopInventoryArray.sort(function (a, b) {

            if (a[0] < b[0]) return -1;
            if (a[0] > b[0]) return 1;
            return 0;
        });
        var str;

        for (var i = 0; i < shopInventoryArray.length; i++) {

            str = shopInventoryArray[i][3];
            if (str.length > 1200) {
                str = str.substring(0, 1200);
                str = str.substring(0, str.lastIndexOf(" ")) + " ...";
            }

            // tooltipsForTable.push(str.replace(/(\*\* || \*\*\* )/g, ""));
            var tooltip = str.attunement ? `-- ${str.attunement} -- \n\n ${str.description.replace(/\*/g, " -- ")}` : str.description.replace(/\*/g, " -- ");
            tooltipsForTable.push(tooltip);
            shopInventoryArray[i].splice(3, 1);
        }

        shopInventoryArray.forEach(function (subArray) {
            shopInventory.Name.push(subArray[0])
            shopInventory.Rarity.push(subArray[1]);
            var price = randomizeItemPrice(subArray[1]); ///Finna viðeigandi randomized verð
            if (subArray[2].toLowerCase() === "potion" || subArray[2].toLowerCase() === "scroll") {
                price /= 2;
            }
            price *= shopPricing;
            shopInventory.Price.push(makePrettyPriceString(price));
        });

        shopInventoryObject = shopInventory;
        emptyAndCreateTable();
        if (generateDescription) generateShopDescription(shopType, shopWealth, shopInventory.Price.length);

    });
}
var shopInventoryObject;
var tooltipsForTable;
function emptyAndCreateTable() {
    var shopInventory = shopInventoryObject;
    var table = generateHTMLTable(shopInventory);
    var nameFields = table.querySelectorAll("td:first-of-type");
    for (var i = 0; i < nameFields.length; i++) {
        nameFields[i].classList.add("tooltipped", "tooltipped_large");
        nameFields[i].setAttribute("data-tooltip", tooltipsForTable[i])
    }
    var tableContainer = document.querySelector("#shop_generator_table");
    while (tableContainer.firstChild) {
        tableContainer.removeChild(tableContainer.firstChild);
    }
    tableContainer.setAttribute("data-shop_inventory", JSON.stringify(shopInventory));
    tableContainer.appendChild(table)



    var headers = document.querySelectorAll("th");
    for (var i = 0; i < headers.length; i++) {
        headers[i].addEventListener("click", sortByHeaderValue);
    }
}

var randomTableNames;
function updateRandomTableNames() {
    var input = document.getElementById("random_table_name_input");
    input.addEventListener("keydown", function (evt) {
        if (evt.keyCode == 13) {
            populateRandomTable();
        }
    });


    var encDumpInput = document.getElementById("encounter_set_dump");
    encDumpInput.addEventListener("paste", dumpCreateEncounterSet);
    var tableDumpInput = document.getElementById("random_table_dump");
    tableDumpInput.addEventListener("paste", dumpCreateTable);
    dataAccess.getRandomTables(function (data) {

        var data = data.tables;
        randomTableNames = [...Object.keys(data)];
        for (var i = 0; i < randomTableNames.length; i++) {
            randomTableNames[i] = unSerialize(randomTableNames[i])
        }
        var aws = new Awesomplete(input, { list: randomTableNames, autoFirst: true, minChars: 0, maxItems: 120 });
        input.addEventListener('awesomplete-selectcomplete', function (e) {
            populateRandomTable();
        });
    });
}



var encounterSetAwesomplete;
function updateEncounterSetNames() {
    var input = document.getElementById("encounter_set_name_input");
    input.addEventListener("keydown", function (evt) {
        if (evt.keyCode == 13) {
            loadEncounterSet();
        }
    })
    var tableDumpInput = document.getElementById("encounter_set_dump");
    tableDumpInput.addEventListener("paste", dumpCreateEncounterSet);

    dataAccess.getRandomTables(function (data) {
        var data = data.encounter_sets;
        if (data == null) return;
        var encounterSetNames = [...Object.keys(data)];

        for (var i = 0; i < encounterSetNames.length; i++) {
            encounterSetNames[i] = unSerialize(encounterSetNames[i])
        }
        encounterSetAwesomplete = new Awesomplete(input, { list: encounterSetNames, autoFirst: true, minChars: 0 });
        input.addEventListener('awesomplete-selectcomplete', function (e) {
            loadEncounterSet();
        });
    });
}

/* #region encounter sets */

function loadEncounterSet() {
    var input = document.getElementById("encounter_set_name_input");
    if (input.value == "") return;
    dataAccess.getRandomTables(function (data) {
        var data = (data.encounter_sets ? data.encounter_sets : []);
        var selectedSet = data[serialize(input.value)]
        createEncourSetTableFromDataSet(selectedSet)
    });


}


function createEncourSetTableFromDataSet(dataset) {
    var tableContainer = document.getElementById("customize_table");
    randomizeTable = null;
    clearRandomTableContainer();

    var creatureArray = [];

    if (dataset == null) {
        creatureArray.push("");
        document.getElementById("delete_encounter_set_button").classList.add("hidden");
    } else {
        document.getElementById("delete_encounter_set_button").classList.remove("hidden");
        for (var i = 0; i < dataset.length; i++) {
            var curr = dataset[i];
            creatureArray.push(curr);
        }
    }
    randomizeTable = generateEncounterTable({
        creatures: creatureArray,
    })
    tableContainer.appendChild(randomizeTable);

    document.getElementById("save_encounter_set_button").classList.remove("hidden");
    document.getElementById("add_encounter_set_row").classList.remove("hidden");

    if (dataset != null) {
        addEncounterSetRow("").getElementsByClassName("encounter_set_add_creature")[0].focus();
    } else {
        document.getElementsByClassName("encounter_set_add_creature")[0].focus();
    }
    refreshMonsterListInputs();
}

function generateEncounterTable(obj) {
    if (!obj || !obj.creatures)
        obj = { creatures: [] };
    var newTable = document.createElement("table");

    var currentHeader = document.createElement("thead");
    var currentRow = document.createElement("tr");
    currentHeader.appendChild(currentRow);
    newTable.appendChild(currentHeader);
    newNode = document.createElement("th");
    newNode.innerHTML = "Creatures";
    currentRow.appendChild(newNode);


    currentHeader = document.createElement("tbody");
    for (var i = 0; i < obj.creatures.length; i++) {
        currentHeader.appendChild(createEnconterSetTableRow(obj.creatures[i]));
    }
    newTable.appendChild(currentHeader);
    return newTable;
}

function createEnconterSetTableRow(value) {
    var newNode, newInput;
    currentRow = document.createElement("tr");

    newInput = document.createElement("input");
    newInput.value = value;
    newInput.classList = "encounter_set_add_creature";
    newNode = document.createElement("td");
    newNode.appendChild(newInput);
    currentRow.appendChild(newNode)

    encounterSetAwesompletes.push(new Awesomplete(newInput, { list: awesompleteSelectionSetMonsters, autoFirst: true, minChars: 1, maxItems: 50 }));
    newInput.addEventListener("awesomplete-selectcomplete", (e) => {
        var inputs = [...document.getElementsByClassName("encounter_set_add_creature")];
        var emptyInput;
        inputs.forEach(inp => {
            if (inp.value == "")
                emptyInput = inp;
        })
        if (!emptyInput) emptyInput = addEncounterSetRow("").getElementsByClassName("encounter_set_add_creature")[0];
        refreshMonsterListInputs();
        emptyInput.focus();

    });
    return currentRow;
}

function refreshMonsterListInputs() {
    var allInputValues = [];
    encounterSetAwesompletes.forEach(awes => {
        if (allInputValues.indexOf(awes.input.value) < 0)
            allInputValues.push(awes.input.value)
    });
  
    encounterSetAwesompletes.forEach(awes => {
        allInputValues.forEach(value => {
            if (awes._list.indexOf(value) >= 0) {
                awes._list.splice(awes._list.indexOf(value), 1)
            }
        });
    });
}

function addEncounterSetRow(rowData) {
    if (randomizeTable == null) return;
    var row = createEnconterSetTableRow(rowData ? rowData : "");
    randomizeTable.getElementsByTagName("tbody")[0].appendChild(row);
    return row;
}

function dumpCreateEncounterSet(evt) {
    var tableDumpInput = document.getElementById("encounter_set_dump");
    window.setTimeout(function () {
        var lines = tableDumpInput.value.split("\n");
        createEncourSetTableFromDataSet(lines)
    }, 1)
}


function deleteEncounterSet() {
    var input = document.getElementById("encounter_set_name_input");
    var encounterSetName = serialize(input.value);

    dataAccess.getRandomTables(function (data) {
        var obj = data;
        data = obj.encounter_sets;
  
        if (data[encounterSetName] == null) return;
        var response = dialog.showMessageBox(
            remote.getCurrentWindow(),
            {
                type: "question",
                buttons: ["Ok", "Cancel"],
                title: "Delete table?",
                message: "Do you wish to delete encounter set " + input.value + " ?"
            }
        );
        if (response != 0)
            return;
        delete data[encounterSetName];
        encounterSetName = unSerialize(encounterSetName);
        obj.encounter_sets = data;
        dataAccess.setRandomTables(obj, function (data) {
 
            if (encounterSetAwesomplete._list.indexOf(encounterSetName) > 0)
                encounterSetAwesomplete._list.splice(encounterSetAwesomplete._list.indexOf(encounterSetName), 1)
            clearRandomTableContainer();
            document.getElementById("save_encounter_set_button").classList.add("hidden");
            document.getElementById("delete_encounter_set_button").classList.add("hidden");
            document.getElementById("add_encounter_set_row").classList.add("hidden");
            input.value = "";

        });
    });
}

function saveEncounterSet() {
    var encounterSetName = document.getElementById("encounter_set_name_input").value;
    if (encounterSetName == "") {
        dialog.showMessageBox(
            remote.getCurrentWindow(),
            {
                type: "info",
                buttons: ["Ok"],
                title: "Unable to save table",
                message: "Table name required"
            }
        );
        return;
    }

    var creatureList = [];
    encounterSetAwesompletes.forEach(awes => {
        var cret = awes.input.value;
        if (cret == "")
            return;
        var doesExist = listOfAllMonsters.indexOf(cret) >= 0;
        if (doesExist) {
            creatureList.push(cret);
        }
    });
    dataAccess.getRandomTables((data) => {
        data.encounter_sets[serialize(encounterSetName)] = creatureList;
        dataAccess.setRandomTables(data, (resultData, err) => {
            if (encounterSetAwesomplete._list.indexOf(encounterSetName) < 0)
                encounterSetAwesomplete._list.push(encounterSetName)
            if (err) {
                $('#save_failed').fadeIn("fast").delay(2500).fadeOut("slow");
                return;
            }
            document.getElementById("delete_encounter_set_button").classList.remove("hidden");
      
            $('#save_success').finish().fadeIn("fast").delay(2500).fadeOut("slow");
            document.getElementById("encounter_set_name_input").value = "";
            clearRandomTableContainer();

        });

    });
}
/* #endregion encounter sets */
/* #region random tables */

function dumpCreateTable(evt) {
    var tableDumpInput = document.getElementById("random_table_dump");
    window.setTimeout(function () {
        processDump();
    }, 1)

    function processDump() {
        var input = tableDumpInput.value;
        if (input == "") return;
        var allLines = input.split("\n");
        var baseProbability = 1 / allLines.length;
        var currentLine;
        var obj = [];

        for (var i = 0; i < allLines.length; i++) {
            currentLine = allLines[i].split("\t");
            if (currentLine.length > 1) {

                obj.push(
                    {
                        title: currentLine[0],
                        probability: currentLine[2] ? createProbabilityFromTableString(currentLine[2], baseProbability) : baseProbability,
                        content: currentLine[1],
                        active: currentLine[3] ? currentLine[3] : "y"
                    }
                )
            } else {
                obj.push(
                    {
                        title: "",
                        probability: baseProbability,
                        content: allLines[i],
                        active: "y"
                    }
                )
            }

        }
        createRandomizeTableFromSet(obj)

        function createProbabilityFromTableString(probString, fallback) {
            var values = probString.split(/[+|-]+/);
            var finalValue;
   
            if (values.length > 1) {
                var higherNumber = Math.max(parseInt(values[0]), parseInt(values[1]));
                var lowerNumber = Math.min(parseInt(values[0]), parseInt(values[1]));
         
                finalValue = higherNumber - lowerNumber;
                if (isNaN(finalValue))
                    return fallback;
                return finalValue;
            }
            finalValue = parseInt(probString)
            if (isNaN(finalValue))
                return fallback;
            return finalValue
        }
    }
}
var randomizeTable;
function populateRandomTable() {

    var input = document.getElementById("random_table_name_input");
    if (input.value == "") {
        document.getElementById("delete_table_button").classList.add("hidden");
        return;
    }

    dataAccess.getRandomTables(function (data) {
        var data = data.tables;
        var selectedSet = data != null ? data[serialize(input.value)] : null;
        createRandomizeTableFromSet(selectedSet)
    });
}

function generateRandomTable(jsonObj) {

    var expectedLength = Object.values(jsonObj)[0].length;
    for (var i = 1; i < Object.values(jsonObj).length; i++) {
        if (Object.values(jsonObj)[i].length != expectedLength) {
            console.log("Cannot create table from arrays of unequal length.");
            return;
        }
    }
    var newTable = document.createElement("table");
    var newNode, newInput;
    var currentHeader = document.createElement("thead");
    var currentRow = document.createElement("tr");
    var columnCount = 0;
    currentHeader.appendChild(currentRow);
    newTable.appendChild(currentHeader);
    for (arr in jsonObj) {
        columnCount++;
        newNode = document.createElement("th");
        newNode.innerHTML = unSerialize(arr);
        currentRow.appendChild(newNode);
    }
    currentHeader = document.createElement("tbody");
    for (var i = 0; i < expectedLength; i++) {
        currentRow = document.createElement("tr");
        currentHeader.appendChild(currentRow);
        for (var j = 0; j < columnCount; j++) {
            newNode = document.createElement("td");
            if (j == 3) {
                newInput = document.createElement("input");
                newInput.value = Object.values(jsonObj)[j][i];
                newInput.classList = "random_table_followup_input";
                newNode.appendChild(newInput);
                createTableNameAwesomeplete(newInput);

            } else {
                newNode.innerHTML = Object.values(jsonObj)[j][i];
                newNode.setAttribute("contenteditable", true);
            }

            currentRow.appendChild(newNode);
        }
        currentRow.appendChild(createDeleteButton())
    }
    newTable.appendChild(currentHeader);
    return newTable;

    function createDeleteButton() {
        var btn = document.createElement("button");
        btn.classList = "remove_button";
        btn.onclick = function (evt) {
            var parent = evt.target.closest("tr");
            parent.parentNode.removeChild(parent);
        }
        return btn;
    }
}
function createTableNameAwesomeplete(newInput) {
    new Awesomplete(newInput, { list: randomTableNames, autoFirst: true, minChars: 0, maxItems: 50 });
}

function deleteRandomTable() {
    var input = document.getElementById("random_table_name_input");
    var tblName = serialize(input.value);
    dataAccess.getRandomTables(function (data) {
        var obj = data;
        data = obj.tables;
    
        if (!data || data[tblName] == null) return;
        var response = dialog.showMessageBoxSync(
            remote.getCurrentWindow(),
            {
                type: "question",
                buttons: ["Ok", "Cancel"],
                title: "Delete table?",
                message: "Do you wish to delete table " + input.value + " ?"
            }
        );
  
        if (response != 0)
            return;
    
        delete data[tblName];

        obj.tables = data;
        dataAccess.setRandomTables(obj, function (data) {
 
            if (randomTableNames.indexOf(input.value) < 0) {
                randomTableNames.splice(randomTableNames.indexOf(input.value), 1);
            }
            clearRandomTableContainer();
            document.getElementById("save_table_button").classList.add("hidden");
            document.getElementById("delete_table_button").classList.add("hidden");
            document.getElementById("addTableRowButton").classList.add("hidden");

        });
    });
}


function saveRandomTable() {
    var input = document.getElementById("random_table_name_input");
    if (input.value == "") {
        dialog.showMessageBox(
            remote.getCurrentWindow(),
            {
                type: "info",
                buttons: ["Ok"],
                title: "Unable to save table",
                message: "Table name required"
            }
        );
        return;
    }
    var tblBody = randomizeTable.getElementsByTagName("tbody")[0];
    var rows = tblBody.querySelectorAll("tr");
    var arr = [];
    for (var i = 0; i < rows.length; i++) {

        var obj = {};
        var children = rows[i].getElementsByTagName("td");
        if (children[0].innerHTML == "" &&
            children[1].innerHTML == "" &&
            children[3].getElementsByTagName("input")[0].value == ""
        ) {
            continue;
        }
        obj.title = children[0].innerHTML;
        obj.content = children[1].innerHTML;
        obj.probability = isNaN(parseFloat(children[2].innerHTML)) ? 1 : parseFloat(children[2].innerHTML);
        obj.followup_table = children[3].getElementsByTagName("input")[0].value ? serialize(children[3].getElementsByTagName("input")[0].value) : "";
        arr.push(obj);
    }

    var tblName = serialize(input.value);
    dataAccess.getRandomTables(function (data) {
        var obj = data;
        data = obj.tables;
        if (data == null) data = {};
        data[tblName] = arr;
        obj.tables = data;
  
        dataAccess.setRandomTables(obj, function (data, err) {
            if (err) {
                $('#save_failed').fadeIn("fast").delay(2500).fadeOut("slow");
                return;
            }
            if (randomTableNames.indexOf(input.value) < 0) {
                randomTableNames.push(input.value);
            }
            document.getElementById("delete_table_button").classList.remove("hidden");
            console.log("saved")
            $('#save_success').finish().fadeIn("fast").delay(2500).fadeOut("slow");

        });

    });
}

function clearRandomTableContainer() {
    var tableContainer = document.getElementById("customize_table");
    randomizeTable = null;
    while (tableContainer.firstChild) {
        tableContainer.removeChild(tableContainer.firstChild);
    }
    awesompleteSelectionSetMonsters = [...listOfAllMonsters];
    encounterSetAwesompletes = [];
}

function createRandomizeTableFromSet(dataset) {
    var tableContainer = document.getElementById("customize_table");
    randomizeTable = null;
    clearRandomTableContainer();

    var titleArray = [];
    var contentArray = [];
    var probabilityArray = [];
    var activeArray = [];
    var rollAgainArray = [];
    if (dataset == null) {
        titleArray.push("");
        contentArray.push("");
        probabilityArray.push("");
        activeArray.push("");
        rollAgainArray.push("");
        document.getElementById("delete_table_button").classList.add("hidden");
    } else {
        document.getElementById("delete_table_button").classList.remove("hidden");
        for (var i = 0; i < dataset.length; i++) {
            var curr = dataset[i];
            titleArray.push(curr.title ? curr.title : "");
            contentArray.push(curr.content ? curr.content : "");
            probabilityArray.push(curr.probability ? curr.probability : "");
            activeArray.push(curr.active ? curr.active : "");
            rollAgainArray.push(curr.followup_table ? unSerialize(curr.followup_table) : "");
        }
    }
    randomizeTable = generateRandomTable({
        Title: titleArray,
        Content: contentArray,
        Percentage: probabilityArray,
        Roll_again_on: rollAgainArray
    })
    tableContainer.appendChild(randomizeTable);

    document.getElementById("save_table_button").classList.remove("hidden");
    document.getElementById("addTableRowButton").classList.remove("hidden");
}


function addRandomTableRow() {
    if (randomizeTable == null) return;
    var row = document.createElement("tr");
    for (var i = 0; i < 3; i++) {
        var td = document.createElement("td");
        td.setAttribute("contenteditable","true");

        row.appendChild(td);
        
    }
    var td = document.createElement("td");
    td.setAttribute("contenteditable","true");
    var tdInput = document.createElement("input");
    tdInput.classList = "random_table_followup_input";
    td.appendChild(tdInput);
    createTableNameAwesomeplete(tdInput);
    
    row.appendChild(td)
    randomizeTable.getElementsByTagName("tbody")[0].appendChild(row);
}

/* #endregion random tables */
/**
 * 
 * @param {*} data Allt data klabbið
 * @param {*} gender "male" eða "female"
 * @param {*} foundNameSet Nafnasettið, t.d. "anglo" nöfn
 * @param {*} creatrueType Hvort um sé að ræða celestial, humanoid eða annað slíkt
 */
function generateNPC(data, gender, foundNameSet, creatureType) {

    var genderHeShe, subset;
    var npcValues = {};
    if (gender == "any") gender = pickOne(["male", "female"])
    if (gender == "male") {
        subset = foundNameSet.male;

        genderHeShe = "he";

    } else {
        subset = foundNameSet.female;
        genderPosessive = "her";
        genderAbout = "her";
        genderHeShe = "she";
        genderManWoman = "woman";
    }


    npcValues.firstname = pickOne(subset);
    npcValues.lastname = pickOne(foundNameSet.lastnames)


    //profession
    var likely, midlikely, selectedProfessionSet;
    likely = 65;
    midlikely = 93;

    var creatureSet = data.generated_creatures[creatureType];
    var randomIndex = Math.ceil(Math.random() * 100);
    if (randomIndex < likely) {
        selectedProfessionSet = creatureSet.professions.common;
    } else if (randomIndex < midlikely) {
        selectedProfessionSet = creatureSet.professions.uncommon;
    } else {
        selectedProfessionSet = creatureSet.professions.rare;
    }
    var joblessString = "", connectionString;
    if (creatureType === "humanoid") {
        var jobless = Math.random() * 100;
        if (jobless > 98) joblessString = "Unemployed ";
        connectionString = ", and ";

    } else {
        connectionString = ". " + genderHeShe.charAt(0).toUpperCase() + genderHeShe.slice(1) + " ";
    }
    npcValues.profession = joblessString + pickOne(selectedProfessionSet);

    if (creatureSet.population_data) {
        var popData = creatureSet.population_data;
        var age = mathyUtil.getNormallyDistributedNum(popData.mean, popData.STD);
        if (popData.min && age < popData.min)
            age = popData.min;
        age = Math.round(age);
        npcValues.age = age;
    }

    npcValues.description = " " + pickOne(creatureSet.traits) + ". " + genderHeShe.charAt(0).toUpperCase() +
        genderHeShe.slice(1) + " has a " + pickOne(creatureSet.appearance.face_shape) + ", " + pickOne(creatureSet.appearance.face_aesthetics) + " face"
        + connectionString + pickOne(creatureSet.appearance.build) + ". " +
        npcValues.firstname + " " + pickOne(creatureSet.hooks) + ".";



    npcValues.description = replacePlaceholders(npcValues.description, gender == "male", data);

    npcValues.shopKeepDescription = npcValues.description + " " + npcValues.firstname + " " + pickOne(data.shops.owner_attitude) + " towards customers.";
    npcValues.tavernKeepDescription = npcValues.description;
    npcValues.description = npcValues.firstname + npcValues.description;


    return npcValues;
}

function replacePlaceholders(string, isMale, data) {
    if (!string) return;
    console.log(isMale)
    replacementValues.forEach(replacement => {
        var replWith = replacement.replace_with;

        if (Array.isArray(replWith)) {
            string = replaceAll(string, replacement.value, replWith);
        } else if (typeof replWith == "string") {
            if (isArrayReference(replWith)) {
                replWith = replWith.substring(6);
                var split = replWith.split(".");
                var replacementValue;
                split.forEach(splitV => { replacementValue = data[splitV] })

                if (replacementValue == null) return;
                string = replaceAll(string, replacement.value, replacementValue);
            }
        } else if (typeof replWith == "object") {

            if (isMale != null && replWith.male && replWith.female) {
                console.log(replWith.male);
                var replacementArr = isMale ? replWith.male : replWith.female;
                console.log(replacementArr, replacementArr[0].split("."))
                if (replacementArr[0] && isArrayReference(replacementArr[0]))
                    replacementArr = data[replacementArr[0].split(".")[1]];
                string = replaceAll(string, replacement.value, replacementArr);
            }
        }
    });

    return string;
}
function isArrayReference(string) {
    return string.substring(0, 5) == "$this";
}
function generateTavern() {
    dataAccess.getGeneratorData(function (data) {
        document.getElementById("reroll_tavern_button").classList.remove("hidden");
        var tavernWealthDropdown = document.querySelector("#tavern_wealth");
        var tavernWealth = tavernWealthDropdown.options[tavernWealthDropdown.selectedIndex].value;
        var tavernDescription = "";

        var ownerAndNameobj = generateTavernName(data)
        var tavernName = ownerAndNameobj.name;
        var tavernOwner = ownerAndNameobj.owner;

        var tavernHeader = document.querySelector("#tavern_name");
        tavernHeader.innerHTML = tavernName;

        document.querySelector("#tavern_description").innerHTML = tavernDescription;
        tavernHeader.classList.remove("hidden");


        generateTavernRumorsAndMenu(data);
    
        var description = "<strong>" + tavernName + "</strong>" + pickOne([" is located", " is situated", " can be found", " is placed "]) + " " + pickOne(data.tavern.locations) + ". ";

        description += "The interior is " + pickOne(data.shops.interior.description[tavernWealth]) + " with a " + pickOne(data.tavern.flooring[tavernWealth]) + " floor.";
        description += " The bar is " + pickOne(data.tavern.barstyle) + ". " + pickOne(["Round", "Square"]) + " tables are " + pickOne(data.tavern.table_setup) + ".";

        description += " " + pickOne(data.tavern.that_little_extra[tavernWealth]) + ".";
        description = description.replace(/_material/g, pickOne(data.material[tavernWealth]));

        description = replacePlaceholders(description, Math.random() > 0.5, data);


        var ownerName = tavernOwner.lastname;
        if (ownerName != "" && ownerName != null) ownerName = " " + ownerName;
        description += "<br><br>The owner, " + tavernOwner.firstname + (ownerName || "") + "," + tavernOwner.tavernKeepDescription;

        document.getElementById("tavern_description").innerHTML = description;

        // adjustHeaderCurveAndShow(tavernHeader, tavernHeaderCurve, tavernNameHeaderBox)

    });


}

function generateTavernRumorsAndMenu(data) {
    var menuTable = {};

    var tavernPriceDropdown = document.querySelector("#tavern_pricing");
    var tavernWealthDropdown = document.querySelector("#tavern_wealth");
    var rumorDropdown = document.querySelector("#tavern_rumours");
    var tavernMenuTypeDropdown = document.querySelector("#tavern_menu");

    var menuType = tavernMenuTypeDropdown.options[tavernMenuTypeDropdown.selectedIndex].value;
    var rumourCount = rumorDropdown.options[rumorDropdown.selectedIndex].value;
    var tavernWealth = tavernWealthDropdown.options[tavernWealthDropdown.selectedIndex].value;
    var tavernPrice = tavernPriceDropdown.options[tavernPriceDropdown.selectedIndex].value;

    var menuArray = data.tavern.menu[menuType];
    //cheaper =0 , more expensive = 1
    var arr = [pickX(menuArray[tavernWealth][0], d(2)), pickX(menuArray[tavernWealth][1], d(2))];
    var drinks = pickX(data.tavern.drinks[menuType][tavernWealth], d(4) + tavernWealth);
    var finalMenuArray = [];
    var pricesArray = [];
    var priceBase, coinString, dish, drink;
    var tavernEconomyArray = [
        [d(4), "cp"],
        [d(3), "sp"],
        [d(10), "sp"],
        [d(6), "gp"]
    ]
    priceBase = tavernEconomyArray[tavernWealth][0];
    priceBase *= tavernPrice;
    coinString = tavernEconomyArray[tavernWealth][1];
    var vegetables, exoticVegetables, finalPrice, finalPriceString;
    //Food
    for (var i = 1; i < 3; i++) {
        for (var j = 0; j < arr[i - 1].length; j++) {
            dish = arr[i - 1][j];
            vegetables = pickX(data.vegetables, 2)
            exoticVegetables = pickX(data.exotic_vegetables, 2)

            dish = dish.replace(/_2vegetables/g, vegetables[0] + " and " + vegetables[1]);
            dish = dish.replace(/_2exotic_vegetables/g, exoticVegetables[0] + " and " + exoticVegetables[1]);
            dish = dish.replace(/_exotic_vegetables/g, pickOne(data.exotic_vegetables));
            dish = dish.replace(/_vegetables/g, pickOne(data.vegetables));
            dish = dish.replace(/_meat/g, pickOne(data.meat));
            dish = dish.replace(/_exoticmeat/g, pickOne(data.exotic_meat));
            dish = dish.replace(/_fish/g, pickOne(data.fish));
            dish = dish.replace(/_dessert/g, pickOne(data.tavern.desserts));
            dish = dish.toProperCase();
            finalMenuArray.push(dish);
            finalPrice = i * priceBase;
            pricesArray.push(convertAmountToHighestCurrencty(finalPrice, coinString));
        }
    }
    //Drinks
    for (var i = 0; i < drinks.length; i++) {
        drink = drinks[i];
        drink = drink.replace(/_brewer/g, pickOne(data.tavern.brewers));
        pricesArray.push(convertAmountToHighestCurrencty(priceBase, coinString));
        finalMenuArray.push(drink);
    }

    menuTable.Item = finalMenuArray;
    menuTable.Price = pricesArray;




    var table = generateHTMLTable(menuTable);
    var tableContainer = document.querySelector("#tavern_table");
    while (tableContainer.firstChild) {
        tableContainer.removeChild(tableContainer.firstChild);
    }
    tableContainer.appendChild(table);


    var rumorArray = generateRumors(d(3) * parseInt(rumourCount), data)
    var tavernRumorsParentContainer = document.getElementById("tavern_rumors")
    while (tavernRumorsParentContainer.firstChild) {
        tavernRumorsParentContainer.removeChild(tavernRumorsParentContainer.firstChild);
    }

    if (rumorArray.length > 0) {
        var rumorContainer = document.createElement("div");
        var rumorHeader = document.createElement("h2");
        rumorHeader.innerHTML = "Rumors";
        rumorContainer.appendChild(rumorHeader);
        rumorContainer.classList.add("rumor_container")
        rumorContainer.classList = "column";
        var currentRow, currentP, currentRumorMonger, currentNameEle, currentDescEle;
        for (var i = 0; i < rumorArray.length; i++) {
            currentRow = document.createElement("div");
            currentP = document.createElement("p");
            currentNameEle = document.createElement("p");
            currentNameEle.classList.add("rumor_row_name");

            currentRow.classList.add("rumor_row");
            currentP.innerHTML = `"${rumorArray[i]}"`;
            currentP.classList.add("rumor_row_rumor");
            currentRumorMonger = generateNPC(data, pickOne(["male", "female"]), data.names.anglo, "humanoid")

            currentDescEle = document.createElement("p");
            currentDescEle.classList.add("rumor_row_description");
            var travelingString = Math.random() > 0.8 ? "traveling" : "local";
            currentNameEle.innerHTML = `<strong>${currentRumorMonger.firstname} ${currentRumorMonger.lastname || ""}, a ${travelingString} ${currentRumorMonger.profession.toLowerCase()} ${(currentRumorMonger.age ? `(${currentRumorMonger.age})` : "")}</strong>`;
            currentDescEle.innerHTML = currentRumorMonger.description;
            currentRow.appendChild(currentNameEle);
            currentRow.appendChild(currentP);
            currentRow.appendChild(currentDescEle);
            rumorContainer.appendChild(currentRow)
        }
        document.getElementById("tavern_rumors").appendChild(rumorContainer);
    }
}
function generateTavernName(data) {
    var tavernName = pickOne(data.tavern.name.template);
    var ownerGender = pickOne(["male", "female"]);
    var tavernOwner = generateNPC(data, ownerGender, data.names["anglo"], "humanoid");

    var ending = "'s";
    if (tavernOwner.firstname.substring(tavernOwner.firstname.length - 1) === "s") ending = "'";
    tavernName = tavernName.replace(/_name/g, tavernOwner.firstname + ending);
    tavernName = tavernName.replace(/_common_animal/g, pickOne(data.common_animal));
    tavernName = tavernName.replace(/_adjective/g, pickOne(data.tavern.name.adjective));
    tavernName = tavernName.replace(/_tavern/g, pickOne(data.tavern.name.tavern));
    tavernName = tavernName.replace(/_profession/g, pickOne(data.tavern.name.profession));
    tavernName = tavernName.replace(/_unique/g, pickOne(data.tavern.name.unique));
    return { name: tavernName, owner: tavernOwner };
}
function generateRumors(rumorAmount, data) {
    var rumorArray = pickX(data.rumors, rumorAmount);
    if (rumorAmount > data.rumors.length) rumorAmount = data.rumors.length;
    var rumor;

    for (var i = 0; i < rumorAmount; i++) {
        rumor = rumorArray[i];
        rumor = rumor.replace(/_manwoman/g, pickOne(["man", "woman"]));
        rumor = rumor.replace(/_tavernname/g, generateTavernName(data).name);
        rumor = rumor.replace(/_noble/g, pickOne(data.noble));
        rumor = rumor.replace(/_forest/g, pickOne(data.forests));
        rumor = replaceAll(rumor, "_creatures", data.creatures);
        rumor = replaceAll(rumor, "_monster", data.monsters);
        rumor = replaceAll(rumor, "_mountain", data.mountains);
        rumor = replaceAll(rumor, "_structure", data.structures);
        var allProfessions = [data.generated_creatures.humanoid.professions.common, data.generated_creatures.humanoid.professions.uncommon, data.generated_creatures.humanoid.professions.rare].flat();

        rumor = rumor.replace(/_profession/g, pickOne(allProfessions).toLowerCase());


        rumor = replaceAll(rumor, "_forest", data.forests);
        rumor = replaceAll(rumor, "_name", data.names.anglo.male);
        rumor = replaceAll(rumor, "_femalename", data.names.anglo.female);
        rumor = replaceAll(rumor, "_lastname", data.names.anglo.lastnames);
        rumor = replaceAll(rumor, "_locale", data.locales);
        rumor = capitalizeAndDot(rumor);
        rumorArray[i] = rumor;

    }


    return rumorArray;
}

function capitalizeAndDot(string) {
    string = string.substring(0, 1).toUpperCase() + string.substring(1) + ".";
    return string;
}
function replaceAll(string, replacementString, replaceArray) {
    while (string.indexOf(replacementString) > -1) {
        string = string.replace(replacementString, pickOne(replaceArray));
    }
    return string;

}
function convertAmountToHighestCurrencty(amountString, coinString) {
    var currentCurrencyIndex = currencies.coins.indexOf(coinString);
    if (amountString > currencies.conversions[currentCurrencyIndex] && currentCurrencyIndex != currencies.coins.length - 1) {
        var priceNextCurrency = Math.ceil(amountString / currencies.conversions[currentCurrencyIndex]);
        var remainder = (amountString % currencies.conversions[currentCurrencyIndex])
        return priceNextCurrency + " " + currencies.coins[currentCurrencyIndex + 1] +
            (remainder == 0 ? "" : " and " + remainder + " " + coinString);

        //Þessi partur virkar ekki rétt og ég nennti ekki að laga svo ég rúnaði
    } else if (amountString < currencies.conversions[currentCurrencyIndex] && currentCurrencyIndex != 0) {
        var priceNextCurrency = (amountString * currencies.conversions[currentCurrencyIndex - 1]);


        return Math.floor(priceNextCurrency) + " " + currencies.coins[currentCurrencyIndex - 1]
    } else {
        return (amountString < 1 ? Math.ceil(amountString) : amountString) + " " + coinString;
    }

}

function generateShopDescription(shopType, shopWealth, inventorySize) {
    shopType = shopType.serialize();
    dataAccess.getGeneratorData(function (data) {
        var randomIndex = Math.floor(Math.random() * data.shops.names.template.length);

        var shopOwner;
        var shopName = "" + data.shops.names.template[randomIndex];
        var fantasyProbability = 0.1 + 0.1 * shopWealth;
        var rand = Math.random();
        var descriptionSet, clutterSet, locationSet;
        //Interior speisaður
        if (rand < fantasyProbability) {
            descriptionSet = data.shops.interior.description_fantastic[shopWealth];
            clutterSet = data.shops.interior.clutter_fantastic;
        } else {
            descriptionSet = data.shops.interior.description[shopWealth];
            clutterSet = data.shops.interior.clutter;
        }

        //staðsetning speisuð
        rand = Math.random();
        var creatureType = "humanoid";
        var ownerGender = pickOne(["male", "female"]);
        if (rand < fantasyProbability) {
            locationSet = data.shops.location_fantastic;
            var nameset;
            creatureType = pickOne(["celestial", "fey", "aberration", "fiend", "humanoid"])
            if (creatureType === "humanoid") {
                nameset = "anglo";
            } else {
                nameset = creatureType;
            }

            shopOwner = generateNPC(data, ownerGender, data.names[nameset], creatureType);

        } else {
            locationSet = data.shops.location;
            shopOwner = generateNPC(data, ownerGender, data.names.anglo, "humanoid");
        }

        var ownerLastName;
        if (shopOwner.lastname) {
            ownerLastName = shopOwner.lastname;
        } else {
            ownerLastName = shopOwner.firstname;
        }


        var ownerName = randomIndex >= 1 ? shopOwner.firstname : ownerLastName;
        var ending = "'s";
        if (ownerName.substring(ownerName.length - 1) === "s") ending = "'";
        shopName = shopName.replace(/_typeboundname/g, pickOne(data.shops.names.typeboundname[shopType]));
        shopName = shopName.replace(/_typebound/g, pickOne(data.shops.names.typebound[shopType]));

        shopName = shopName.replace(/_wealthbound/g, pickOne(data.shops.names.wealthbound[shopWealth]));
        shopName = shopName.replace(/_name/g, ownerName + ending);
        shopName = shopName.replace(/_adjective/g, pickOne(data.shops.names.adjective));

        shopName = shopName.replace(/_wares/g, pickOne(data.shops.names.wares[shopType]));
        shopName = shopName.replace(/_surname/g, ownerLastName + ending);

        shopName = replacePlaceholders(shopName, null, data);
        var descriptionBox = document.querySelector("#shop_description");
        var headerBox = document.querySelector("#shop_name");
        headerBox.classList.remove("hidden");
        shopName = shopName.toProperCase();

        var description = "<strong>" + shopName + "</strong>" + pickOne([" is located", " is situated", " can be found", " is placed "]) + pickOne(locationSet) + ". ";
        description = description.replace(/_roominhouse/g, pickOne(data.roominhouse));
        if (description.includes("!nointerior")) {
            description = description.replace(/!nointerior/g, "");
        } else {
            description += "The interior of the shop is " + pickOne(descriptionSet) + ". "
                + pickOne(clutterSet) + "."
            description = description.replace(/_material/g, pickOne(data.material[shopWealth]));
            description = description.replace(/_metal/g, pickOne(data.metals));
            description = description.replace(/_element/g, pickOne(["earth", "fire", "water", "air"]));
            description = description.replace(/_inventory/g, pickOne(["inventory is", "merchandise is", "stock is"]));
            description = description.replace(/_inventorypl/g, pickOne(["wares are", "commodities are", "goods are"]));
            description = description.replace(/_figures/g, pickOne(data.figures));
            description = description.replace(/_color/g, pickOne(data.color));
            if (shopWealth < 2 && inventorySize < 10) {
                var waresString;
                if (shopType === "potion") {
                    waresString = "medicinal and magical herbs, useful for crafting potions, "
                } else if (shopType === "weapon") {
                    waresString = "nonmagical but finely crafted weapons"
                } else if (shopType === "scroll") {
                    waresString = "rare tomes and books containing various lore"
                } else if (shopType === "item") {
                    waresString = "rare jewels and wondrous item ingreidents"
                } else {
                    waresString = "various adventuring gear"
                }
                description += "<br><br> In addition to the items displayed in the magic item table, the shop has " + waresString + " for sale. "
            }
        }



        var creatureString, commaString;
        if (creatureType === "humanoid") {
            creatureString = "";
            commaString = "";
        } else {
            if (ownerGender === "male") {
                creatureString = " is a " + creatureType + ". He ";
                commaString = "";
            } else {
                creatureString = " is a " + creatureType + ". She ";
                commaString = "";
            }

        }
        var ownerName = shopOwner.lastname;
        if (ownerName) ownerName = " " + ownerName;
        description += "<br><br>The owner, " + shopOwner.firstname + (ownerName || "") + "," + creatureString + commaString + shopOwner.shopKeepDescription;
        headerBox.innerHTML = shopName;
        var shopHeaderCurve = document.querySelector("#curve_shop_name");
        var shopNameHeaderBox = document.querySelector("#shop_name_headerbox");
        headerBox.classList.remove("hidden");
        // adjustHeaderCurveAndShow(headerBox, shopHeaderCurve, shopNameHeaderBox)
        descriptionBox.innerHTML = description;

    });

}

function typeFilter(jsonObj, type) {
    console.log("filtering " + type)
    var results = [];
    for (var i = 0; i < jsonObj.length; i++) {
        if (typeof jsonObj[i].type != "string") continue;
        if (jsonObj[i].type.toLowerCase() == type) {
            results.push(jsonObj[i]);
        }
    }
    return results;
}



var sortDirections = [false, false, false]
var keys = ["Name", "Rarity", "Price"]
var switchFunctions = [,]
function sortByHeaderValue(element) {
    var rows, switching, i, x, y, shouldSwitch, switchFunction, switchcount = 0;
    var n = keys.indexOf(this.innerHTML)

    if (n < 2) {
        switchFunction = function (x, y) { return x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase() }
    } else {
        switchFunction = function (x, y) { return parseInt(undoPrettyPriceString(x.innerHTML)) > parseInt(undoPrettyPriceString(y.innerHTML)) }
    }
    switching = true;
    sortDirections[n] = true;
    while (switching) {
        switching = false;
        rows = document.querySelectorAll("#shop_generator_table>table>tbody>tr");

        for (i = 0; i < rows.length - 1; i++) {
            shouldSwitch = false;
            x = rows[i].getElementsByTagName("TD")[n];

            y = rows[i + 1].getElementsByTagName("TD")[n];

            if (sortDirections[n]) {
                if (switchFunction(x, y)) {
                    shouldSwitch = true;
                    break;
                }
            } else if (!sortDirections[n]) {
                if (switchFunction(y, x)) {
                    shouldSwitch = true;
                    break;
                }
            }
        }
        if (shouldSwitch) {
            rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
            switching = true;
            // Each time a switch is done, increase this count by 1:
            switchcount++;
        } else {
            /* If no switching has been done AND the direction is "asc",
            set the direction to "desc" and run the while loop again. */
            if (switchcount == 0 && sortDirections[n]) {
                sortDirections[n] = false;
                switching = true;
            }
        }
    }

}
function d(sides) {
    return Math.floor(Math.random() * sides) + 1;
}

function unSerialize(string) {
    return string.replace(/_/g, " ");
}

function serialize(string) {
    return string.replace(/ /g, "_");
}

function openCustomizationTab(containerName, button) {
    [...document.querySelectorAll(".generator_customization_section, .explanation_text_customize_generator")].forEach(ele => ele.classList.add("hidden"));
    document.getElementById(button.getAttribute("data-explanation_text")).classList.remove("hidden");
    document.getElementById(containerName).classList.remove("hidden");
    normalizeGeneratorPageStates();

    function normalizeGeneratorPageStates() {
        clearRandomTableContainer();
        document.getElementById("creature_navigator").classList.add("hidden");
        document.getElementById("currently_editing_navigator").innerHTML = "";
    }
}

function setTab(x) {
    var tabs = document.getElementsByClassName("tab");
    for (var i = 0; i < tabs.length; i++) {
        tabs[i].classList.remove("toggle_button_toggled");
        var currentSection = document.querySelector("#" +tabs[i].getAttribute("data-section_id") + "_section")
        currentSection.classList.add("hidden");
    }

    document.getElementById(x).classList.add("toggle_button_toggled")
    document.querySelector("#" + x + "_section").classList.remove("hidden");
}

function populateGenerationSetMenu() {
    dataAccess.getGeneratorData(function (data) {
        var newOption, setName;
        var setDropDownChooser = document.querySelector("#choose_nameset");
        for (var i = 0; i < Object.keys(Object.values(data)[0]).length; i++) {
            setName = Object.keys(Object.values(data)[0])[i];
            newOption = document.createElement("option");
            newOption.setAttribute("value", setName);
            newOption.innerHTML = setName.charAt(0).toUpperCase() + setName.slice(1);
            setDropDownChooser.appendChild(newOption);
        }
    });
}


function makePrettyPriceString(str) {
    return str.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " gp";
}
function undoPrettyPriceString(str) {
    str = str.substring(0, str.length - 3);
    str = str.replace(/,/g, "");

    return str;
}



function generateHook(iterations) {

    dataAccess.getGeneratorHookData(function (data) {
        var route = pickX(data.routes, iterations);
        var message = "";
        for (var i = 0; i < route.length; i++) {
            message += pickOne(data.messageFromHal[route[i]]);
        }
        message += ".";

        return message;

    });
}

function pickOne(arr) {
    if (arr == null) return null;
    var randomIndex = Math.floor(Math.random() * arr.length);

    return arr[randomIndex];
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



function randomizeItemPrice(rarity) {
    if (rarity == null) return 0;
    rarity = rarity.toLowerCase();

    switch (rarity) {
        case "common":
            return 10 * (d(6) + 1);
        case "uncommon":
            return d(6) * 100;
        case "rare":
            return 2 * d(10) * 1000;
        case "very rare":
            return (d(4) + 1) * 10000;
        case "legendary":
            return 2 * d(6) * 25000;
        case "artifact":
            return "Priceless";

    }
    return 0;
}
function evaluateRarity(str) {
    if (str == null) return -1;
    str = str.toLowerCase();

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

function updateScrollList() {
    dataAccess.getSpells(function (data) {
        var scrollItems = [];
        var newItem, rarity, saveDc, attackBonus;
        data.forEach(function (element) {
            newItem = {};
            rarity = scrollLevels[0][parseInt(element.level)]
            saveDc = scrollLevels[1][parseInt(element.level)]
            attackBonus = scrollLevels[2][parseInt(element.level)]
            newItem.type = "Scroll";
            newItem.rarity = rarity;
            newItem.name = "Scroll of " + element.name;
            newItem.description = "**" + (element.classes != null ? joinAndCapitalize(element.classes) : "") + " scroll, " + rarity + "**" + "\n" +
                "Save DC " + saveDc + ". Attack bonus " + attackBonus + "."
                + "\n" + "This *spell scroll* bears the words of the " + element.name + " spell, written in a mystical cipher. If the spell is on your class’s spell list, you can use an action to read the scroll and cast the spell without having to provide any of the spell’s components. Otherwise, the scroll is unintelligible.",
                "If the spell is on your class’s spell list but of a higher level than you can normally cast, you must make an ability check using your spellcasting ability to determine whether you cast it successfully. The DC is" + (parseInt(element.level) + 10) + ". On a failed check, the spell disappears from the scroll with no other effect. Once the spell is cast, the words on the scroll fade, and the scroll itself crumbles to dust.";

            newItem.source = "SRD";
            scrollItems.push(newItem);
        });
        dataAccess.setScrolls(scrollItems);
    }
    );
}
function joinAndCapitalize(array, separator) {
    for (var i = 0; i < array.length; i++) {
        array[i] = array[i].substring(0, 1).toUpperCase() + array[i].substring(1);
    }
    if (!separator) separator = ", ";
    return array.join(separator);
}

var scrollLevels = [
    [
        "Common",
        "Common",
        "Uncommon",
        "Uncommon",
        "Rare",
        "Rare",
        "Very rare",
        "Very rare",
        "Very rare",
        "Legendary"
    ],
    [
        "13",
        "13",
        "13",
        "15",
        "15",
        "17",
        "17",
        "18",
        "18",
        "19"
    ],
    [
        "+5",
        "+5",
        "+5",
        "+7",
        "+7",
        "+9",
        "+9",
        "+10",
        "+10",
        "+11"
    ]

]



