
const dataAccess = require("./js/dataaccess");
const StatblockPresenter = require("./js/statblockPresenter");

const { resolve, basename } = require('path');
const EncounterModule = require("./js/encounterModule");
const encounterModule = new EncounterModule();
const marked = require('marked');
const STAGE_TWO_TEXT = "Select the statblock converter that works correctly, and the rest of the data will be generated."
const STAGE_THREE_TEXT = "The following monsters will be added to your homebrew. Make sure to check whether duplicate monsters should be skipped or overwritten.";

var currentJSONData, currentStatblockSchema, convertedData;
function startImporting(e) {
    var path = window.dialog.showOpenDialogSync(
        {
            properties: ['openFile'],
            message: "Choose map",
            filters: [{ name: 'Map', extensions: ["json"] }]
        })[0];
    if (path == null)
        return;
    e.target.classList.add("hidden");
    document.getElementById("expl_text").innerHTML = STAGE_TWO_TEXT;
    var parent = document.getElementById("import_statblocks_container");
    while (parent.firstChild)
        parent.removeChild(parent.firstChild);
    dataAccess.readFile(path, (data) => {
        if (!data || data.length == 0)
            return;
        currentJSONData = data;
        createBlocks(data[0]);
    });

    function createBlocks(dataObj) {
        var cont = Util.ele("div", "row");
        parent.appendChild(cont);
        importer.schemas().forEach(importType => {
            var div = Util.ele("div", "pageframe statblock_container statblock_select");
            try {
                var obj = importType(dataObj);
                new StatblockPresenter(div, obj, "monster", false);
                cont.appendChild(div);
                div.addEventListener("click", () => {
                    useSchema(importType)
                });
            } catch (err) {
                console.error("Unable to map statblock", err);
                console.log(dataObj)
            }

        });

    }


}

function useSchema(statblockImporterSchema) {

    document.getElementById("expl_text").innerHTML = STAGE_THREE_TEXT;
    var parent = document.getElementById("import_statblocks_container");
    while (parent.firstChild)
        parent.removeChild(parent.firstChild);
    convertedData = [];
    currentJSONData.forEach(dataObj => {
        var cont = Util.ele("div", "row");
        parent.appendChild(cont);
        var div = Util.ele("div", "pageframe statblock_container ");
        var obj = statblockImporterSchema(dataObj);
        new StatblockPresenter(div, obj, "monster", false);
        convertedData.push(obj);
        cont.appendChild(div);
    });

    document.getElementById("save_actions_container").classList.remove("hidden");


}

function save() {
    var overwrite = document.getElementById("overWriteConflicts").checked;
    dataAccess.addHomebrew(convertedData, overwrite, () => {
        Util.showSuccessMessage("Save successful");
        window.setTimeout(() => window.close(), 3000);
    });
    console.log(`Saving, overwrite: ${overwrite}`)
}

class Importer {
    schemas() {
        return [this.schemaDefault, this.importSchema1]
    }
    schemaDefault(e) {
        return e;
    }
    importSchema1(e) {

        var sizes = constants.creaturePossibleSizes.sizes;
        var skills = constants.skills;
        var typeAndSubtype = getType(e.type);
        var newObj = {
            name: e.name,
            source: e.source,
            type: typeAndSubtype.type.toProperCase(),
        }

        if (typeAndSubtype.subtype)
            newObj.subtype = typeAndSubtype.subtype;
        if (e.alignment) {
            newObj.alignment = e.alignment.join("");
        }

        newObj.ac_source = e.ac[0]?.from ?? ["Natural armor"];
        newObj.armor_class = e.ac[0].ac || e.ac[0];
        newObj.hit_points = e.hp.average;
        newObj.hit_dice = e.hp.formula;
        newObj.size = sizes.find(x => x.substring(0, 1) == e.size.toLowerCase()).toProperCase();
        newObj.speed = getSpeed(e.speed);
        ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"].forEach(prop => {
            newObj[prop] = e[prop.substring(0, 3)];
        });
        ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"].forEach(prop => {
            if (e.save && e.save[prop.substring(0, 3)])
                newObj[prop + "_save"] = e.save[prop.substring(0, 3)];
        });
        if (e.senses)
            newObj.senses = e.senses.join(", ");

        if (e.languages)
            newObj.languages = e.languages.join(", ");

        newObj.challenge_rating = (e.cr?.cr ? e.cr.cr : e.cr || "0");
        if (e.skill) {
            var arr = [];
            skills.forEach(skill => {
                if (!e.skill[skill.toLowerCase()]) {
                    return;
                }
                arr.push(skill + e.skill[skill.toLowerCase()]);

            });
            newObj.skills = arr.join(", ");
        }
        if (e.resist) {
            var arr = [];
            e.resist.map(res => {
                if (typeof res != "string") {
                    res = (res.special || "") + (res.prenote || "") + (res.resist?.join(", ") || "") + " " + (res.note || "");
                    return arr.push(res);
                }
                return arr.push(res);
            });
            newObj.damage_resistances = arr.join(", ");

        }

        if (e.immune) {
            var arr = [];
            e.immune.map(res => {
                if (typeof res != "string") {
                    res = (res.special || "") + (res.prenote || "") + (res.immune?.join(", ") || "") + " " + (res.note || "");
                    return arr.push(res);
                }
                return arr.push(res);
            });
            newObj.damage_immunities = arr.join(", ");
        }

        if (e.vulnerable) {
            var arr = [];
            e.vulnerable.map(res => {
                if (typeof res != "string") {
                    res = (res.special || "") + (res.prenote || "") + (res.resist?.join(", ") || "") + " " + (res.note || "");
                    return arr.push(res);
                }
                return arr.push(res);
            });
            newObj.damage_vulnerabilities = arr.join(", ");
        }

        if (e.conditionImmune)
            newObj.condition_immunities = e.conditionImmune.join(", ");

        newObj.special_abilities = getSpecialAbilities(e);
        if (e.reaction) {
            newObj.reactions = [];
            e.reaction.forEach(trait => {
                var newReaction = {};
                newReaction[trait.name] = trait.entries.join("\n\n");
                newObj.reactions.push(newReaction);
            });
        }

        newObj.actions = [];
        e.action?.forEach(action => {
            var newAction = {};
            newAction.name = action.name;
            var descriptionString = action.entries.join("\n\n");
            newAction.description = descriptionString;
            var hitDesc = descriptionString.indexOf("{@hit")
            if (hitDesc >= 0) {
                newAction.attack_bonus = parseInt(descriptionString.substring(hitDesc + 5, descriptionString.indexOf("}", hitDesc)));
            }

            var damageDescriptionIdx = descriptionString.indexOf("{@damage");
            var damageDiceString = "";
            var damageBonusTotal = 0;
            while (damageDescriptionIdx >= 0) {

                var damageString = descriptionString.substring(damageDescriptionIdx, descriptionString.indexOf("}", damageDescriptionIdx));
                var cleaned = damageString.replace("{@damage", "").replace("}", "");
                var split = cleaned.split("+");
                split.forEach(spl => {
                    if (spl.indexOf("d") >= 0) {
                        damageDiceString += (damageDiceString.length > 0 ? "+" : "") + spl;
                    } else {
                        damageBonusTotal += parseInt(spl);
                    }
                });
                damageDescriptionIdx = descriptionString.indexOf("{@damage", damageDescriptionIdx + 1);
            }

            newAction.description = newAction.description.replacePlaceHolders();
            if (damageDiceString)
                newAction.damage_dice = damageDiceString.trim();
            if (damageBonusTotal > 0)
                newAction.damage_bonus = damageBonusTotal;

            newObj.actions.push(newAction);
            console.log(newAction);
        });

        if (e.legendary) {
            newObj.legendary_actions = [];
            e.legendary.forEach(action => {
                var newAction = {};
                newAction.name = action.name;
                newAction.description = action.entries.join("\n\n");
                newObj.legendary_actions.push(newAction);
            })
        }
        newObj.id = uniqueID();


        return newObj;

        function getSpecialAbilities(e) {
            var specialAbilities = [];
            if (e.spellcasting) {
                var str = "";
                e.spellcasting.forEach(spellcasting => {
                    if (spellcasting.headerEntries)
                        str += spellcasting.headerEntries.join("\n\n");
                    if (spellcasting.will) {
                        str += "\n\n*At will* " + spellcasting.will.join(", ").replacePlaceHolders();
                    }
                    if (spellcasting.daily) {
                        for (var i = 1; i < 4; i++) {
                            if (spellcasting.daily[i + ""]) {
                                str += "\n\n**" + i + " per day:** " + spellcasting.daily[i + ""].join(", ").replacePlaceHolders();
                            }
                            if (spellcasting.daily[i + "e"]) {
                                str += "\n\n**" + i + " per day each:** " + spellcasting.daily[i + "e"].join(", ").replacePlaceHolders();;
                            }

                        }
                    }
                    for (var i = 0; i < 10; i++) {
                        if (!spellcasting.spells || !spellcasting.spells["" + i]) break;
                        var spellLevel = spellcasting.spells["" + i];
                        var spells = spellLevel.spells;
                        spells.map(x => x.replacePlaceHolders());

                        str += "\n\n" + i + ". " + (spellLevel.slots ? "(" + spellLevel.slots + " slots) " : "") + spells.join(", ").replacePlaceHolders();
                    }
                    var obj = {};
                    obj[spellcasting.name] = str;
                    specialAbilities.push(obj);
                    str = "";
                });


                console.log(specialAbilities)
            }

            if (e.trait) {
                e.trait.forEach(trait => {
                    var newObj = {};
                    newObj[trait.name.replacePlaceHolders()] = trait.entries.join("\n\n").replacePlaceHolders();
                    specialAbilities.push(newObj);
                });
            }
            return specialAbilities;
        }
        function getSpeed(speed) {
            var base = "";
            if (speed.walk)
                base += speed.walk + " ft"
            if (speed.climb) {
                base += base.length == 0 ? "" : ", ";
                base += "climb " + speed.climb + " ft";
            }
            if (speed.fly) {
                base += base.length == 0 ? "" : ", ";
                base += "fly " + (speed.fly.number || speed.fly) + " feet " + (speed.fly.condition ? "(" + speed.fly.condition + ")" : "");
            }
            return base;

        }



        function getType(type) {
            var obj = {};
            if (type.type) {
                if (type.tags)
                    obj.subtype = type.tags[0];
                obj.type = type.type;
                return obj;

            }
            obj.type = type;
            return obj;
        }

    }

}
String.prototype.replacePlaceHolders = function () {
    return this.replaceAll("{@hit", "").replaceAll("{@damage", "").replaceAll("}", "").replaceAll("{@condition ", "").replaceAll("{@atk mw  ", "+")
        .replaceAll("{@dc", "dc").replaceAll("{@dice", "").replaceAll("{@h", "").replaceAll("{@recharge", "Recharge");
}
const importer = new Importer();