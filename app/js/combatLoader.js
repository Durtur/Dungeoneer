const elementCreator = require("./js/lib/elementCreator");

var combatLoader = (function () {
    var lastIndex = 0;
    var playerMouseUpIndexMax;
    var playerUpMouseIndex = -1;
    function loadCombat() {
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
            dataAccess.getHomebrewAndMonsters((data) => {
                var numberOfCreatures = 0;
                for (var i = 0; i < loadedEncounter.length; i++) {
                    numberOfCreatures = parseInt(loadedEncounter[i][1]);
                    var name = loadedEncounter[i][0];
                    var creature = data.find((x) => x.name.toLowerCase() === name.toLowerCase());
                    if (creature == null) {
                        console.error(`monster ${name} not found`);
                        continue;
                    }
                    creature.data_extra_attributes = {};
                    creature.data_extra_attributes.initiative = data[i].initiative ? data[i].initiative : getAbilityScoreModifier(data[i].dexterity);
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
        playerMouseUpIndexMax = partyArray.length;
        createAttackPcButtons();
    }

    function loadMonsterQueue() {
        if (loadedMonsterQueue.length == 0) return;
        window.api.openWindowWithArgs("maptoolWindow", "notify-map-tool-monsters-loaded", JSON.stringify(popQueue(loadedMonsterQueue)));
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
            if (!ac) continue;
            var logStr = "Rolled attack";
            mod = parseInt(row.getElementsByClassName("attack_field")[0].value) || 0;
            advantage = row.getElementsByClassName("combat_loader_advantage")[0].checked;
            disadvantage = row.getElementsByClassName("combat_loader_disadvantage")[0].checked;
            if (advantage) {
                rand = Math.max(d(20), d(20));
                logStr += " with advantage";
            } else if (disadvantage) {
                rand = Math.min(d(20), d(20));
                logStr += " with disadvantage";
            } else {
                rand = d(20);
            }
            logStr += ` (${rand})`;
            var dmgField = row.getElementsByClassName("damage_field")[0];
            var formerText = dmgField.innerHTML;
            if (formerText.indexOf("=") >= 0) {
                dmgField.innerHTML = formerText.substring(0, formerText.lastIndexOf("=")).trim();
            }
            var entry = LogEntryType.Good;
            if (rand == 20) {
                buttons[i].classList.remove("die_d20_normal");
                buttons[i].classList.remove("die_d20_hit");
                buttons[i].classList.add("die_d20_crit");
                var dmg = diceRoller.rollCritFromString(dmgField.innerHTML);
                result = " = " + dmg;
                logStr += " and critically hit for " + dmg + " damage";
            } else if (rand + mod >= ac) {
                buttons[i].classList.remove("die_d20_normal");
                buttons[i].classList.remove("die_d20_crit");
                buttons[i].classList.add("die_d20_hit");
                var dmg = diceRoller.rollFromString(dmgField.innerHTML);
                result = " = " + dmg;
                logStr += " and hit for " + dmg + " damage";
            } else {
                result = "";
                buttons[i].classList.add("die_d20_normal");
                buttons[i].classList.remove("die_d20_crit");
                buttons[i].classList.remove("die_d20_hit");
                logStr += " and missed;";
                entry = LogEntryType.Bad;
            }
            addToCombatLog(row, logStr, entry);
            dmgField.innerHTML = dmgField.innerHTML + result;
            buttons[i].firstChild.data = rand;
        }

        return false;
    }
    function rollForDamageSelectedRow() {
        var dmgField = selectedRow.closest(".combatRow").getElementsByClassName("damage_field")[0];
        var formerText = dmgField.innerHTML;

        if (formerText.indexOf("=") >= 0) {
            dmgField.innerHTML = formerText.substring(0, formerText.indexOf("=")).trim();
        }

        dmgField.innerHTML = dmgField.innerHTML + " = " + diceRoller.rollFromString(dmgField.innerHTML);
    }

    function applyDamgage() {
        var allRows = document.querySelectorAll("#combatMain .combatRow");
        var hp, dmg, hpField, dmgField, name;

        for (var i = 0; i < allRows.length; i++) {
            var row = allRows[i];
            hpField = row.getElementsByClassName("hp_field")[0];
            dmgField = row.getElementsByClassName("dmg_field")[0];
            creatureDamage = row.getElementsByClassName("damage_field")[0];
            name = row.getElementsByClassName("name_field")[0].value;
            dmg = dmgField.value;

            if (dmg == "") continue;

            hp = parseInt(hpField.value);
            dmg = parseInt(dmg);
            hp -= dmg;
            hpField.value = hp;

            if (dmg != 0) {
                var round = document.getElementById("round_counter_container").classList.contains("hidden") ? null : document.getElementsByClassName("roundcounter__value")[0].innerHTML;
                var logText = "";
                if (round != null) logText = "Round " + round + ": ";

                logText += (dmg > 0 ? "Damaged for " : "Healed for ") + Math.abs(dmg);
                addToCombatLog(allRows[i], logText, dmg > 0 ? LogEntryType.Bad : LogEntryType.Good);
            }
            healthChanged(allRows[i].querySelector(".combat_row_monster_id").innerHTML);
            dmgField.value = "";
        }
    }

    function revive(arr) {
        var allRows = document.querySelectorAll("#combatMain .combatRow");
        for (var i = 0; i < allRows.length; i++) {
            if (allRows[i].querySelector(".combat_row_monster_id").innerHTML != arr.index) continue;
            var row = allRows[i];
            if (!row.classList.contains("dead_row")) return;
            row.classList.remove("dead_row");
            var id = row.getAttribute("data-dnd_monster_id");
            return dataAccess.getHomebrewAndMonsters((data) => {
                var currHp = parseInt(row.getElementsByClassName("hp_field")[0].value);
                row.getElementsByClassName("hp_field")[0].value = isNaN(currHp) || currHp <= 0 ? 1 : currHp;
                frameHistoryButtons.createButtonIfNotExists(data.find((x) => x.id == id));
                row.classList.remove("hidden");
                addToCombatLog(row, "Revived", LogEntryType.Goo);
            });
        }
    }
    function kill(monsterIndexInRow) {
        var allRows = document.querySelectorAll("#combatMain .combatRow");
        for (var i = 0; i < allRows.length; i++) {
            var row = allRows[i];
            var monsterIndex = parseInt(row.querySelector(".combat_row_monster_id").innerHTML);
            if (monsterIndex != parseInt(monsterIndexInRow)) continue;

            if (!deadRowsVisible) {
                hideRow(row);
            }
            row.classList.add("dead_row");
            row.setAttribute("data-dnd_conditions", "[]");

            rowCountChanged();
            frameHistoryButtons.deleteButtonIfExists(row.getAttribute("data-dnd_monster_name"));
            if (loadedMonsterQueue.find((x) => x.index == monsterIndex)) {
                var temp = loadedMonsterQueue.filter((x) => x.index != monsterIndex);
                loadedMonsterQueue.length = 0;
                temp.forEach((dd) => loadedMonsterQueue.push(dd));
                loadedMonsterQueue.propertyChanged();
            }
            return;
        }
    }

    function healthChanged(monsterIndexInRow) {
        var allRows = document.querySelectorAll("#combatMain .combatRow");
        for (var i = 0; i < allRows.length; i++) {
            var row = allRows[i];
            var monsterIndex = parseInt(row.querySelector(".combat_row_monster_id").innerHTML);
            if (monsterIndex != monsterIndexInRow) continue;

            var originalHp = parseInt(row.getAttribute("data-dnd_original_hp"));
            var hpField = row.querySelector(".hp_field");
            var currentHp = parseInt(hpField.value);
            if (currentHp < 0) {
                currentHp = 0;
                hpField.value = currentHp;
            }
            var hpPercentage = parseInt(currentHp) / parseInt(originalHp);

            var isDead = currentHp <= 0;
            var hasTempHp = currentHp > originalHp;

            var ratio = currentHp / originalHp;
            var healthBar = row.querySelector(".health_bar");

            if (ratio > 1) {
                healthBar.style.backgroundColor = "#ca9e00";
                ratio = 1;
            } else {
                healthBar.style.backgroundColor = `rgb(${(1 - ratio) * 255} ${ratio * 255} 0)`;
            }
            healthBar.style.transform = `scaleX(${ratio})`;
            if (hasTempHp) hpField.classList.add("hp_over_max");
            else hpField.classList.remove("hp_over_max");

            if (isDead) kill(monsterIndexInRow, false);
            else revive({ index: monsterIndexInRow });
            window.api.messageWindow("maptoolWindow", "monster-health-changed", { index: monsterIndex, healthPercentage: hpPercentage, dead: isDead });

            sort();
            return;
        }
    }
    function loadDamageFieldHandlers() {
        var allFields = document.getElementsByClassName("damage_field");
        for (var i = 0; i < allFields.length; i++) {
            allFields[i].onclick = setDamageFieldNextAction;
        }
    }
    function setDamageFieldNextAction(e) {
        var row = e.target.parentNode;
        var actions = JSON.parse(row.getAttribute("data-dnd_actions"));
        if (actions == null || actions.length == 0) return;
        var index = parseInt(row.getAttribute("data-dnd_current_action"));
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
            Util.showBubblyText("Switched to " + nextAction.name, { x: e.clientX, y: e.clientY }, true);
            row.getElementsByClassName("text_upper_damage_label")[0].innerHTML = nextAction.name;
        }
        var actionCompare = createActionString(nextAction);

        while (tooltipLines[tooltipIndex] != actionCompare) {
            tooltipIndex++;
            if (tooltipIndex == tooltipLines.length) break;
        }
        if (tooltipIndex < tooltipLines.length) {
            tooltipLines[tooltipIndex] = ">" + tooltipLines[tooltipIndex];
            row.getElementsByClassName("attack_field")[0].value = nextAction.attack_bonus;
            row.getElementsByClassName("damage_field")[0].innerHTML = nextAction.damage_string;
            row.setAttribute("data-dnd_current_action", index);

            e.target.setAttribute("data-tooltip", tooltipLines.join("\n"));
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
        var fields = [...document.querySelectorAll(".code_ac")];
        fields.forEach((field) => {
            field.removeEventListener("keyup", attackOnEnter);
            field.addEventListener("keyup", attackOnEnter);
        });
        function attackOnEnter(event) {
            if (event.keyCode == 13) event.target.parentNode.getElementsByClassName("die_combatRoller ")[0].onclick();
        }
    }
    function addApplyDamageOnEnterHandlers() {
        var damageFields = [...document.querySelectorAll(".dmg_field")];
        damageFields.forEach((field) => {
            field.removeEventListener("keyup", applyDamageOnEnter);
            field.addEventListener("keyup", applyDamageOnEnter);
        });
        function applyDamageOnEnter(event) {
            if (event.keyCode == 13) event.target.parentNode.getElementsByClassName("dmg_button")[0].onclick();
        }
    }
    var selectedMultiselectFields = [];
    function loadACFieldHandlers() {
        var fields = [...document.querySelectorAll(".code_ac")];
        fields.forEach((field) => {
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
        multiSelectableFields.forEach((field) => {
            field.onkeyup = function (event) {
                if (isNaN(parseInt(event.key))) return;
                var val = event.target.value;
                if (selectedMultiselectFields.length > 1)
                    selectedMultiselectFields.forEach((field) => {
                        if (field != event.target) field.value = val;
                    });
            };

            field.onmousedown = function (event) {
                var alreadySelected;
                selectedMultiselectFields.forEach((field) => {
                    if (field == event.target) alreadySelected = true;
                });
                if (alreadySelected && event.ctrlKey) {
                    selectedMultiselectFields = selectedMultiselectFields.filter((ele) => ele != event.target);
                    event.target.classList.remove("selected_field");
                } else {
                    if (event.ctrlKey) {
                        selectedMultiselectFields.push(event.target);
                        event.target.classList.add("selected_field");
                    } else {
                        clearSelection();
                        selectedMultiselectFields.push(event.target);
                        event.target.classList.add("selected_field");
                    }
                }
            };
        });
    }

    function addRow() {
        lastIndex++;
        var newRow = $("#combat_loader_template").clone();
        newRow.attr("data-dnd_conditions", "[]");

        newRow[0].querySelector(".combat_row_monster_id").innerHTML = lastIndex;
        addLogPopupHandler(newRow[0]);
        newRow.appendTo("#combatMain");
        newRow.removeClass("hidden");
        loadFieldHandlers();
        [...document.querySelectorAll(".selected_row_checkbox")].forEach((x) => (x.onchange = selectedRowsChanged));
        [...document.querySelectorAll("#combatMain .round_checkbox_container")].forEach((x) => (x.onmouseenter = selectedCheckboxMouseOver));
        rowCountChanged();
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
        row.classList.remove("dead_row");
        nameField.setAttribute("data-combat_log", JSON.stringify([{ date: "", text: `Starting hit points are ${monster.hit_points}`, entryType: LogEntryType.Good }]));

        row.setAttribute("monster_original_name", monster.original_name || "");
        damageLabel = row.getElementsByClassName("text_upper_damage_label")[0];

        //Validate
        if (!monster.size) monster.size = "medium";

        if (settings.enable.mapTool) {
            nameField.value = monster.name;
            row.querySelector(".combat_row_monster_id").innerHTML = lastIndex;
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
                return (
                    getNumValueForDiceString(b.damage_dice + (b.damage_bonus == null ? "" : "+ " + b.damage_bonus)) -
                    getNumValueForDiceString(a.damage_dice + (a.damage_bonus == null ? "" : "+ " + a.damage_bonus))
                );
            });
            var attackActions = [];
            var actionPicked = false;
            for (var i = 0; i < monster.actions.length; i++) {
                if (i > 0) actionsString += "\n";
                var action = createActionString(monster.actions[i]);

                var ele = JSON.parse(JSON.stringify(monster.actions[i]));
                if ((ele.damage_dice != null || ele.damage_bonus != null) && ele.attack_bonus != null) {
                    ele.damage_string =
                        ele.damage_dice == null
                            ? ele.damage_bonus == null
                                ? ""
                                : ele.damage_bonus
                            : monster.actions[i].damage_dice + (monster.actions[i].damage_bonus == null ? "" : (monster.actions[i].damage_dice != null ? "+" : "") + monster.actions[i].damage_bonus);
                    attackActions.push(ele);
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
                    damageField.classList.add("tooltipped");
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

            damageField.classList.remove("label_inactive");
        }

        row.setAttribute("data-challenge_rating", monster.challenge_rating);

        if (monster.name) {
            loadedMonsterQueue.push({ monsterId: monster.id, name: monster.name, hit_points: monster.hit_points, size: monster.size.toLowerCase(), index: lastIndex });
            frameHistoryButtons.createButtonIfNotExists(monster);
        }
        rowCountChanged();
    }
    function createActionString(action) {
        return (
            action.name +
            (action.attack_bonus == null ? " " : ": +" + action.attack_bonus + ", ") +
            (action.damage_dice == null ? "" : action.damage_dice) +
            (action.damage_bonus == null ? "" : (action.damage_dice != null ? "+" : "") + action.damage_bonus)
        );
    }
    function clear() {
        $("#combatMain .combatRow").remove();
        closeLog();
        lastIndex = 0;
        frameHistoryButtons.clearAll();
        loadedMonsterQueue.length = 0;
        loadedMonsterQueue.update();
        window.api.messageWindow("maptoolWindow", "monster-list-cleared");
        rowCountChanged();
    }

    function initSaveOrDamage() {
        var menu = document.getElementById("popup_menu_saveordamage");
        elementCreator.makeDraggable(menu, menu.querySelector("label:first-of-type"));
        var select = menu.querySelector("#save_or_damage_save_select");
        var i = 0;
        constants.ability_scores.forEach((ability) => {
            i++;
            var opt = document.createElement("option");
            opt.value = ability.toLowerCase();
            opt.innerHTML = ability.toProperCase();
            opt.selected = i == 2;
            select.appendChild(opt);
        });
    }

    function initSaveVsSpell() {
        var menu = document.getElementById("popup_menu_saveorspell");
        elementCreator.makeDraggable(menu, menu.querySelector("label:first-of-type"));
        dataAccess.getSpells((spells) => {
            var list = [];

            spells.forEach((spell) => {
                if (!spell.metadata?.savingThrow) return;

                list.push([spell.name, spell.id]);
            });

            if (list.length == 0) return;
            new Awesomplete(document.getElementById("save_vs_spell_input"), { list: list, minChars: 0, autoFirst: true });
            document.getElementById("save_vs_spell_input").addEventListener("awesomplete-selectcomplete", function (evt) {
                saveVsSpellSpellSelected(evt);
                document.getElementById("save_vs_spell_dc_input").select();
            });
        });
    }

    var selectedRow;
    function initialize() {
        initSaveVsSpell();
        initSaveOrDamage();
        loadedMonsterQueue.update = function () {
            var button = document.getElementById("maptool_notify_button");
            button.title = "Opens the map tool with loaded creatures.";
            if (loadedMonsterQueue.length == 0) {
                button.disabled = true;
                return;
            }
            button.disabled = false;
            var str = button.title;
            loadedMonsterQueue.forEach((x) => (str += `\n ${x.name} (${x.index})`));
            button.title = str;
        };
        addLogPopupHandler(document.querySelector(".combatRow"));
        dataAccess.getConditions(function (data) {
            var selectEle = document.getElementById("condition_list_dd");
            data.forEach((d) => {
                var option = document.createElement("option");
                option.innerHTML = d.name;
                option.setAttribute("value", d.name.toLowerCase());
                selectEle.appendChild(option);
            });
            $("#condition_list_dd").chosen({
                width: "100%",
                placeholder_text_multiple: "Active conditions",
            });
        });
        $("#condition_list_dd").on("input", function (e) {
            if (selectedRow) {
                var conditionList = $("#condition_list_dd")
                    .val()
                    .map((x) => {
                        return { condition: x };
                    });

                setConditionList(selectedRow.closest(".combatRow"), conditionList);
            }
        });
        var order = localStorage.getItem("combatpanel-sort-order") ?? "id";
        orderBy(order);
    }
    var hpFieldDelay;
    function addLogPopupHandler(row) {
        document.querySelector("#combat_log_notes").addEventListener("keyup", function (e) {
            selectedRow.setAttribute("data-combat_log_notes", e.target.value);
        });
        row.querySelector(".name_field").onmousedown = function (e) {
            if (e.button != 0) return;

            if (selectedRow != e.target || document.querySelector("#combat_log_popup").classList.contains("hidden")) {
                selectedRow = e.target;
                showLog();
            } else {
                closeLog();
            }

            if (e.target.value == "") return;
        };

        row.querySelector(".hp_field").onfocus = function (e) {
            if (e.target.value == "") return;
            e.target.setAttribute("data-old_value", e.target.value);
        };
        row.querySelector(".hp_field").oninput = function (e) {
            window.clearTimeout(hpFieldDelay);

            var oldValue = e.target.getAttribute("data-old_value");
            if (oldValue == "") oldValue = 0;
            e.target.setAttribute("data-old_value", e.target.value);
            var newValue = parseInt(e.target.value);
            var diff = newValue - oldValue;

            if (diff == 0) return;

            var row = e.target.parentNode;

            var round = document.getElementById("round_counter_container").classList.contains("hidden") ? null : document.getElementsByClassName("roundcounter__value")[0].innerHTML;
            var logText = "";
            if (round != null) logText = "Round " + round + ": ";
            logText += (diff < 0 ? "Damaged for " : "Healed for ") + Math.abs(diff);

            healthChanged(getRowIndex(row));
            hpFieldDelay = window.setTimeout(() => {
                addToCombatLog(row, logText, diff < 0 ? LogEntryType.Bad : LogEntryType.Good);
            }, 1000);
        };
    }

    function getRowIndex(row) {
        return row.querySelector(".combat_row_monster_id").innerHTML;
    }
    function showLog() {
        if (!selectedRow || selectedRow.value == "") return;
        var conditions = JSON.parse(selectedRow.parentNode.getAttribute("data-dnd_conditions") || "[]");

        $("#condition_list_dd").val(conditions ? conditions.map((x) => x.condition) : "");
        var combatLog = selectedRow.getAttribute("data-combat_log");
        var notes = selectedRow.getAttribute("data-combat_log_notes") || "";
        document.querySelector("#combat_log_notes").value = notes;

        combatLog = combatLog == null ? [] : JSON.parse(combatLog);
        populateLogPopup(combatLog);

        $("#condition_list_dd").trigger("chosen:updated");
        var closest = selectedRow.closest(".combatRow");
        closest.parentNode.insertBefore(document.querySelector("#combat_log_popup"), closest.nextSibling);
        document.querySelector("#combat_log_popup").classList.remove("hidden");
    }
    const LogEntryType = {
        Good: 0,
        Bad: 1,
    };

    function addToCombatLog(row, thingyToAdd, entryType = LogEntryType.Bad) {
        if (thingyToAdd == null) return;
        row = row.getElementsByClassName("name_field")[0];
        var log = row.getAttribute("data-combat_log");
        log = log == null || log == "" ? [] : JSON.parse(log);

        log.push({ date: Util.currentTimeStamp(), text: thingyToAdd, entryType: entryType });
        row.setAttribute("data-combat_log", JSON.stringify(log));

        if (row == selectedRow) {
            populateLogPopup(log);
        }
    }
    function populateLogPopup(logArray) {
        var content = document.querySelector(".combat_log_content");
        while (content.firstChild) {
            content.removeChild(content.firstChild);
        }
        var paragraphArray = [];
        while (logArray.length > 0) {
            var entry = logArray.pop();
            var newP = document.createElement("p");
            if (entry.entryType == LogEntryType.Good) {
                newP.classList.add("beneficial_log_item");
            } else {
                newP.classList.add("harmful_log_item");
            }
            newP.innerText = `${entry.date} ${entry.text}`;
            content.appendChild(newP);
            paragraphArray.push(newP);
        }
    }
    var deadRowsVisible = false;
    function toggleShowDead() {
        deadRowsVisible = !deadRowsVisible;
        var allRows = [...document.querySelectorAll("#combatMain .dead_row")];
        if (!deadRowsVisible) allRows.forEach((x) => hideRow(x));
        else allRows.forEach((x) => x.classList.remove("hidden"));
        rowCountChanged();
    }

    function updateCurrentLoadedDifficulty() {
        var crList = [];
        var xpEle = document.getElementById("combat_loader_current_xp");
        var allRows = [...document.querySelectorAll("#combatMain .combatRow")].filter((x) => !x.classList.contains("hidden"));
        if (allRows.length == 0) {
            xpEle.innerHTML = "";
            xpEle.setAttribute("data-tooltip", "");
            return;
        }

        allRows.forEach((row) => {
            var cr = row.getAttribute("data-challenge_rating");
            crList.push(cr);
        });

        var totalCr = encounterModule.getXpSumForEncounter(crList, partyArray.length);
        console.log(crList);
        var difficulty = encounterModule.getEncounterDifficultyString(
            totalCr.adjusted,
            partyArray.map((x) => x.level)
        );

        xpEle.innerHTML = difficulty;
        xpEle.setAttribute("data-tooltip", `Total XP: ${totalCr.unadjusted}${totalCr.unadjusted != totalCr.adjusted ? `, adjusted XP: ${totalCr.adjusted}` : ""}`);
    }

    function hideRow(row) {
        row.classList.add("hidden");
        var nameField = row.querySelector(".name_field");
        if (nameField == selectedRow) closeLog();
    }

    function closeLog() {
        document.querySelector("#combat_log_popup").classList.add("hidden");
    }

    function createAttackPcButtons() {
        var cont = document.getElementById("attack_player_button_container");
        while (cont.firstChild) cont.removeChild(cont.firstChild);

        for (var i = 0; i < partyArray.length; i++) {
            if (!partyArray[i].active) continue;
            var button = document.createElement("button");
            button.setAttribute("data-party_index", i);
            button.classList.add("button_style");
            button.innerHTML = "Attack " + partyArray[i].character_name;

            button.onclick = function (e) {
                var parent = selectedRow.closest(".combatRow");
                var index = parseInt(e.target.getAttribute("data-party_index"));
                var ac = partyAlternativeACArray[index] ? partyArray[index].alternative_ac : partyArray[index].ac;
                parent.getElementsByClassName("code_ac")[0].value = ac;
                if (selectedMultiselectFields.length > 0) {
                    selectedMultiselectFields.forEach((field) => (field.value = ac));
                }
                parent.getElementsByClassName("die_d20")[0].click();
            };
            cont.appendChild(button);
        }
    }

    function setConditionList(row, conditionList) {
        conditionList = [...new Set(conditionList)];
        var conditionContainer = row.querySelector(".condition_container");
        var monsterIndex = parseInt(row.querySelector(".combat_row_monster_id").innerHTML);
        while (conditionContainer.firstChild) conditionContainer.removeChild(conditionContainer.firstChild);

        conditionList.forEach((condition) => {
            var newDiv = createConditionBubble(condition.condition, condition.caused_by);
            conditionContainer.appendChild(newDiv);
            newDiv.onclick = function (e) {
                var conditionList = JSON.parse(row.getAttribute("data-dnd_conditions") || "[]");
                var removed = newDiv.getAttribute("data-condition");
                conditionList = conditionList.filter((x) => x.condition != removed);
                row.setAttribute("data-dnd_conditions", JSON.stringify(conditionList));

                notifyMapToolConditionsChanged(
                    monsterIndex,
                    conditionList.map((x) => x.condition),
                    false
                );
                newDiv.parentNode.removeChild(newDiv);
                if (selectedRow && row == selectedRow.closest(".combatRow")) {
                    $("#condition_list_dd").val(conditionList);
                    $("#condition_list_dd").trigger("chosen:updated");
                }
            };
        });
        notifyMapToolConditionsChanged(
            monsterIndex,
            conditionList.map((x) => x.condition),
            false
        );
        row.setAttribute("data-dnd_conditions", JSON.stringify(conditionList));
        if (selectedRow && row == selectedRow.closest(".combatRow")) {
            $("#condition_list_dd").val(conditionList.map((x) => x.condition));
            $("#condition_list_dd").trigger("chosen:updated");
        }
    }

    function setSelectedRows(rowArr) {
        var allRows = document.querySelectorAll("#combatMain .combatRow");
        allRows.forEach((row) => deSelectRow(row));
        rowArr = rowArr.map((x) => parseInt(x));
        var selected = [...allRows].filter((x) => rowArr.includes(parseInt(x.querySelector(".combat_row_monster_id").innerHTML)));
        selected.forEach((row) => selectRow(row));
    }

    function selectRow(row) {
        selectDeselectRowHelper(row, true);
    }

    function deSelectRow(row) {
        selectDeselectRowHelper(row, false);
    }

    function selectDeselectRowHelper(row, checked) {
        var checkbox = row.querySelector(".selected_row_checkbox");
        var oldValue = checkbox.checked;
        checkbox.checked = checked;
        if (oldValue != checked) selectedRowsChanged();
    }

    function selectedRowsChanged() {
        var allRows = document.querySelectorAll("#combatMain .combatRow");
        var enabled = [...allRows].find((x) => isSelected(x));

        [...document.querySelectorAll(".selected_row_action_button")].forEach((button) => (button.disabled = !enabled));
    }

    var firstRowSelectedWasChecked, FIRST_ROW_CHECKED_TIMEOUT;
    function selectedCheckboxMouseOver(evt) {
        if (GLOBAL_MOUSE_DOWN) {
            var row = evt.target.closest(".combatRow").querySelector(".selected_row_checkbox");
            if (firstRowSelectedWasChecked) {
                row.checked = firstRowSelectedWasChecked;
            } else {
                row.checked = !row.checked;
                firstRowSelectedWasChecked = row.checked;
            }
            window.clearTimeout(FIRST_ROW_CHECKED_TIMEOUT);
            FIRST_ROW_CHECKED_TIMEOUT = window.setTimeout(() => (firstRowSelectedWasChecked = null), 400);
            selectedRowsChanged();
        }
    }

    function getSelectedRows() {
        var allRows = document.querySelectorAll("#combatMain .combatRow");
        return [...allRows].filter((x) => isSelected(x));
    }

    function isSelected(row) {
        return row.querySelector(".selected_row_checkbox").checked;
    }

    function showSaveMenuHelper(evt, menuId) {
        var menu = document.querySelector(`#${menuId}`);
        menu.classList.remove("hidden");
        var scrollDistY = document.querySelector(".main_content_wrapper").scrollTop;
        menu.style.top = evt.clientY + scrollDistY + "px";
        menu.style.left = evt.clientX + "px";
    }

    function saveOrDamage(evt) {
        if (hideAllPopups) hideAllPopups();
        showSaveMenuHelper(evt, "popup_menu_saveordamage");
    }

    function saveOrDamageSubmit() {
        var damage = document.querySelector("#save_or_damage_damage_input").value;
        var saveDc = document.querySelector("#save_or_damage_dc_input").value;
        if (!saveDc || !damage) return;
        var halfOnSuccess = document.querySelector("#save_or_damage_half_on_success").checked;
        var ele = document.getElementById("save_or_damage_save_select");
        var saveAbility = ele.options[ele.selectedIndex].value;
        rollSavesHelper(saveAbility, saveDc, damage, halfOnSuccess, null, null);
    }

    function rollSavesHelper(saveAbility, saveDc, damage, halfOnSuccess, conditionToApply, effectName) {
        console.log(saveAbility, saveDc, damage, halfOnSuccess, conditionToApply, effectName);
        dataAccess.getHomebrewAndMonsters((monsters) => {
            var selectedRows = getSelectedRows();
            selectedRows.forEach((row) => {
                var monsterId = row.getAttribute("data-dnd_monster_id");
                var monster = monsters.find((x) => x.id == monsterId);
                var modifier = parseInt(monster[`${saveAbility}_save`] ?? Util.getAbilityScoreModifier(monster[saveAbility]));
                var roll = d(20);
                var result = roll + modifier;
                saveDc = parseInt(saveDc);
                var rect = row.getBoundingClientRect();
                Util.showBubblyText(result, { x: rect.x, y: rect.y }, false, true);

                //failed
                if ((result < saveDc && roll != 20) || roll == 1) {
                    if (conditionToApply) {
                        var conditions = JSON.parse(row.getAttribute("data-dnd_conditions") || "[]");

                        if (!conditions.find((x) => x.condition == conditionToApply)) {
                            conditions.push({ condition: conditionToApply, caused_by: ` ${effectName ?? "save roll"} (DC ${saveDc})` });
                            setConditionList(row, conditions);
                        }
                    }
                    addToCombatLog(row, `(${roll}) Failed ${saveAbility} save${effectName ? ` against ${effectName}` : ""}  (DC ${saveDc})`, LogEntryType.Bad);
                    row.querySelector(".dmg_field").value = damage;
                } else {
                    if (halfOnSuccess) row.querySelector(".dmg_field").value = Math.floor(parseInt(damage) / 2);
                    addToCombatLog(row, `(${roll}) Succeeded ${saveAbility} save ${effectName ? `against ${effectName}` : ""}  (DC ${saveDc})`, LogEntryType.Good);
                }
            });
        });
    }

    function saveOrCondition() {}

    function saveVsSpell(evt) {
        if (hideAllPopups) hideAllPopups();

        showSaveMenuHelper(evt, "popup_menu_saveorspell");

        var inp = document.querySelector("#save_vs_spell_input");
        inp.setAttribute("data-spell_id", "");
        inp.focus();
        document.getElementById("save_vs_spell_submit_btn").disabled = true;
        document.getElementById("save_vs_spell_damage_input").value = "";
        document.getElementById("save_vs_spell_dc_input").value = "";
        document.getElementById("save_vs_spell_condition_select").parentNode.classList.add("hidden");
        selectedSpell = null;
    }
    var selectedSpell;
    function saveVsSpellSpellSelected(evt) {
        var spellId = evt.text.value;
        evt.target.value = evt.text.label;
        document.getElementById("save_vs_spell_submit_btn").disabled = false;
        dataAccess.getSpells((spells) => {
            selectedSpell = spells.find((x) => x.id == spellId);
            var select = document.getElementById("save_vs_spell_condition_select");
            if (selectedSpell.metadata.conditionInflict?.length > 1) {
                select.parentNode.classList.remove("hidden");
                while (select.firstChild) select.removeChild(select.firstChild);
                selectedSpell.metadata.conditionInflict.forEach((cond) => {
                    var opt = document.createElement("option");
                    opt.label = cond;
                    opt.value = cond;
                    select.appendChild(opt);
                });
            } else {
                select.parentNode.classList.add("hidden");
            }
        });
    }

    function saveVsSpellSubmit() {
        var halfDamageOnSuccess = document.querySelector("#save_vs_spell_half_on_success").checked;
        var dc = document.querySelector("#save_vs_spell_dc_input").value;
        var damage = document.querySelector("#save_vs_spell_damage_input").value;
        if (!dc || !selectedSpell) return;
        var select = document.getElementById("save_vs_spell_condition_select");
        var idx = select.parentNode.classList.contains("hidden") ? 0 : select.selectedIndex;
        var cond = selectedSpell.metadata.conditionInflict?.length > 0 ? selectedSpell.metadata.conditionInflict[idx] : null;
        rollSavesHelper(
            (saveAbility = selectedSpell.metadata.savingThrow),
            (saveDc = dc),
            (damage = damage),
            (halfOnSuccess = halfDamageOnSuccess),
            (conditionToApply = cond),
            (effectName = selectedSpell.name)
        );
    }

    function getRowConditions(row) {
        return JSON.parse(row.getAttribute("data-dnd_conditions") || "[]");
    }
    function sendMapToolUpdates() {
        var allRows = document.querySelectorAll("#combatMain .combatRow");
        [...allRows].forEach((row) => {
            var index = getRowIndex(row);
            var conditions = getRowConditions(row).map((x) => x.condition);
            notifyMapToolConditionsChanged(index, conditions, false);
            healthChanged(index);
        });
    }

    function getLoadedMonsters(callback) {
        var allRows = document.querySelectorAll("#combatMain .combatRow");
        var ids = [];
        console.log(settings); //initiativeNoGroup
        [...allRows].forEach((row) => {
            if (row.classList.contains("dead_row")) return;
            var monsterId = row.getAttribute("data-dnd_monster_id");
            var index = getRowIndex(row);
            if (monsterId) ids.push({ id: monsterId, index: index });
        });
        if (!settings.initiativeNoGroup)
            ids = [...new Set(ids.map((x) => x.id))].map((x) => {
                return { id: x };
            });
        dataAccess.getHomebrewAndMonsters((data) => {
            var returnList = [];
            ids.forEach((id) => {
                var found = data.find((x) => x.id == id.id);
                if (found) {
                    returnList.push({
                        name: id.index ? `${found.name} (${id.index})` : found.name,
                        dexterity: found.dexterity,
                        initiative: found.initiative,
                    });
                }
            });
            callback(returnList);
        });
    }
    var currentSortFunction,
        currentSortMarkFunction = currentSortResetFunction;
    var currentSortResetFunction = () => {
        [...document.querySelectorAll("#combatMain .combatRow")].forEach((x) => x.classList.remove("inactive_row"));
    };
    var currentInitiativeActorName;
    function setCurrentActor(currActor) {
        currentInitiativeActorName = currActor;
        sort();
    }
    function orderBy(order) {
        window.setTimeout(() => {
            var btns = [...document.querySelectorAll("#combat_tracker_sort_buttons .sort_button")];
            btns.forEach((button) => {
                button.setAttribute("toggled", "false");
                if (button.getAttribute("data-sort") == order) button.setAttribute("toggled", "true");
            });
        }, 500);
        currentSortMarkFunction = currentSortResetFunction;
        localStorage.setItem("combatpanel-sort-order", order);
        if (order == "name") {
            currentSortFunction = function (a, b) {
                var nameA = a.getElementsByClassName("name_field")[0].value;
                var nameB = b.getElementsByClassName("name_field")[0].value;

                return nameA.localeCompare(nameB);
            };
        } else if (order == "hp") {
            currentSortFunction = function (a, b) {
                var hpA = a.getElementsByClassName("hp_field")[0].value;
                var hpB = b.getElementsByClassName("hp_field")[0].value;
                return parseInt(hpA) - parseInt(hpB);
            };
        } else if (order == "id") {
            currentSortFunction = function (a, b) {
                var idA = getRowIndex(a);
                var idB = getRowIndex(b);
                return parseInt(idA) - parseInt(idB);
            };
        } else if (order == "init") {
            if (settings.initiativeNoGroup) {
                currentSortFunction = function (a, b) {
                    if (parseInt(getRowIndex(a)) == parseInt(getRowIndex(b))) return 0;
                    var currIndex = parseInt(currentInitiativeActorName.substring(currentInitiativeActorName.lastIndexOf("(") + 1, currentInitiativeActorName.lastIndexOf(")")));
              
                    if (parseInt(getRowIndex(a)) == currIndex) return -1;
                    if (parseInt(getRowIndex(b)) == currIndex) return 1;
                    return 0;
                };
            } else {
                currentSortMarkFunction = function () {
                    var rows = [...document.querySelectorAll("#combatMain .combatRow")];
                    rows.forEach((x) => {
                        var name = x.getAttribute("monster_original_name") || x.getElementsByClassName("name_field")[0].value;
                        if (currentInitiativeActorName != name) {
                            x.classList.add("inactive_row");
                        } else {
                            x.classList.remove("inactive_row");
                        }
                    });
                    if (!rows.find((x) => !x.classList.contains("hidden") && !x.classList.contains("inactive_row"))) {
                        rows.forEach((x) => {
                            x.classList.remove("inactive_row");
                        });
                    }
                };
                currentSortFunction = function (a, b) {
                    var nameA = a.getAttribute("monster_original_name") || a.getElementsByClassName("name_field")[0].value;
                    var nameB = b.getAttribute("monster_original_name") || b.getElementsByClassName("name_field")[0].value;
                    if (nameA == nameB) return 0;
                    if (currentInitiativeActorName == nameA) return -1;

                    if (currentInitiativeActorName == nameB) return 1;
                    return 0;
                };
            }
        }
        sort();
    }

    function rowCountChanged() {
        updateCurrentLoadedDifficulty();

        var visibleRows = [...document.querySelectorAll("#combatMain .combatRow")].filter((x) => !x.classList.contains("hidden"));
        if (visibleRows.length === 0) {
            document.getElementById("combat_tracker_sort_buttons").classList.add("hidden");
        } else {
            document.getElementById("combat_tracker_sort_buttons").classList.remove("hidden");
        }
    }

    function sort() {
        var allRows = [...document.querySelectorAll("#combatMain .combatRow")];
        if (currentSortMarkFunction) currentSortMarkFunction();
        if (allRows.length == 0) return;

        var parent = allRows[0].parentNode;
        allRows.forEach((x) => x.parentNode.removeChild(x));
        allRows.sort(currentSortFunction);
        allRows.forEach((x) => parent.appendChild(x));
        var logOpen = !document.querySelector("#combat_log_popup").classList.contains("hidden");
        if (logOpen) {
            showLog();
        }
    }
    return {
        setCurrentActor: setCurrentActor,
        orderBy: orderBy,
        createAttackPcButtons: createAttackPcButtons,
        setConditionList: setConditionList,
        showLog: showLog,
        closeLog: closeLog,
        roll: roll,
        rollForDamageSelectedRow: rollForDamageSelectedRow,
        countCreatures: countCreatures,
        applyDmg: applyDamgage,
        load: load,
        loadCombat: loadCombat,
        clear: clear,
        addRow: addRow,
        toggleShowDead: toggleShowDead,
        loadFieldHandlers: loadFieldHandlers,
        notifyPartyArrayUpdated: notifyPartyArrayUpdated,
        loadMonsterQueue: loadMonsterQueue,
        revive: revive,
        kill: kill,
        clearSelection: clearSelection,
        setDamageFieldNextAction: setDamageFieldNextAction,
        initialize: initialize,
        setSelectedRows: setSelectedRows,
        getLoadedMonsters: getLoadedMonsters,
        saveOrDamage: saveOrDamage,
        saveOrDamageSubmit: saveOrDamageSubmit,
        saveOrCondition: saveOrCondition,
        saveVsSpell: saveVsSpell,
        saveVsSpellSubmit: saveVsSpellSubmit,
        sendMapToolUpdates: sendMapToolUpdates,
    };
})();
