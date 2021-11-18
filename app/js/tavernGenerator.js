
const ElementCreator = require("../js/lib/elementCreator");
class TavernGenerator {
    initialize(generatorData, container, resultContainer) {
        this.generatorData = generatorData;
        this.container = container;
        this.resultContainer = resultContainer;
        this.replacementValues = generatorData.replacement_values;

        var cls = this;
        document.getElementById("reroll_tavern_button").addEventListener("click", function (evnt) {

            cls.generateTavernRumorsAndMenu();

        });
    }

    generateTavern() {
        var data = this.generatorData;
        this.container.querySelector("#reroll_tavern_button").classList.remove("hidden");
        var tavernWealthDropdown = this.container.querySelector("#tavern_wealth");
        var tavernWealth = tavernWealthDropdown.options[tavernWealthDropdown.selectedIndex].value;

        var ownerAndNameobj = this.generateTavernName(data)
        var tavernName = ownerAndNameobj.name;
        var tavernOwner = ownerAndNameobj.owner;

        var tavernHeader = this.resultContainer.querySelector("#tavern_name");
        tavernHeader.innerText = tavernName;

        tavernHeader.classList.remove("hidden");
        this.generateTavernRumorsAndMenu();

        var description = "<strong>" + tavernName + "</strong>" + [" is located", " is situated", " can be found", " is placed "].pickOne() + " " + data.tavern.locations.pickOne() + ". ";

        description += "The interior is " + data.shops.interior.description[tavernWealth].pickOne() + " with a " + data.tavern.flooring[tavernWealth].pickOne() + " floor.";
        description += " The bar is " + data.tavern.barstyle.pickOne() + ". " + ["Round", "Square"].pickOne() + " tables are " + data.tavern.table_setup.pickOne() + ".";

        description += " " + data.tavern.that_little_extra[tavernWealth].pickOne() + ".";
        description = description.replace(/_material/g, data.material[tavernWealth].pickOne());

        description = replacePlaceholders(description, Math.random() > 0.5, data);


        var ownerName = tavernOwner.lastname;
        if (ownerName != "" && ownerName != null) ownerName = " " + ownerName;
        description += "<br><br>The owner, " + tavernOwner.firstname + (ownerName || "") + "," + tavernOwner.tavernKeepDescription;

        document.getElementById("tavern_description").innerHTML = description;

    }


    generateTavernRumorsAndMenu() {
        var data = this.generatorData;
        var menuTable = {};

        var tavernPriceDropdown = this.container.querySelector("#tavern_pricing");
        var tavernWealthDropdown = this.container.querySelector("#tavern_wealth");
        var rumorDropdown = this.container.querySelector("#tavern_rumours");
        var tavernMenuTypeDropdown = this.container.querySelector("#tavern_menu");

        var menuType = tavernMenuTypeDropdown.options[tavernMenuTypeDropdown.selectedIndex].value;
        var rumourCount = rumorDropdown.options[rumorDropdown.selectedIndex].value;
        var tavernWealth = tavernWealthDropdown.options[tavernWealthDropdown.selectedIndex].value;
        var tavernPrice = tavernPriceDropdown.options[tavernPriceDropdown.selectedIndex].value;

        var menuArray = data.tavern.menu[menuType];
        //cheaper =0 , more expensive = 1
        var arr = [menuArray[tavernWealth][0].pickX(d(2)), menuArray[tavernWealth][1].pickX(d(2))];
        var drinks = data.tavern.drinks[menuType][tavernWealth].pickX(
            d(4) + tavernWealth);
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
                vegetables = data.vegetables.pickX(2)
                exoticVegetables = data.exotic_vegetables.pickX(2)

                dish = dish.replace(/_2vegetables/g, vegetables[0] + " and " + vegetables[1]);
                dish = dish.replace(/_2exotic_vegetables/g, exoticVegetables[0] + " and " + exoticVegetables[1]);
                dish = dish.replace(/_exotic_vegetables/g, data.exotic_vegetables.pickOne());
                dish = dish.replace(/_vegetables/g, data.vegetables.pickOne());
                dish = dish.replace(/_meat/g, data.meat.pickOne());
                dish = dish.replace(/_exoticmeat/g, data.exotic_meat.pickOne());
                dish = dish.replace(/_fish/g, data.fish.pickOne());
                dish = dish.replace(/_dessert/g, data.tavern.desserts.pickOne());
                dish = dish.toProperCase();
                finalMenuArray.push(dish);
                finalPrice = i * priceBase;
                pricesArray.push(this.convertAmountToHighestCurrency(finalPrice, coinString));
            }
        }
        //Drinks
        for (var i = 0; i < drinks.length; i++) {
            drink = drinks[i];
            drink = drink.replace(/_brewer/g, data.tavern.brewers.pickOne());
            pricesArray.push(this.convertAmountToHighestCurrency(priceBase, coinString));
            finalMenuArray.push(drink);
        }

        menuTable.Item = finalMenuArray;
        menuTable.Price = pricesArray;

        var table = ElementCreator.generateHTMLTable(menuTable);
        var tableContainer = document.querySelector("#tavern_table");
        while (tableContainer.firstChild) {
            tableContainer.removeChild(tableContainer.firstChild);
        }
        tableContainer.appendChild(table);


        var rumorArray = this.generateRumors(d(3) * parseInt(rumourCount), data)
        var tavernRumorsParentContainer = document.getElementById("tavern_rumors")
        while (tavernRumorsParentContainer.firstChild) {
            tavernRumorsParentContainer.removeChild(tavernRumorsParentContainer.firstChild);
        }

        if (rumorArray.length > 0) {
            var rumorContainer = document.createElement("div");
            var rumorHeader = document.createElement("h2");
            rumorHeader.innerText = "Rumors";
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
                currentP.innerText = `"${rumorArray[i]}"`;
                currentP.classList.add("rumor_row_rumor");
                currentRumorMonger = npcGenerator.generateNPC(data, ["male", "female"].pickOne(), data.names.anglo, "humanoid")

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
            console.log(this, this.container)
            this.resultContainer.querySelector("#tavern_rumors").appendChild(rumorContainer);
        }
    }
    generateTavernName(data) {
        var tavernName = data.tavern.name.template.pickOne();
        var ownerGender = ["male", "female"].pickOne();
        var tavernOwner = npcGenerator.generateNPC(data, ownerGender, data.names["anglo"], "humanoid");

        var ending = "'s";
        if (tavernOwner.firstname.substring(tavernOwner.firstname.length - 1) === "s") ending = "'";
        tavernName = tavernName.replace(/_name/g, tavernOwner.firstname + ending);
        tavernName = tavernName.replace(/_common_animal/g, data.common_animal.pickOne());
        tavernName = tavernName.replace(/_adjective/g, data.tavern.name.adjective.pickOne());
        tavernName = tavernName.replace(/_tavern/g, data.tavern.name.tavern.pickOne());
        tavernName = tavernName.replace(/_profession/g, data.tavern.name.profession.pickOne());
        tavernName = tavernName.replace(/_unique/g, data.tavern.name.unique.pickOne());
        return { name: tavernName, owner: tavernOwner };
    }
    generateRumors(rumorAmount, data) {
        var rumorArray = data.rumors.pickX(rumorAmount);
        if (rumorAmount > data.rumors.length) rumorAmount = data.rumors.length;
        var rumor;

        for (var i = 0; i < rumorAmount; i++) {
            rumor = rumorArray[i];
            rumor = rumor.replace(/_manwoman/g, ["man", "woman"].pickOne());
            rumor = rumor.replace(/_tavernname/g, this.generateTavernName(data).name);
            rumor = rumor.replace(/_noble/g, data.noble.pickOne());
            rumor = rumor.replace(/_forest/g, data.forests.pickOne());
            rumor = replaceAll(rumor, "_creatures", data.creatures);
            rumor = replaceAll(rumor, "_monster", data.monsters);
            rumor = replaceAll(rumor, "_mountain", data.mountains);
            rumor = replaceAll(rumor, "_structure", data.structures);
            var allProfessions = [data.generated_creatures.humanoid.professions.common, data.generated_creatures.humanoid.professions.uncommon, data.generated_creatures.humanoid.professions.rare].flat();

            rumor = rumor.replace(/_profession/g, allProfessions.pickOne().toLowerCase());


            rumor = replaceAll(rumor, "_forest", data.forests);
            rumor = replaceAll(rumor, "_name", data.names.anglo.male);
            rumor = replaceAll(rumor, "_femalename", data.names.anglo.female);
            rumor = replaceAll(rumor, "_lastname", data.names.anglo.lastnames);
            rumor = replaceAll(rumor, "_locale", data.locales);
            rumor = rumor.capitalizeAndDot();
            rumorArray[i] = rumor;

        }


        return rumorArray;
    }

    convertAmountToHighestCurrency(amountString, coinString) {
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

}

module.exports = TavernGenerator;