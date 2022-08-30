const x = require("uniqid");

class DnDBeyondImporter {

    getCharacter(url, callback) {

        var cls = this;
        try {
            //cut charId off
            url = url.substring(url.lastIndexOf("/"));
            url = "https://character-service.dndbeyond.com/character/v5/character" + url;
    
            var xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function () {
                if (this.status == 404 || this.status == 403) {

                    if (callback) callback(null, this.status);
                    return;
                }

                if (this.readyState != 4 || this.status != 200) {
                    return;
                }

                var response = JSON.parse(this.responseText);
                response = response.data;

                var returnObj = {};
                returnObj.readOnlyUrl = response.readonlyUrl;
                var allModifiers = response.modifiers.race;
                var level = response.classes.map(x => x.level).reduce((a, b) => a + b);
                returnObj.level = level;
                returnObj.character_name = response.name;
                allModifiers = allModifiers.concat(response.modifiers.class)
                    .concat(response.modifiers.feat)
                    .concat(response.modifiers.item)
                    .concat(response.modifiers.background)
                    .concat(response.modifiers.condition);


                var profBonus = constants.prof_bonus.find(x => x.level > level);
                var idx = constants.prof_bonus.indexOf(profBonus);
                profBonus = constants.prof_bonus[idx - 1].bonus;


                returnObj.initiativeAdvantage = allModifiers.filter(x => x.subType == "initiative" && x.type == "advantage").length > 0;
                var hpPerLevel = allModifiers.filter(x => x.subType == "hit-points-per-level").map(x => x.value).reduce((a, b) => a + b, 0);
                var conBonus = allModifiers.filter(x => x.subType == "constitution-score").map(x => x.value).reduce((a, b) => a + b, 0);
                var wisBonus = allModifiers.filter(x => x.subType == "wisdom-score").map(x => x.value).reduce((a, b) => a + b, 0);
                var dexBonus = allModifiers.filter(x => x.subType == "dexterity-score").map(x => x.value).reduce((a, b) => a + b, 0);

                var darkvision = allModifiers.find(x => x.type == "set-base" && x.subType == "darkvision");
                if (darkvision)
                    returnObj.darkvision = darkvision.value;



                var dexterity = response.overrideStats.find(x => x.id == 2 && x.value) || response.stats.find(x => x.id == 2)?.value || 8;
                var con = response.overrideStats.find(x => x.id == 3 && x.value) || response.stats.find(x => x.id == 3)?.value || 8;
                var wisdom = response.overrideStats.find(x => x.id == 5 && x.value) || response.stats.find(x => x.id == 5)?.value || 8;
                con += conBonus;
                dexterity += dexBonus;
                wisdom += wisBonus;
                var conModifer = Util.getAbilityScoreModifier(con);
                var dexModifier = Util.getAbilityScoreModifier(dexterity);
                var wisModifier = Util.getAbilityScoreModifier(wisdom);

                hpPerLevel += conModifer;
                var insightProf = allModifiers.find(x => x.type == "proficiency" && x.subType == "insight");
                var perceptionProf = allModifiers.find(x => x.type == "proficiency" && x.subType == "perception");
                console.log(insightProf, perceptionProf)
                returnObj.perception = perceptionProf ? wisModifier + profBonus : wisModifier;
                returnObj.insight = insightProf ? wisModifier + profBonus : wisModifier;
                var baseHp = response.baseHitPoints;
                var hitPoints = baseHp + level * hpPerLevel;
                returnObj.wisdom = wisModifier;
                returnObj.dexterity = dexModifier;
                returnObj.constitution = conModifer;
                returnObj.maxHp = hitPoints;
                returnObj.currentHp = hitPoints - response.removedHitPoints;
                cls.setArmorClass(response, returnObj,allModifiers);


                if (callback) callback(returnObj);

            }

            xhttp.open("GET", url);
            xhttp.send();
        } catch {
            if (callback) callback(null, -1)
        }

    }

    setArmorClass(response, returnObj, allModifiers) {
        var equippedStuff = response.inventory.filter(x => x.equipped);
        var acMods = equippedStuff.filter(x => x.definition.armorTypeId);
        var armor = acMods.filter(x => x.definition.armorTypeId < 4);

        //Check override ac
        var overrRideAc = response.characterValues.find(x => x.typeId == 1)?.value;
        if (overrRideAc) {
            returnObj.ac = overrRideAc;
            return;
        }

        console.log(response.characterValues)
        var overrideBaseButAddDex = response.characterValues.find(x => x.typeId == 4)?.value;
        console.log(overrideBaseButAddDex)
        if (overrideBaseButAddDex) {
            setAcFromDex(overrideBaseButAddDex);
            return;
        }

        if (armor.length > 0) {
            armor = armor.sort((a, b) => b.definition.armorClass - a.definition.armorClass);
            var eq = armor[0];
            var armorDef = constants.armorTypes.find(x => x.ddb_name == eq.definition.baseArmorName.toLowerCase());

            returnObj.ac = getItemTrueAc(eq) + getDex(armorDef);

            function getDex(ar) {
                var res = parseInt(ar.maxDex);
                if (res == 0) return 0;
                if (!ar.maxDex) return returnObj.dexModifier;

                return Math.min(res, returnObj.dexModifier);
            }
        } else {
            setAcFromDex(10);
        }
        var magicBonus = response.characterValues.filter(x => x.typeId == 2 || x.typeId == 3 && x.value)?.reduce((a, b) => a.value + b.value, 0);

        if (magicBonus) {
            returnObj.ac += magicBonus;
        }


        var shield = acMods.find(x => x.definition.armorTypeId == 4);
        if (shield) {
            returnObj.ac += getItemTrueAc(shield);
        }

        function setAcFromDex(baseAc) {
            baseAc += returnObj.dexterity;
            var unarmoredDef = allModifiers.find(x => x.subType == "unarmored-armor-class");
            if (unarmoredDef) {
                baseAc += Math.max(getRelevantModifer(unarmoredDef), 0);
                function getRelevantModifer(unarmoredDef) {
                    switch (unarmoredDef.statId) {
                        case null: return null;
                        case 3: return returnObj.constitution;
                        case 5: return returnObj.wisdom;

                    }
                }
            }
            returnObj.ac = baseAc;
        }
        function getItemTrueAc(eq) {

            var acBonusFromArmor = eq.definition.grantedModifiers?.find(x => x.type == "bonus" && x.subType == "armor-class");
            if (acBonusFromArmor != null)
                eq.definition.armorClass += acBonusFromArmor.value
            return eq.definition.armorClass;
        }
    }
}


module.exports = DnDBeyondImporter;