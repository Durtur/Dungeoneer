
class EncounterModule {

    parseCR(str) {
        if (typeof str != "string") return str;
        str = str.trim();
        if (str.trim() === "1/8") {
            return 0.125
        } else if (str.trim() === "1/4") {
            return 0.25
        } else if (str.trim() === "1/2") {
            return 0.5
        } else {
            return parseFloat(str);
        }
    }
    parseCRIndex(num) {

        if (typeof num == "string")
            num = this.parseCR(num);
        if (isNaN(num)) return 0;

        if (num === 0) {
            return 0;
        } else if (num === 0.125) {
            return 1
        } else if (num === 0.25) {
            return 2
        } else if (num === 0.5) {
            return 3
        } else {
            return parseFloat(num) + 3;
        }

    }
    getPartyAverageLevel() {
        var total = 0;
        if (partyArray == null) return 0;
        partyArray.forEach(function (partymember) {
            total += isNaN(parseInt(partymember.level)) ? 0 : parseInt(partymember.level);
        });
        return Math.ceil(total / partyArray.length)
    }

    getEncounterDifficultyString(xpValue, allLevels) {
        console.log("Getting string for xp ", xpValue)
        var tiers = [0, 0, 0, 0];
        var tableArray;
        allLevels.forEach(level => {
            if (level < 0 || level > encounterCalculatorTable.table.length - 1)
                return;
            tableArray = encounterCalculatorTable.table[level]
            for (var i = 0; i < 4; i++) {
                tiers[i] = tiers[i] + tableArray[i];
            }
        })
        console.log(tiers)
        if (tiers.filter(x => x != 0).length == 0) return "Level outside table"
        var i = 3;
        while (xpValue < tiers[i]) {
            if (i == -1) {
                break;
            }
            i--;
        }

        switch (i) {
            case -1:
                return "Trivial";
            case 0:
                return "Easy";
            case 1:
                return "Medium";
            case 2:
                return "Hard";

            case 3:
                var ratio = xpValue / (tiers[i])
                ratio = Math.round(ratio);

                return ratio == 1 ? "Deadly" : ratio + "x Deadly";

        }
    }

    getXpSumForEncounter(crList, partySize) {
        var xpSum, creatureSum, currentCreatureNum, currentCR;
        xpSum = 0;
        creatureSum = 0;
        crList.forEach(cr => {
            currentCR = this.parseCRIndex(cr);
            xpSum += encounterCalculatorTable.xpByCR[currentCR];
        });
        var total = { unadjusted: xpSum }

        creatureSum = crList.length;
        //Find multiplier value for creature number
        partySize = parseInt(partySize);
        if (isNaN(partySize)) partySize = 1;
        var xpMultiplier = this.getMultiplierForCreatureNumber(creatureSum, partySize)
        total.adjusted = xpSum * xpMultiplier
        total.multiplier = xpMultiplier;
        return total;
    }

    getXpValueForCR(cr){
        var currentCR = this.parseCRIndex(cr);
        return encounterCalculatorTable.xpByCR[currentCR];
    }

    getTextualDescriptionForValue(allLevels, xpSum) {

        return this.getEncounterDifficultyString(xpSum, allLevels)
    }
    getXpCeilingForPlayers(allLevels, difficulty) {
        var difficultyIndex = ["trivial", "easy", "medium", "hard", "deadly"].indexOf(difficulty.toLowerCase().trim());
        if (difficultyIndex < 0) difficultyIndex = 0;
        var sum = 0;
        difficultyIndex++;
        allLevels.forEach(level => {
            level = parseInt(level);
            var table = encounterCalculatorTable.table[level].concat([2 * encounterCalculatorTable.table[level][3] - 1])


            if (level < 0) level = 0;
            if (level >= encounterCalculatorTable.table.length) level = encounterCalculatorTable.table.length - 1;
            sum += table[difficultyIndex];
        })

        return sum;
    }

    getMultiplierForCreatureNumber(creatureNumber, partySize) {
        var multiplierThresholdValues = Object.values(encounterCalculatorTable.multipliers);
        var multiplierThresholds = Object.keys(encounterCalculatorTable.multipliers);
        var foundThreshold = 0;
        while (parseInt(multiplierThresholds[foundThreshold]) < creatureNumber) {
            if (foundThreshold == multiplierThresholds.length - 1) {
                break;
            }
            foundThreshold++;
        }

        if (partySize <= 2) {
            if (foundThreshold != multiplierThresholds.length - 1) foundThreshold++;
        } else if (partySize > 5) {
            if (foundThreshold != 0) foundThreshold--;
        }
        return multiplierThresholdValues[foundThreshold];
    }
    //difficulty : ["easy", "medium", "hard", "deadly", "2x deadly"]
    //encounterType : ["solitary", "squad", "mob"]
    getRandomEncounter(pcLevels, difficulty, encounterType, allowedMonsters, allowedType, callback) {
        var multiplier = 1;
        if (difficulty == "2x deadly") {
            difficulty = "deadly"
            multiplier = 2;
        }
        var XPCeiling = this.getXpCeilingForPlayers(pcLevels, difficulty) * multiplier;
        var encounterSizeMod = (function (encType) {
            switch (encType) {
                case "squad":
                    return 0.6;
                case "mob":
                    return 0.25;
                case "horde":
                    return 0;
                default:
                    return 1;
            }
        })(encounterType);
        var monsterCount = (function (encType) {
            switch (encType) {
                case "squad":
                    return 2 * d(4);
                case "mob":
                    return 4 * d(4);
                case "horde":
                    return 6 * d(4);
                default:
                    return 1;
            }
        })(encounterType);
        dataAccess.getMonsters(monsterArray => {
            dataAccess.getHomebrewMonsters(homebrewMonsters => {
                monsterArray = monsterArray.concat(homebrewMonsters);

                if (allowedMonsters) {
                    allowedMonsters = allowedMonsters.map(x => x.toLowerCase());
                    monsterArray = monsterArray.filter(x => allowedMonsters.indexOf(x.name.toLowerCase()) >= 0);
                }

                if (allowedType)
                    monsterArray = monsterArray.filter(x => x.type.toLowerCase().trim() == allowedType.toLowerCase().trim());


                console.log("Generating encounter for ", XPCeiling, "xp")
                //Filter out monsters that have a cr higher than the threshold and cr 0 monsters
                monsterArray = monsterArray.filter(x => {
                    var monCrIndex = this.parseCRIndex(x.challenge_rating);
                    if (isNaN(monCrIndex) || monCrIndex == 0 || monCrIndex >= encounterCalculatorTable.xpByCR.length)
                        return false;
                    if (encounterCalculatorTable.xpByCR[monCrIndex] > XPCeiling)
                        return false;
                    return true;
                });
                var allAvailableCrs = [];

                if (monsterArray.length == 0)
                    return callback({
                        error: true,
                        name: "Unable to generate",
                        description: "<p>Unable to generate an encounter for this difficulty, as no monsters that fit the criteria are available. This is either because a creature under the specified CR limit does not exist, or that the CR limit is not provided. Make sure that you have some active party members.</p>",
                        creatures: []
                    })
                monsterArray.forEach(b => allAvailableCrs[this.parseCRIndex(b.challenge_rating)] = true)
                monsterArray.sort((a, b) => {
                    return this.parseCRIndex(b.challenge_rating) - this.parseCRIndex(a.challenge_rating)
                });

                var totalXp = 0;
                var averageCr = XPCeiling / monsterCount;
                var lowersAvailableCrIndex = 1;
                while (!allAvailableCrs[lowersAvailableCrIndex] && lowersAvailableCrIndex < encounterCalculatorTable.xpByCR.length)
                    lowersAvailableCrIndex++;
                while (this.roundToNextCR(averageCr) < encounterCalculatorTable.xpByCR[lowersAvailableCrIndex]) {
                    monsterCount--;
                    averageCr = XPCeiling / monsterCount;
                }
                var crRatios = [];
                var sumRatios = 0;
                var maxMonsterTypes = Math.ceil(monsterCount / 5);
                for (var i = 0; i < maxMonsterTypes; i++) {
                    var rand = Math.random();
                    sumRatios += rand;
                    crRatios.push(rand);
                }
                crRatios = crRatios.map(x => x /= sumRatios);
                crRatios.sort();
                var crDispensationArray = [];
                crRatios.forEach(ratio => crDispensationArray.push(ratio * XPCeiling));
                monsterCount = 0;
                var pickedMonsters = [];
                for (var i = 0; i < crDispensationArray.length; i++) {
                    var maxIndex = encounterCalculatorTable.xpByCR.indexOf(this.roundToNextCR(crDispensationArray[i]).xp);
                    maxIndex = Math.min(maxIndex, allAvailableCrs.length)
                    var rand = parseInt(Math.min((Math.random() + encounterSizeMod), 0.99) * maxIndex);
                    var reachedTop;
                    while (!allAvailableCrs[rand] &&
                        rand > -1) {
                        if (!reachedTop) {
                            rand++;
                        } else {
                            rand--;
                        }
                        if (rand == maxIndex - 1)
                            reachedTop = true;
                    }

                    //Nothing available, xp goes to next tier. 
                    if (rand <= 0 || crDispensationArray[i] <= 0) {
                        if (i != crDispensationArray.length - 1)
                            crDispensationArray[i + 1] = crDispensationArray[i + 1] + crDispensationArray[i]
                        continue;
                    }
                    var usedXp = 0;
                    var filteredCreatures = monsterArray.filter(x => this.parseCRIndex(x.challenge_rating) == rand);
                    var creature = pickOne(filteredCreatures);

                    var numberOfPickedCreatures = Math.ceil(crDispensationArray[i] / encounterCalculatorTable.xpByCR[rand]);

                    monsterCount += numberOfPickedCreatures;
                    var creatureObj = {};
                    usedXp = numberOfPickedCreatures * encounterCalculatorTable.xpByCR[rand];
                    totalXp += usedXp;
                    creatureObj[creature.name] = "" + isNaN(numberOfPickedCreatures) ? 1 : numberOfPickedCreatures;
                    creatureObj.challenge = rand;
                    creatureObj.name = creature.name;

                    if (i != crDispensationArray.length - 1)
                        crDispensationArray[i + 1] = crDispensationArray[i + 1] - (usedXp - crDispensationArray[i])
                    pickedMonsters.push(creatureObj)

                }

                var filteredMonsters = [];
                //Combine 
                pickedMonsters.map(monster => {
                    var alreadyInFiltered = filteredMonsters.filter(x => x.name == monster.name).length > 0;
                    console.log(monster, alreadyInFiltered)
                    if (!alreadyInFiltered) {
                        var filtered = pickedMonsters.filter(x => x.name == monster.name);
                        if (filtered.length > 1) {
                            var sum = 0;

                            filtered.forEach(filteredM => {
                                sum += parseInt(filteredM[filteredM.name])
                            })
                            monster[monster.name] = (isNaN(sum) ? 1 : sum);
                        }
                        filteredMonsters.push(monster)
                    }
                    console.log("filtered ", filteredMonsters)
                });

                pickedMonsters = filteredMonsters;
                pickedMonsters.sort((a, b) => {
                    return a.challenge - b.challenge;
                })

                var multiplier = this.getMultiplierForCreatureNumber(monsterCount, pcLevels.length);
                totalXp *= multiplier;

                if (monsterCount > 1) {
                    while (totalXp > (XPCeiling) * 1.75 && monsterCount > 1) {
                        if (parseInt(pickedMonsters[0][pickedMonsters[0].name]) == 1 && pickedMonsters.length == 1)
                            break;
                        pickedMonsters[0][pickedMonsters[0].name] = parseInt(pickedMonsters[0][pickedMonsters[0].name]) - 1;
                        console.log(pickedMonsters[0][pickedMonsters[0].name], " -- the count")
                        if (pickedMonsters[0][pickedMonsters[0].name] == 0)
                            pickedMonsters.splice(0, 1);

                        totalXp = 0;
                        pickedMonsters.forEach(monster => {
                            totalXp += parseInt(monster[monster.name]) * encounterCalculatorTable.xpByCR[monster.challenge];
                        })
                        monsterCount--;
                        multiplier = this.getMultiplierForCreatureNumber(monsterCount, pcLevels.length);
                        totalXp *= multiplier;

                    }

                }

                pickedMonsters.forEach(monster => {
                    delete monster.challenge;
                    delete monster.name;
                })

                return callback({
                    name: "Generated encounter",
                    description: "A generated encounter",
                    creatures: pickedMonsters,
                    encounter_xp_value: totalXp
                })

            });
        })
    }


    roundToNextCR(xp) {
        var iterator = 0;
        while (encounterCalculatorTable.xpByCR[iterator] < xp && iterator < encounterCalculatorTable.xpByCR.length)
            iterator++
        return { xp: encounterCalculatorTable.xpByCR[iterator], cr: iterator };
    }

    getEncounterTableForPlayers(allLevels) {
        var difficulties = [0, 0, 0, 0];
        allLevels.forEach(level => {
            level = parseInt(level);
            if (isNaN(level)) return;

            for (var i = 0; i < encounterCalculatorTable.table[level].length; i++) {
                difficulties[i] += encounterCalculatorTable.table[level][i];
            }

        });
        return difficulties;
    }


}


const encounterCalculatorTable = {

    "multipliers": {
        "1": 1,
        "2": 1.5,
        "6": 2,
        "10": 2.5,
        "14": 3,
        "15": 4
    }

    ,
    "xpByCR": [
        10,
        25,
        50,
        100,
        200,
        450,
        700,
        1100,
        1800,
        2300,
        2900,
        3900,
        5000,
        5900,
        7200,
        8400,
        10000,
        11500,
        13000,
        15000,
        18000,
        20000,
        22000,
        25000,
        33000,
        41000,
        50000,
        62000,
        75000,
        90000,
        105000,
        120000,
        135000,
        155000,
    ],

    "table": [
        [25, 50, 75, 100],
        [50, 100, 150, 200],
        [75, 150, 225, 400],
        [125, 250, 375, 500],
        [250, 500, 750, 1100],
        [300, 600, 900, 1400],
        [350, 750, 1100, 1700],
        [450, 900, 1400, 2100],
        [550, 1100, 1600, 2400],
        [600, 1200, 1900, 2800],
        [800, 1600, 2400, 3600],
        [1000, 2000, 3000, 4500],
        [1100, 2200, 3400, 5100],
        [1250, 2500, 3800, 5700],
        [1400, 2800, 4300, 6400],
        [1600, 3200, 4800, 7200],
        [2000, 3900, 5900, 8800],
        [2100, 4200, 6300, 9500],
        [2400, 4900, 7300, 10900],
        [2800, 5700, 8500, 12700]
    ]
}