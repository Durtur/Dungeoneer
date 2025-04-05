class EncounterModule {
    parseCR(str) {
        if (typeof str != "string") return str;
        str = str.replaceAll(" ", "");
        if (str.trim() === "1/8") {
            return 0.125;
        } else if (str.trim() === "1/4") {
            return 0.25;
        } else if (str.trim() === "1/2") {
            return 0.5;
        } else {
            var res = parseFloat(str);
            return isNaN(res) ? null : res;
        }
    }
    parseCRIndex(num) {
        if (typeof num == "string") num = this.parseCR(num);
        if (isNaN(num)) return 0;

        if (num === 0) {
            return 0;
        } else if (num === 0.125) {
            return 1;
        } else if (num === 0.25) {
            return 2;
        } else if (num === 0.5) {
            return 3;
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
        return Math.ceil(total / partyArray.length);
    }

    getEncounterDifficultyString(xpValue, allLevels) {
        allLevels = allLevels.filter((x) => x > 0 && x < 20);
        if (allLevels.length === 0) return "Unable to calculate encounter challenge (Player level outside of 1-20)";

        var maxLvl = Math.max(...allLevels);
        var count = allLevels.length;

        var tier = encounterCalculatorTable.table[maxLvl - 1];

        var normalized = tier.map((x) => count * x);
        var i = 0;

        if (xpValue > normalized[0]) {
            while (true) {
                if (normalized[i] > xpValue || i >= 4) break;
                i++;
            }
        }

        switch (i) {
            case 0:
                return "Trivial";
            case 1:
                return "Easy";
            case 2:
                return "Medium";
            case 3:
                return "Hard";

            case 4:
                var ratio = xpValue / normalized[i];
                ratio = Math.round(ratio);

                return ratio == 1 ? "Deadly" : ratio + "x Deadly";
        }
    }

    getXpSumForEncounter(crList, partySize) {
        var xpSum, creatureSum, currentCR;
        xpSum = 0;
        creatureSum = 0;
        crList.forEach((cr) => {
            currentCR = this.parseCRIndex(cr);
            xpSum += encounterCalculatorTable.xpByCR[currentCR];
        });
        var total = { unadjusted: xpSum };

        creatureSum = crList.length;
        //Find multiplier value for creature number
        partySize = parseInt(partySize);
        if (isNaN(partySize)) partySize = 1;
        var xpMultiplier = this.getMultiplierForCreatureNumber(creatureSum, partySize);
        total.adjusted = xpSum * xpMultiplier;
        total.multiplier = xpMultiplier;
        return total;
    }

    getXpValueForCR(cr) {
        var currentCR = this.parseCRIndex(cr);
        return encounterCalculatorTable.xpByCR[currentCR];
    }

    getTextualDescriptionForValue(allLevels, xpSum) {
        return this.getEncounterDifficultyString(xpSum, allLevels);
    }
    getXpCeilingForPlayers(allLevels, difficulty) {
        var difficultyIndex = ["trivial", "easy", "medium", "hard", "deadly"].indexOf(difficulty.toLowerCase().trim());
        if (difficultyIndex < 0) difficultyIndex = 0;
        var sum = 0;
        allLevels.forEach((level) => {
            level = parseInt(level) - 1;
            if (level < 0) level = 0;
            var table = encounterCalculatorTable.table[level].concat([2 * encounterCalculatorTable.table[level][3] - 1]);
            console.log(table);
            if (level >= encounterCalculatorTable.table.length) level = encounterCalculatorTable.table.length - 1;
            sum += table[difficultyIndex];
        });
        console.log("Upper limit for " + difficulty + " encounter for " + allLevels + ": " + sum);

        return sum;
    }

    getMultiplierForCreatureNumber(count, partySize) {
        var values = [1, 1.5, 2, 2.5, 3, 4];
        var index = getIndex();

        if (partySize <= 2 && index != values.length - 1) index++;
        if (partySize >= 5 && index != 0) index--;
        return values[index];

        function getIndex() {
            if (count <= 1) return 0;
            if (count <= 2) return 1;
            if (count <= 6) return 2;
            if (count <= 10) return 3;
            if (count <= 14) return 4;
            if (count >= 15) return 4;
        }
    }
    //difficulty : ["easy", "medium", "hard", "deadly", "2x deadly"]
    //encounterType : ["solitary", "squad", "mob"]
    getRandomEncounter(pcLevels, difficulty, encounterType, allowedMonsters, allowedType, monsterTag = null, callback) {
        pcLevels = pcLevels.filter((x) => x > 0);
        if (pcLevels.length == 0) return callback(createEncounterReturnError("<p>Unable to generate an encounter. There are no active party members with a level.</p>"));

        var multiplier = 1;
        if (difficulty == "2x deadly") {
            difficulty = "deadly";
            multiplier = 2;
        }
        var XPCeiling = this.getXpCeilingForPlayers(pcLevels, difficulty) * multiplier;

        var monsterCount = (function (encType) {
            switch (encType) {
                case "squad":
                    return 2 * d(2);
                case "mob":
                    return 4 * d(4);
                case "horde":
                    return 6 * d(4);
                default:
                    return 1;
            }
        })(encounterType);
        dataAccess.getMonsters((monsterArray) => {
            dataAccess.getHomebrewMonsters((homebrewMonsters) => {
                monsterArray = monsterArray.concat(homebrewMonsters).filter((x) => !x.unique);

                if (allowedMonsters) {
                    allowedMonsters = allowedMonsters.map((x) => x.toLowerCase());
                    monsterArray = monsterArray.filter((x) => allowedMonsters.indexOf(x.name.toLowerCase()) >= 0);
                }

                if (allowedType) monsterArray = monsterArray.filter((x) => x.type.toLowerCase().trim() == allowedType.toLowerCase().trim());

                if (monsterTag) monsterArray = monsterArray.filter((x) => x.tags && x.tags.includes(monsterTag));
                console.log("Generating encounter for ", XPCeiling, "xp");
                var remainingXp = XPCeiling / this.getMultiplierForCreatureNumber(monsterCount, pcLevels.length);

                //Filter out monsters that have a cr higher than the threshold and cr 0 monsters
                monsterArray = monsterArray.filter((x) => {
                    var monCrIndex = this.parseCRIndex(x.challenge_rating);
                    if (isNaN(monCrIndex) || monCrIndex == 0 || monCrIndex >= encounterCalculatorTable.xpByCR.length) return false;
                    if (encounterCalculatorTable.xpByCR[monCrIndex] > remainingXp) return false;
                    return true;
                });

                if (monsterArray.length == 0)
                    return callback(
                        createEncounterReturnError(
                            "<p>Unable to generate an encounter for this difficulty, as no monsters that fit the criteria are available. This is either because a creature under the specified CR limit does not exist, or that the CR limit is not provided. Make sure that you have some active party members.</p>"
                        )
                    );

                console.log(monsterArray);

                var allAvailableCrs = [...new Set(monsterArray.map((b) => this.parseCRIndex(b.challenge_rating)))].sort();

                var pickedMonsters = [];
                if (monsterCount === 1) {
                    var pickedCrTier = Math.max(...allAvailableCrs.filter((x) => encounterCalculatorTable.xpByCR[x] <= XPCeiling));
                    console.log(
                        "Compatible xp tiers: ",
                        allAvailableCrs.filter((x) => encounterCalculatorTable.xpByCR[x] <= XPCeiling).map((x) => encounterCalculatorTable.xpByCR[x])
                    );
                    console.log(`Picked xp tier ${encounterCalculatorTable.xpByCR[pickedCrTier]}`);
                    var set = monsterArray.filter((x) => this.parseCRIndex(x.challenge_rating) == pickedCrTier);
                    console.log(
                        pickedCrTier,
                        set,
                        allAvailableCrs.filter((x) => encounterCalculatorTable.xpByCR[x] <= XPCeiling)
                    );
                    pickedMonsters.push(set.pickOne());
                    var totalXp = this.getXpSumForEncounter(
                        pickedMonsters.map((x) => x.challenge_rating),
                        pcLevels.length
                    ).adjusted;
                    return callback({
                        name: `Solitary ${pickedMonsters[0].type}`,
                        description: "A generated encounter",
                        creatures: toEncounter(pickedMonsters),
                        encounter_xp_value: totalXp,
                    });
                }
                //Adjust count if this amount of creatures is not available:
                while (this.getOptimalCrForCreatureNumber(monsterCount, allAvailableCrs, remainingXp) < 0 && monsterCount < 0) {
                    monsterCount--;
                    remainingXp = XPCeiling / this.getMultiplierForCreatureNumber(monsterCount, pcLevels.length);
                }
                if (monsterCount == 0) throw "Encounter generator error, monster count is 0";

                if (monsterCount <= 2) {
                    var iterations = monsterCount;
                    var availablePool = remainingXp / monsterCount;
                    while (iterations > 0) {
                        iterations--;
                        remainingXp -= this.pickCreature(availablePool, monsterArray, pickedMonsters, allAvailableCrs);
                    }

                    var totalXp = this.getXpSumForEncounter(
                        pickedMonsters.map((x) => x.challenge_rating),
                        pcLevels.length
                    ).adjusted;

                    return callback({
                        name: "Generated encounter",
                        description: "A generated encounter",
                        creatures: toEncounter(pickedMonsters),
                        encounter_xp_value: totalXp,
                    });
                }

                var withLieutenant = Math.random() > 0.45 - monsterCount / 10 && monsterCount > 1;

                if (withLieutenant) {
                    var availablePool = remainingXp / 1.5; //2/3 of xp
                    if (this.getOptimalCrForCreatureNumber(monsterCount - 1, allAvailableCrs, remainingXp - availablePool) >= 0)
                        remainingXp -= this.pickCreature(availablePool, monsterArray, pickedMonsters, allAvailableCrs, true);
                }

                var remainingCreaturesToAdd = monsterCount;
                if (withLieutenant) remainingCreaturesToAdd--;
                var availablePool = remainingXp / remainingCreaturesToAdd;

                var costForOne = this.pickCreature(availablePool, monsterArray, pickedMonsters, allAvailableCrs);
                var pickedCreature = pickedMonsters[pickedMonsters.length - 1];
                remainingCreaturesToAdd--;
                var infiniLoopGuard = 2000;
                while (remainingCreaturesToAdd > 0 && infiniLoopGuard > 0) {
                    remainingXp -= costForOne;
                    remainingCreaturesToAdd--;
                    if (pickedCreature) pickedMonsters.push(pickedCreature);
                    infiniLoopGuard--;
                    if (infiniLoopGuard == 0) throw "Infinite loop";
                }

                var totalXp = this.getXpSumForEncounter(
                    pickedMonsters.map((x) => x.challenge_rating),
                    pcLevels.length
                ).adjusted;
                return callback({
                    name: "Generated encounter",
                    description: "A generated encounter",
                    creatures: toEncounter(pickedMonsters),
                    encounter_xp_value: totalXp,
                });

                function toEncounter(monsters) {
                    var creatures = [];
                    var nameList = [];
                    monsters.forEach((x) => {
                        nameList.push(x.name);
                    });
                    var uniqueNames = [...new Set(nameList)];
                    uniqueNames.forEach((name) => {
                        var obj = {};
                        obj[name] = nameList.filter((x) => x == name).length;
                        creatures.push(obj);
                    });
                    return creatures;
                }

                function createEncounterReturnError(msg) {
                    return {
                        error: true,
                        name: "Unable to generate",
                        description: msg,
                        creatures: [],
                    };
                }
            });
        });
    }
    ///Picks the most powerful creature available and places it into the pickedMonsters array.
    pickCreature(availablePool, monsterArray, pickedMonsters, allAvailableCrs, removeFromSet) {
        var highestAvailable = this.getOptimalCrForCreatureNumber(1, allAvailableCrs, availablePool);
        console.log("Highest available CR: ", encounterCalculatorTable.xpByCR[highestAvailable]);
        var lieutenantCreature = monsterArray.filter((x) => this.getXpValueForCR(x.challenge_rating) == encounterCalculatorTable.xpByCR[highestAvailable]).pickOne();
        if (lieutenantCreature) {
            if (removeFromSet) monsterArray = monsterArray.splice(monsterArray.indexOf(lieutenantCreature), 1);
            pickedMonsters.push(lieutenantCreature);
            return this.getXpValueForCR(lieutenantCreature.challenge_rating);
        }
        return 0;
    }

    getOptimalCrForCreatureNumber(creatureCount, allAvailableCrs, availablePool) {
        var optimalCr = Math.max(...allAvailableCrs.filter((x) => creatureCount * encounterCalculatorTable.xpByCR[x] <= availablePool));
        console.log(allAvailableCrs, creatureCount, availablePool);
        return optimalCr ? optimalCr : -1;
    }

    roundToNextCR(xp) {
        var iterator = 0;
        while (encounterCalculatorTable.xpByCR[iterator] < xp && iterator < encounterCalculatorTable.xpByCR.length) iterator++;
        return { xp: encounterCalculatorTable.xpByCR[iterator], cr: iterator };
    }

    getEncounterTableForPlayers(allLevels) {
        var difficulties = [0, 0, 0, 0];
        allLevels.forEach((level) => {
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
    xpByCR: [
        10, 25, 50, 100, 200, 450, 700, 1100, 1800, 2300, 2900, 3900, 5000, 5900, 7200, 8400, 10000, 11500, 13000, 15000, 18000, 20000, 22000, 25000, 33000, 41000, 50000, 62000, 75000, 90000, 105000,
        120000, 135000, 155000,
    ],

    table: [
        [50, 75, 100],
        [100, 150, 200],
        [150, 225, 400],
        [250, 375, 500],
        [500, 750, 1100],
        [600, 1000, 1400],
        [750, 1300, 1700],
        [1000, 1700, 2100],
        [1300, 2000, 2600],
        [1600, 2300, 3100],
        [1900, 2900, 4100],
        [2200, 3700, 4700],
        [2600, 4200, 5400],
        [2900, 4900, 6200],
        [3300, 5400, 7800],
        [3800, 6100, 9800],
        [4500, 7200, 11700],
        [5000, 8700, 14200],
        [5500, 10700, 17000],
        [6400, 13200, 22000]
    ],
};

module.exports = EncounterModule;
