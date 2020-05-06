
var randomizer = function () {
    var maxRerolls = 100;
    var creatureTypeList;
    var userDefinedEncounterSets;
    const randomizerInput = document.getElementById("randomizerInput")
    const randomizerTitle = document.getElementById("randomizer_item_title")
    const randomizerContent = document.getElementById("randomizer_item_content")
    const randomizerValue = document.getElementById("randomizer_item_value")
    const randomizerRaritySelect = document.getElementById("randomizer_rarity_select");
    const randomizerEncounterDangerSelect = document.getElementById("randomizer_encounter_danger_select");
    const randomizerEncounterCreatureNumberSelect = document.getElementById("randomizer_encounter_creature_number_select");
    const encounterModule = new EncounterModule();
    const randomizerClearButton = document.getElementById("randomizer_clear_button");

    randomizer_item_value
    function go() {
        var searchSet = randomizerInput.value;
        if (searchSet == "") return;

        randomizerClearButton.classList.remove("hidden")
        randomizerRaritySelect.classList.add("hidden");
        randomizerEncounterDangerSelect.classList.add("hidden");
        randomizerEncounterCreatureNumberSelect.classList.add("hidden");

        if (searchSet.substring(0, 10) == "Encounter:")
            return generateRandomEncounter(searchSet);

        if (itemTypeValues.indexOf(searchSet) >= 0 || searchSet == "Magic item") {
            return randomizeItems(searchSet);
        }


        dataAccess.getRandomTables(function (data) {
            maxRerolls = 100;
            getRandomEntry(searchSet, data.tables);
        })

    }
    function generateRandomEncounter(searchSet) {
        randomizerEncounterDangerSelect.classList.remove("hidden");
        randomizerEncounterCreatureNumberSelect.classList.remove("hidden");
        var selectedNumber = randomizerEncounterCreatureNumberSelect.options[randomizerEncounterCreatureNumberSelect.selectedIndex].value;
        var difficulty = randomizerEncounterDangerSelect.options[randomizerEncounterDangerSelect.selectedIndex].value;
        if (difficulty == "any") {
            var opt = randomizerEncounterDangerSelect.options;
            difficulty = opt[parseInt(Math.random() * opt.length)].value;
        }
        var searchSet = searchSet.substring(11);
        var monsterSet = null;
        var forcedType = null;
        if (userDefinedEncounterSets) {
            monsterSet = userDefinedEncounterSets[searchSet];
        }

        if (monsterSet == null)
            forcedType = searchSet != "Any" ? searchSet : null;

        var pcLevels = [];
        partyArray.forEach(pmember => pcLevels.push(pmember.level))

        encounterModule.getRandomEncounter(pcLevels, difficulty, selectedNumber, monsterSet, forcedType, (encounter) => {

            console.log("Generated encounter ", encounter)
            if (!encounter.error) {
                loadEncounter(encounter);
                encounterIsLoaded = true;
                statblockPresenter.createStatblock(document.getElementById("statblock"), encounter, false);
                if( document.getElementById("loaderButton")) document.getElementById("loaderButton").classList.remove("hidden");
                document.getElementById("iframewrapper").style.display = "block";
                showEntry({
                    title: "",
                    content: ""
                }, null)
            } else {
                showEntry({
                    title: encounter.name,
                    content: encounter.description
                }, null)
            }

        });
    }
    function randomizeItems(searchSet) {

        randomizerRaritySelect.classList.remove("hidden");
        var selectedRarity = randomizerRaritySelect.options[randomizerRaritySelect.selectedIndex].value;
        if (searchSet == "Scroll") {
            return randomizeScroll(selectedRarity)
        }

        dataAccess.getItems(function (data) {
            if (searchSet != "Magic item") {
                for (var i = 0; i < data.length; i++) {
                    if (data[i].type.toLowerCase() != searchSet.toLowerCase()) {
                        data.splice(i, 1);
                        if (i != 0) i--;
                    }
                }
            }
            //Filter out lists
            data = data.filter(function (element) {
                return element.type != "List";
            })
            if (selectedRarity != "any") {
                data = filterRarity(data, selectedRarity);
            }
            selectFromItemSetAndShow(data)


        });


    }
    function randomizeScroll(selectedRarity) {
        dataAccess.getScrolls(function (data) {
            if (selectedRarity != "any") {
                data = filterRarity(data, selectedRarity);
            }
            selectFromItemSetAndShow(data);
        });


    }
    function selectFromItemSetAndShow(data) {
      
        var rand = Math.floor(Math.random() * data.length);
        if (data[rand] == null) return showEntry({ title: "", content: "No items fit the criteria" }, 0)
        if (!data[rand].description) data[rand].description = "";

        var cont = (typeof data[rand].description != "string") ? data[rand].description.join("\n") : data[rand].description;

        showEntry({
            title: data[rand].name,
            content: cont != "" ?  marked(cont) : "No items fit the criteria"
        }, rand / 100)

    }
    function filterRarity(data, selectedRarity) {
        data = data.filter(function (entry) {
            return entry.rarity != null
                && entry.rarity.toLowerCase() == selectedRarity.toLowerCase();
        });

        return data;
    }

    function getRandomEntry(searchSet, data) {
        maxRerolls--;

        if (maxRerolls == 0)
            return;

        var set = data[serialize(searchSet)];
        if (set == null)
            return;

        set = Object.values(set);

        var probSum = 0;
        //normalize
        set.forEach(function (entry) {
            probSum += entry.probability
        });
        if (probSum != 1) {
            set.forEach(function (entry) {

                entry.probability = entry.probability / probSum;

            });
        }


        var rand = Math.random();
        probSum = 0;
        for (var i = 0; i < set.length; i++) {
            probSum += set[i].probability;
            if (probSum >= rand) {

                if (set[i].followup_table) {
                    return getRandomEntry(set[i].followup_table, data);
                }
                return showEntry(set[i], rand)
            }
        }


    }
    function showEntry(entry, rand) {

        randomizerTitle.innerHTML = entry.title ? entry.title : "";
        randomizerValue.innerHTML = rand != null ? "Roll: " + Math.round(rand * 100) : "";
        randomizerContent.innerHTML = entry.content ? entry.content : "";

    }

    function initialize() {

        dataAccess.getRandomTables(function (data) {
            var obj = data;
            data = obj.tables;
            values = Object.keys(data);

            for (var i = 0; i < values.length; i++) {
                values[i] = unSerialize(values[i]);
            }
            dataAccess.getItems(function (itemData) {
                itemTypeValues.forEach((itemType) => {
                    if (itemData.filter(x => x.type.toLowerCase() == itemType.toLowerCase()) != 0)
                        values.push(itemType)
                });
                values.push("Magic item");
                userDefinedEncounterSets = obj.encounter_sets;

                generateEncounterLookupValues(obj.encounter_sets, function (encounterValues) {
                    
                    values = values.concat(encounterValues)
                    values = [...new Set(values)];
                    new Awesomplete(randomizerInput, { list: values, autoFirst: true, minChars: 0, maxItems: 99 });
                })


                var rarityExists;
                for (var i = 0; i < itemRarityValues.length; i++) {
                    rarityExists = false;
                    for (var j = 0; j < itemData.length; j++) {

                        if (itemData[j].rarity && itemData[j].rarity.toLowerCase() == itemRarityValues[i].toLowerCase()) {
                            rarityExists = true;
                            break;
                        }
                    }
                    if (rarityExists) {
                        var option = document.createElement("option");
                        option.setAttribute("value", itemRarityValues[i].toLowerCase());
                        option.innerHTML = itemRarityValues[i].toLowerCase();
                        randomizerRaritySelect.appendChild(option);

                    }
                }
          


            });

        });
        randomizerInput.addEventListener('awesomplete-selectcomplete', function (e) {
            go();
        });
        randomizerRaritySelect.onchange = function (evt) { go() }
        randomizerInput.addEventListener("keydown", function (evt) {
            if (evt.keyCode == 13) go();
        })
        randomizerEncounterCreatureNumberSelect.onchange = function (evt) { go() }
        randomizerEncounterDangerSelect.onchange = function (evt) { go() }
    }

    function clear() {
        showEntry({ title: "", description: "" }, null)
        randomizerClearButton.classList.add("hidden");
        randomizerRaritySelect.classList.add("hidden");
    }

    function unSerialize(string) {
        return string.replace(/_/g, " ");
    }


    function serialize(string) {
        return string.replace(/ /g, "_");
    }

    function generateEncounterLookupValues(encounterSets, callback) {
        var allValues = ["Encounter: Any"];
        if (encounterSets) Object.keys(encounterSets).forEach(set => allValues.push("Encounter: " + set))
        dataAccess.getMonsters(monsters => {
            dataAccess.getHomebrewMonsters(hbMonsters => {
                if (hbMonsters) monsters = monsters.concat(hbMonsters);
                creatureTypeList = [];
                monsters.forEach(mon => {
                    if (creatureTypeList.indexOf(mon.type.toLowerCase().trim()) < 0) {
                        creatureTypeList.push(mon.type.toLowerCase().trim());
                    }
                });
                creatureTypeList = creatureTypeList.map(elem => elem.substring(0, 1).toUpperCase() + elem.substring(1));
                creatureTypeList.forEach(type => {
                    allValues.push("Encounter: " + type);
                });
                callback(allValues);
            })
        })

    }
    return {
        go: go,
        initialize: initialize,
        clear: clear
    }
}();