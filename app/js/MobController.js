class MobController {

    constructor(containerElement, diceRoller) {
        this.parentElement = containerElement;
        this.diceRoller = diceRoller;
        this.notifyTimerMobChanged = null;
        this.notifyMobBuffer = [];
        this.loadedMobs = [];
        this.count = 0;
        this.DEFAULT_MOB_SIZE = 10;
        var controller = this;
        this.loadedMobs.push = function () { Array.prototype.push.apply(this, arguments); controller.loadedMobAdded(); }
        this.loadedMobs.pop = function () { var ret = Array.prototype.pop.apply(this, arguments); controller.loadedMobRemoved(); return ret; }
        this.loadedMobs.clear = function () { while (this.length > 0) this.pop() };
        this.notifyMobBuffer.clear = function () { while (this.length > 0) this.pop() };

    }

    insert(monsterData) {
        this.count++;
        var index = this.createRow(monsterData);
        console.log("Inserting", monsterData);
        this.loadedMobs.push({ name: monsterData.name, size: monsterData.size ? monsterData.size.toLowerCase() : "medium", index: index, isMob: true, mobSize: this.DEFAULT_MOB_SIZE, monsterId: monsterData.id })
    }

    createRow(cret) {
        var row = $("#mobcontroller_row_template").clone().appendTo(this.parentElement);
        row = row[0]; //Regular dom
        row.classList.remove("hidden");
      
        row.setAttribute("data-dnd_creature", JSON.stringify(cret));
        row.setAttribute("data-dnd_monster_index", "M" +  this.count);
        row.querySelector(".name_field").value = cret.name;
        row.querySelector(".hp_field").value = parseInt(cret.hit_points) * this.DEFAULT_MOB_SIZE;
        row.querySelector(".ac_field").value = cret.armor_class;

        row.querySelector(".mobcontroller_count").value = this.DEFAULT_MOB_SIZE;
        row.querySelector(".mobcontroller_creatures_remaining").value = this.DEFAULT_MOB_SIZE;
        row.querySelector(".mobcontroller_creatures_dead").value = 0;
        row.querySelector(".mobcontroller_percentage_attacking").value = 75;
        this.addActionsData(JSON.parse(JSON.stringify(cret)), row);
        var controller = this;
        row.querySelector(".dmg_field").onkeydown = function (e) {
            if (e.key == "Enter")
                controller.applyDamage();
        }
        return "M" + this.count;
    }

    addActionsData(monster, row) {
        if (monster.actions == null) return;
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
        var actionsString = "";
        for (var i = 0; i < monster.actions.length; i++) {
            if (i > 0) actionsString += "\n";
            var action = this.createActionString(monster.actions[i])

            var ele = monster.actions[i];
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

        var attackField = row.querySelector(".attack_field");
        var damageField = row.querySelector(".damage_field");
        var damageLabel = row.querySelector(".text_upper_damage_label");
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


    }
    createActionString(action) {
        return action.name + (action.attack_bonus == null ? " " : ": +" + action.attack_bonus + ", ")
            + (action.damage_dice == null ? "" : action.damage_dice) +
            (action.damage_bonus == null ? "" : (action.damage_dice != null ? "+" : "") + action.damage_bonus)
    }
    setDamageFieldNextAction(e) {

        var row = e.target.closest(".mobcontroller_row");
        var actions = JSON.parse(row.getAttribute("data-dnd_actions"));
        console.log("YOOYO", actions)
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
        var actionCompare = this.createActionString(nextAction)

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

    mobSizeChanged(event) {

        var currentCount = parseInt(event.target.value);
        var row = event.target.closest(".mobcontroller_row");
        var remainingCreatures = parseInt(row.querySelector(".mobcontroller_creatures_remaining").value);
        var deadCreatures = parseInt(row.querySelector(".mobcontroller_creatures_dead").value)
        var oldCount = remainingCreatures + deadCreatures;
        if (isNaN(currentCount))
            return event.target.value = oldCount;
  
        var hpField = row.querySelector(".hp_field");
        var creature = JSON.parse(row.getAttribute("data-dnd_creature"));
        var diff = currentCount - oldCount;
        var result = parseInt(hpField.value) + diff * parseInt(creature.hit_points);
        hpField.value = result >= 0 ? result : 0;
        remainingCreatures += diff;
        if (remainingCreatures < 0) remainingCreatures = 0;
        row.querySelector(".mobcontroller_creatures_remaining").value = remainingCreatures;
        var index = row.getAttribute("data-dnd_monster_index");
        var recentlyDead = row.getAttribute("data-dead_buffer");
        console.log("Mob size changed, dead " + recentlyDead  + " current count " + remainingCreatures)
        this.notifyMapToolMobChanged(index, recentlyDead, remainingCreatures);
        row.setAttribute("data-dead_buffer", "0");
        var pushEntry = this.loadedMobs.find(x => x.index == index);
        if (pushEntry) pushEntry.mobSize = remainingCreatures;

    }
    applyDamage() {
        var rows = [... this.parentElement.querySelectorAll(".mobcontroller_row")];
        rows.forEach(row => {
            var damage = row.querySelector(".dmg_field").value;
            if (!damage) return;
            damage = parseInt(damage);
            var hpField = row.querySelector(".hp_field");
            var remaining = parseInt(hpField.value) - damage;
            hpField.value = remaining;
            var index = row.getAttribute("data-dnd_monster_index");
            if (remaining <= 0)
                this.kill(index);
            this.updateDeadAndRemaing(row);
            row.querySelector(".dmg_field").value = "";

        });
    }

    kill(index) {
        var row = this.parentElement.querySelector(".mobcontroller_row[data-dnd_monster_index=\"" + index + "\"]");
        row.classList.add("hidden");
        var arrIndex = this.loadedMobs.indexOf(this.loadedMobs.find(x => x.index === index));
        if (arrIndex >= 0) {
            this.loadedMobs.splice(arrIndex, 1);
            this.loadedMobRemoved();
        }

    }

    roll() {
        var rows = [... this.parentElement.querySelectorAll(".mobcontroller_row")];
        rows.forEach(row => {
            var mod, advantage, disadvantage;
            mod = parseInt(row.getElementsByClassName("attack_field")[0].value);
            advantage = row.getElementsByClassName("combat_loader_advantage")[0].checked;
            disadvantage = row.getElementsByClassName("combat_loader_disadvantage")[0].checked;

            var aliveCount = parseInt(row.querySelector(".mobcontroller_creatures_remaining").value);
            var attackPercentage = parseInt(row.querySelector(".mobcontroller_percentage_attacking").value) / 100;
            if(attackPercentage > 100)attackPercentage = 100;
            var attackers = Math.floor(aliveCount * attackPercentage);
 
            var dmgString = row.getElementsByClassName("damage_field")[0].innerHTML;
            var ac = parseInt(row.getElementsByClassName("code_ac")[0].value);

            var resultArray = [];

            for (var i = 0; i < attackers; i++) {
                var rand, result;
                if (advantage) {
                    rand = Math.max(d(20), d(20));
                } else if (disadvantage) {
                    rand = Math.min(d(20), d(20));
                } else {
                    rand = d(20);
                }

                if (rand == 20) {
                    result = { damage: this.diceRoller.rollCritFromString(dmgString), hit: "crit" };
                } else if ((rand + mod) >= ac) {
                    result = { damage: this.diceRoller.rollFromString(dmgString), hit: "hit" };
                } else {
                    result = { damage: 0, hit: "miss" };
                }
                if (!isNaN(result.damage))
                    resultArray.push(result);

            }


            var button = row.querySelector(".die_d20");
            button.classList.add("tooltipped");

            var description;
            if (resultArray.length == 0) {
                description = "No creatures remaining or creatures have no attacks";
            } else {
                description = "Attack result: " + resultArray.reduce((a, b) => { return { damage: a.damage + b.damage } }).damage + " damage ("
                    + resultArray.filter(x => x.hit == "crit").length + " crits, "
                    + resultArray.filter(x => x.hit == "hit").length + " hits, "
                    + resultArray.filter(x => x.hit == "miss").length + " misses)"
            }

            button.setAttribute("data-tooltip", description)



        });
    }



    updateDeadAndRemaing(row) {
        var hpPer = JSON.parse(row.getAttribute("data-dnd_creature")).hit_points;
        var count = parseInt(row.querySelector(".mobcontroller_count").value);
        var fullHP = count * parseInt(hpPer);
        var currHP = parseInt(row.querySelector(".hp_field").value);
        var deadCount = Math.floor((fullHP - currHP) / hpPer);
        if (deadCount > count) deadCount = count;
        var remainingCreatures = count - deadCount;
        var oldDeadCount = row.querySelector(".mobcontroller_creatures_dead").value
        row.querySelector(".mobcontroller_creatures_dead").value = deadCount;
        row.querySelector(".mobcontroller_creatures_remaining").value = remainingCreatures;
        row.setAttribute("data-dead_buffer", deadCount - oldDeadCount);
        this.mobSizeChanged({target:row.querySelector(".mobcontroller_count")});
        row.setAttribute("data-dead_buffer", "0");
    }
    loadedMobRemoved() {
        this.updateButton();
    }

    loadedMobAdded() {
        this.updateButton();
    }

    updateButton() {
        var isEmpty = this.loadedMobs.length == 0;
        var button = this.parentElement.parentNode.querySelector("#maptool_mob_add_button");
        button.disabled = isEmpty;
        if (isEmpty) {
            button.setAttribute("title", "Opens the maptool with the loaded mobs\n" + "No mobs are loaded");
        } else {
            button.setAttribute("title", "Opens the maptool with the loaded mobs\n" + this.loadedMobs.map(x => x.name).reduce((a, b) => a + "\n" + b + "\n"));
        }
    }

    notifyMapToolMobChanged(rowIndex, dead, remaining) {
        var existing = this.notifyMobBuffer.find(x => x.rowIndex == rowIndex);
        if (!existing) {
            this.notifyMobBuffer.push({ rowIndex: rowIndex, dead: dead, remaining: remaining });
        } else {
            existing.dead = dead;
            existing.remaining = remaining;
        }
        console.log(this.notifyMobBuffer, existing ? existing : { rowIndex: rowIndex, dead: dead, remaining: remaining });
        clearTimeout(this.notifyTimerMobChanged);
        var controller = this;
        this.notifyTimerMobChanged = window.setTimeout(
            function () {
                let maptoolWindow = remote.getGlobal('maptoolWindow');
      
                if (!maptoolWindow)
                    return;
                    console.log(controller.notifyMobBuffer)
                maptoolWindow.webContents.send("notify-map-tool-mob-changed", JSON.stringify(controller.notifyMobBuffer));
                controller.notifyMobBuffer.clear();
            }, 1000
        );

    }

    notifyMapTool() {

        let window2 = remote.getGlobal('maptoolWindow');

        if (window2) {
            window2.webContents.send("notify-map-tool-monsters-loaded", JSON.stringify(this.loadedMobs));
        } else {
            ipcRenderer.send("open-maptool-window");

            window.setTimeout(function () {
                window2 = remote.getGlobal('maptoolWindow');
                if (window2) window2.webContents.send("notify-map-tool-monsters-loaded", JSON.stringify(this.loadedMobs));
            }, 4000)
        }
        this.loadedMobs.clear();
        this.updateButton();
    }

    mapToolInitialized() {
        var rowsToAdd = [... this.parentElement.querySelectorAll(".mobcontroller_row:not(.hidden)")];

        this.loadedMobs.clear();

        this.loadedMobs.clear();
        rowsToAdd.forEach(row => {
            var monsterData = JSON.parse(row.getAttribute("data-dnd_creature"));
            var deadCount = row.querySelector(".mobcontroller_creatures_dead").value;
            var index = row.getAttribute("data-dnd_monster_index");
            var mobSize = parseInt(row.querySelector(".mobcontroller_creatures_remaining").value);
            console.log(mobSize);
            if (isNaN(mobSize)) mobSize = this.DEFAULT_MOB_SIZE;

            this.loadedMobs.push({ name: monsterData.name, size: monsterData.size ? monsterData.size.toLowerCase() : "medium", index: index, isMob: true, mobSize: mobSize, mobCountDead: deadCount, monsterId: monsterData.id })
        });

    }

    clear(){
        var allRows = [... this.parentElement.getElementsByClassName("mobcontroller_row")];
        while(allRows.length > 0)
        {
            var row = allRows.pop();
            this.notifyMapToolMobChanged(row.getAttribute("data-dnd_monster_index"), 0, 0);
            row.parentNode.removeChild(row);
        }
        this.loadedMobs.clear();

        this.updateButton();
    }





}