
const ElementCreator = require("../js/lib/elementCreator");
const Modals = require("./modals");
const util = require("./util");

const NotePad = require("./notepad/notepad");

class TavernGenerator {
    initialize(generatorData, container, resultContainer) {
        this.generatorData = generatorData;
        this.container = container;
        this.resultContainer = resultContainer;
        this.replacementValues = generatorData.replacement_values;

        this.createSavedTavernsSearch();

        var cls = this;
        document.getElementById("reroll_tavern_button").addEventListener("click", function (evnt) {

            cls.generateTavernRumorsAndMenu(cls.currentTavern);
            cls.displayTavern();
        });

        document.getElementById("save_tavern_button").addEventListener("click", function (e) {
            cls.saveTavern();
        });
        document.getElementById("embed_tavern_button").addEventListener("click", (e) => {
            getEmbeddable(cls.resultContainer, (resText) => {
                clipboard.writeText(resText);
                util.showSuccessMessage("Copied HTML embeddable tavern");
            })
        });
        document.getElementById("delete_tavern_button").addEventListener("click", function (e) {
            cls.deleteTavern();
        });
    }

    deleteTavern() {
        if (window.dialog.showMessageBoxSync({
            type: "question",
            buttons: ["Ok", "Cancel"],
            title: "Delete tavern?",
            message: `Do you wish to delete ${this.currentTavern.name}?`
        }) == 1) return;

        dataAccess.deleteGeneratorPersisted("tavern", this.currentTavern.id, (data, err) => {
            if (err) {
                util.showFailedMessage("Error deleting tavern");
                return;
            }
            this.currentTavern = null;
            this.displayTavern();
            this.createSavedTavernsSearch();

        });

    }

    saveTavern() {
        this.showTavernMetadataModal((result) => {
            if (!result)
                return;

            this.currentTavern.metadata = result;
            dataAccess.persistGeneratorData(this.currentTavern, "tavern", (data, err) => {
                if (err) {
                    util.showFailedMessage("Couldn't save tavern");
                } else {
                    util.showSuccessMessage("Tavern saved");
                    this.currentTavern.metadata.saved = true;
                    this.createSavedTavernsSearch();
                    this.displayTavern();
                }

            });
        });


    }
    createSavedTavernsSearch() {

        var cls = this;
        dataAccess.getPersistedGeneratorData("tavern", (data) => {

            if (!data || data.length == 0) {
                if (this.searchInput) this.searchInput.classList.add("hidden");
                return;

            }
            var templ = cls.container.querySelector(".saved_taverns_search");

            if (templ) {
                this.searchInput = templ;
                templ.classList.remove("hidden");
            } else {
                cls.searchInput = util.ele("input", "saved_taverns_search search_input");
                cls.searchInput.placeholder = "Saved taverns...";
                cls.container.appendChild(cls.searchInput);
            }


            var searchData = data.map(x => { return { label: x.name, value: x.id } });
            if (this.searchAwesomplete)
                this.searchAwesomplete.destroy();
            this.searchAwesomplete = new Awesomplete(cls.searchInput, { list: searchData, autoFirst: true, minChars: 0 });
            cls.searchInput.addEventListener("awesomplete-selectcomplete", (e) => {

                cls.searchInput.value = e.text.label;
                cls.fetchTavern(e.text.value);


            })
        });
    }

    fetchTavern(id) {
        var cls = this;
        dataAccess.getPersistedGeneratorData("tavern", (data) => {
            var tavern = data.find(x => x.id == id);
            console.log(tavern);
            if (!tavern)
                return;
            cls.currentTavern = tavern;
            cls.displayTavern(tavern);
        });
    }
    async showTavernMetadataModal(callback) {
        var modalCreate = Modals.createModal("Tavern", () => { });
        var modal = modalCreate.modal;
        var notePad = new NotePad(this.currentTavern?.metadata?.description, false);
        var desc = notePad.container();

        util.ele("textarea", "tavern_description_data");
        var lbl = util.ele("label", "text_left", "Notes");
        var col = util.ele("div", "column");
        col.appendChild(lbl);
        col.appendChild(desc);
        modal.appendChild(col);

        var btn = util.ele("button", "button_style button_wide green base_margin", "Ok");
        btn.onclick = (e) => {
            modal.close(true);
            callback({ description: notePad.getContents() });
        }
        modal.appendChild(util.wrapper("div", "row flex_end", btn));
        document.body.appendChild(modalCreate.parent);
        notePad.render(true);

    }

    generateTavern() {
        var data = this.generatorData;
        this.container.querySelector("#reroll_tavern_button").classList.remove("hidden");
        var tavernWealthDropdown = this.container.querySelector("#tavern_wealth");

        var tavern = this.generateTavernName(data);
        tavern.wealth = tavernWealthDropdown.options[tavernWealthDropdown.selectedIndex].value;
        var tavernName = tavern.name;

        var tavernOwner = tavern.owner;


        var description = "<strong>" + tavernName + "</strong>" + [" is located", " is situated", " can be found", " is placed "].pickOne() + " " + data.tavern.locations.pickOne() + ". ";

        description += "The interior is " + data.shops.interior.description[tavern.wealth].pickOne() + " with a " + data.tavern.flooring[tavern.wealth].pickOne() + " floor.";
        description += " The bar is " + data.tavern.barstyle.pickOne() + ". " + ["Round", "Square"].pickOne() + " tables are " + data.tavern.table_setup.pickOne() + ".";

        description += " " + data.tavern.that_little_extra[tavern.wealth].pickOne() + ".";
        description = description.replace(/_material/g, data.material[tavern.wealth].pickOne());

        description = replacePlaceholders(description, Math.random() > 0.5, data);


        var ownerName = tavernOwner.lastname;

        if (ownerName != "" && ownerName != null) ownerName = " " + ownerName;
        description += "<br><br>The owner, " + tavernOwner.firstname + (ownerName || "") + "," + tavernOwner.tavernKeepDescription;
        tavern.description = description;
        this.generateTavernRumorsAndMenu(tavern);
        this.setTavern(tavern);

        this.displayTavern();

    }

    setTavern(tavern) {
        this.currentTavern = tavern;
    }

    displayTavern() {
        this.resetUi();
        var tavernHeader = this.resultContainer.querySelector("#tavern_name");
        tavernHeader.innerText = this.currentTavern?.name || "";
        this.createMetaData();
        tavernHeader.classList.remove("hidden");
        document.getElementById("tavern_description").innerHTML = this.currentTavern?.description || "";
        this.displayRumorsAndMenu();

        if (!this.currentTavern?.name)
            return;

        var embedBtn = document.getElementById("embed_tavern_button");
        if (embedBtn)
            embedBtn.classList.remove("hidden");

        var saveBtn = document.getElementById("save_tavern_button");
        if (saveBtn)
            saveBtn.classList.remove("hidden");

        if (this.currentTavern?.id) {
            var deleteBtn = document.getElementById("delete_tavern_button");
            if (deleteBtn)
                deleteBtn.classList.remove("hidden");

        }
    }

    resetUi() {
        var deleteBtn = document.getElementById("delete_tavern_button");
        if (deleteBtn)
            deleteBtn.classList.add("hidden");

        var saveBtn = document.getElementById("save_tavern_button");
        if (saveBtn)
            saveBtn.classList.add("hidden");

        var embedBtn = document.getElementById("embed_tavern_button");
        if (embedBtn)
            embedBtn.classList.add("hidden");

    }

    createMetaData(readonly = true) {
        var cont = this.resultContainer.querySelector("#tavern_metadata");
        var cls = this;
        if (!cont)
            return;
        while (cont.firstChild)
            cont.removeChild(cont.firstChild);
        if (!this.currentTavern?.metadata?.description)
            return;
        var parent = util.ele("div", "column");
        var note = new NotePad(this.currentTavern?.metadata.description, readonly, (e) => {
            cls.saveTavern();
        }, true);
        parent.appendChild(note.container());
        cont.appendChild(parent);
        note.render();

    }

    generateTavernRumorsAndMenu(tavern) {
        var data = this.generatorData;
        var tavernPriceDropdown = this.container.querySelector("#tavern_pricing");
        var tavernWealthDropdown = this.container.querySelector("#tavern_wealth");
        var rumorDropdown = this.container.querySelector("#tavern_rumours");
        var tavernMenuTypeDropdown = this.container.querySelector("#tavern_menu");

        tavern.menuType = tavernMenuTypeDropdown.options[tavernMenuTypeDropdown.selectedIndex].value;
        tavern.rumourCount = rumorDropdown.options[rumorDropdown.selectedIndex].value;

        tavern.price = tavernPriceDropdown.options[tavernPriceDropdown.selectedIndex].value;

        var menuArray = data.tavern.menu[tavern.menuType];
        //cheaper =0 , more expensive = 1
        var arr = [menuArray[tavern.wealth][0].pickX(d(2)), menuArray[tavern.wealth][1].pickX(d(2))];
        var drinks = data.tavern.drinks[tavern.menuType][tavern.wealth].pickX(
            d(4) + tavern.wealth);
        var finalMenuArray = [];
        var pricesArray = [];
        var priceBase, coinString, dish, drink;
        var tavernEconomyArray = [
            [d(4), "cp"],
            [d(3), "sp"],
            [d(10), "sp"],
            [d(6), "gp"]
        ]
        priceBase = tavernEconomyArray[tavern.wealth][0];
        priceBase *= tavern.price;
        coinString = tavernEconomyArray[tavern.wealth][1];
        var vegetables, exoticVegetables, finalPrice;
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


        tavern.menu = { item: finalMenuArray, price: pricesArray };
        tavern.rumors = this.generateRumors(d(3) * parseInt(tavern.rumourCount), data);

    }

    displayRumorsAndMenu() {

        var tableContainer = document.querySelector("#tavern_table");
        while (tableContainer.firstChild) {
            tableContainer.removeChild(tableContainer.firstChild);
        }
        var tavernRumorsParentContainer = document.getElementById("tavern_rumors");
        while (tavernRumorsParentContainer.firstChild) {
            tavernRumorsParentContainer.removeChild(tavernRumorsParentContainer.firstChild);
        }

        if (!this.currentTavern)
            return;
        var table = ElementCreator.generateHTMLTable(this.currentTavern.menu);
        tableContainer.appendChild(table);


        var rumorArray = this.currentTavern.rumors;

        if (rumorArray.length == 0) return;
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
            currentP.innerText = `"${rumorArray[i].rumor}"`;
            currentP.classList.add("rumor_row_rumor");
            currentRumorMonger = rumorArray[i].monger;

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

        this.resultContainer.querySelector("#tavern_rumors").appendChild(rumorContainer);

    }

    generateTavernName(data) {
        var tavernName = data.tavern.name.template.pickOne();
        var ownerGender = ["male", "female"].pickOne();
        var tavernOwner = npcGenerator.generateNPC(data, ownerGender, data.names["anglo"], "humanoid", "tavern");

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
            var monger = npcGenerator.generateNPC(data, ["male", "female"].pickOne(), data.names.anglo, "humanoid")
            rumorArray[i] = { rumor: rumor, monger: monger };

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