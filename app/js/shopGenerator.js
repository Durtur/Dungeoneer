const ElementCreator = require("../js/lib/elementCreator");
const NotePad = require("./notepad/notepad");
const Modals = require("./modals");
const util = require("./util");
class ShopGenerator {
    initialize(generatorData, container, resultContainer) {
        this.generatorData = generatorData;
        this.container = container;
        this.resultContainer = resultContainer;
        var cls = this;
        document.getElementById("reroll_shop_button").addEventListener("click", function (devt) {

            dataAccess.getItems(function (data) {
                cls.generateShopInventory(data)
            });


        });


        document.querySelector("#generate_shop_button").addEventListener("click", function () {
            cls.generateShop();

        });

        this.sortDirections = [false, false, false]
        this.keys = ["Name", "Rarity", "Price"]
        this.switchFunctions = [,]

        document.getElementById("save_shop_button").addEventListener("click", function (e) {
            cls.saveShop();
        });
        document.getElementById("embed_shop_button").addEventListener("click", (e) => {
            getEmbeddable(cls.resultContainer, (resText) => {
                clipboard.writeText(resText);
                util.showSuccessMessage("Copied HTML embeddable shop");
            })
        });
        document.getElementById("delete_shop_button").addEventListener("click", function (e) {
            cls.deleteShop();
        });
        this.createSavedShopsSearch();
    }

    saveShop() {
        this.showShopMetadataModal((result) => {
            if (!result)
                return;

            this.currentShop.metadata = result;
            dataAccess.persistGeneratorData(this.currentShop, "shop", (data, err) => {
                if (err) {
                    util.showFailedMessage("Couldn't save shop");
                } else {
                    util.showSuccessMessage("Shop saved");
                    this.currentShop = data.shop.find(x => x.name == this.currentShop.name);
                    this.createSavedShopsSearch();
                    this.displayShop();
                }

            });
        });


    }

    createSavedShopsSearch() {
        var cls = this;
        dataAccess.getPersistedGeneratorData("shop", (data) => {
            if (!data || data.length == 0) {
                if (this.searchInput) this.searchInput.classList.add("hidden");
                return;

            }
            var templ = cls.container.querySelector(".saved_shops_search");

            if (templ) {
                this.searchInput = templ;
                templ.classList.remove("hidden");
            } else {
                cls.searchInput = util.ele("input", "saved_shops_search search_input");
                cls.searchInput.placeholder = "Saved taverns...";
                cls.container.appendChild(cls.searchInput);
            }


            var searchData = data.map(x => { return { label: x.name, value: x.id } });
            if (this.searchAwesomplete)
                this.searchAwesomplete.destroy();
            this.searchAwesomplete = new Awesomplete(cls.searchInput, { list: searchData, autoFirst: true, minChars: 0 });
            cls.searchInput.addEventListener("awesomplete-selectcomplete", (e) => {
                cls.searchInput.value = e.text.label;
                cls.fetchShop(e.text.value);


            })
        });
    }

    fetchShop(id) {
        var cls = this;
        dataAccess.getPersistedGeneratorData("shop", (data) => {
            var shop = data.find(x => x.id == id);
            console.log(shop);
            if (!shop)
                return;
            cls.currentShop = shop;
            cls.displayShop();
        });
    }
    deleteShop() {
        if (window.dialog.showMessageBoxSync({
            type: "question",
            buttons: ["Ok", "Cancel"],
            title: "Delete shop?",
            message: `Do you wish to delete ${this.currentShop.name}?`
        }) == 1) return;

        dataAccess.deleteGeneratorPersisted("shop", this.currentShop.id, (data, err) => {
            if (err) {
                util.showFailedMessage("Error deleting shop");
                return;
            }
            this.currentShop = null;
            this.displayShop();
            this.createSavedShopsSearch();

        });
    }

    createMetaData(readonly = true) {
        var cont = this.resultContainer.querySelector("#shop_metadata");
        var cls = this;
        if (!cont)
            return;
        while (cont.firstChild)
            cont.removeChild(cont.firstChild);
        if (!this.currentShop?.metadata?.description)
            return;
        var parent = util.ele("div", "column");
        var note = new NotePad(this.currentShop?.metadata.description, readonly, (e) => {
            cls.saveShop();
        }, true);
        parent.appendChild(note.container());
        cont.appendChild(parent);
        note.render();

    }

    fetchShopParams() {
        var shopWealthDropdown = document.querySelector("#shop_wealth");
        this.currentShop.wealth = shopWealthDropdown.selectedIndex;
        var shopTypeDropdown = document.querySelector("#shop_type");
        this.currentShop.type = shopTypeDropdown.options[shopTypeDropdown.selectedIndex].value;
        var shopSizeDropdown = document.querySelector("#shop_size");
        this.currentShop.size = shopSizeDropdown.selectedIndex;
        this.currentShop.size++;
        var shopPricingDropdown = document.querySelector("#shop_pricing");
        this.currentShop.price = parseFloat(shopPricingDropdown.options[shopPricingDropdown.selectedIndex].value);

    }

    generateShop() {
        dataAccess.getItems(data => {
            this.currentShop = {};
            this.generateShopInventory(data, () => this.generateShopDescription());

        });


    }
    generateShopInventory(itemData, callback) {
        this.fetchShopParams();
        var shopWealth = this.currentShop.wealth;
        var shopType = this.currentShop.type;
        var shopSize = this.currentShop.size
        var shopPricing = this.currentShop.price
        var currentRarity;

        var shopInventoryArray = [];
        var tooltipsForTable = [];
        var cls = this;
        var shopInventory = {};
        shopInventory.name = [];
        shopInventory.rarity = [];
        shopInventory.price = [];
        dataAccess.getScrolls(function (scrollData) {
            if (shopType.toLowerCase() != "general") {
                if (shopType === "scroll") {
                    itemData = scrollData;
                } else {
                    itemData = typeFilter(itemData, shopType)
                }

            } else {
                var currentScrollRarity;

                for (var i = 0; i <= shopWealth; i++) {
                    currentScrollRarity = [];
                    for (var j = 0; j < scrollData.length; j++) {
                        if (cls.evaluateRarity(scrollData[j].rarity) == i) {
                            currentScrollRarity.push([scrollData[j].name, scrollData[j].rarity, scrollData[j].type, { description: scrollData[j].description }])

                        }
                    }
                    var chosen = currentScrollRarity.pickX(shopSize * (d(2) - 1));
                    shopInventoryArray = shopInventoryArray.concat(chosen);
                }



            }
            for (var i = 0; i <= shopWealth; i++) {
                currentRarity = [];
                for (var j = 0; j < itemData.length; j++) {
                    if (cls.evaluateRarity(itemData[j].rarity) == i) {
                        currentRarity.push([itemData[j].name, itemData[j].rarity, itemData[j].type,
                        {
                            description: itemData[j].description,
                            attunement: (itemData[j].requires_attunement ? `(requires attunement${itemData[j].requires_attunement_by ? " " + itemData[j].requires_attunement_by : ""})` : "")
                        }])
                    }

                }
                chosen = currentRarity.pickX(shopSize * d(4));
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

                var tooltip = str.attunement ? `-- ${str.attunement} -- \n\n ${str.description.replace(/\*/g, " -- ")}` : str.description.replace(/\*/g, " -- ");
                tooltipsForTable.push(tooltip);
                shopInventoryArray[i].splice(3, 1);
            }

            shopInventoryArray.forEach(function (subArray) {
                shopInventory.name.push(subArray[0])
                shopInventory.rarity.push(subArray[1]);
                var price = cls.randomizeItemPrice(subArray[1]);
                if (subArray[2].toLowerCase() === "potion" || subArray[2].toLowerCase() === "scroll") {
                    price /= 2;
                }
                price *= shopPricing;
                shopInventory.price.push(cls.makePrettyPriceString(price));
            });

            cls.currentShop.inventory = shopInventory;
            cls.currentShop.inventoryTooltips = tooltipsForTable;

            cls.displayShop();
            if (callback) callback();
        });


        function typeFilter(jsonObj, type) {

            var results = [];
            for (var i = 0; i < jsonObj.length; i++) {
                if (typeof jsonObj[i].type != "string") continue;
                if (jsonObj[i].type.toLowerCase() == type) {
                    results.push(jsonObj[i]);
                }
            }
            return results;
        }

    }


    makePrettyPriceString(str) {
        return str.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " gp";
    }
    undoPrettyPriceString(str) {
        str = str.substring(0, str.length - 3);
        str = str.replace(/,/g, "");

        return str;
    }

    resetUi() {
        this.toggleShopButtons(false);
    }
    toggleShopButtons(visible){
        ["delete_shop_button", "save_shop_button", "embed_shop_button", "reroll_shop_button"].forEach(id => {
            var btn = document.getElementById(id);
            if (!btn)return;
            if(visible){
                btn.classList.remove("hidden");
            }
            else{

                btn.classList.add("hidden");
            }
        })
    }
    displayShop() {
        this.resetUi();
        this.emptyAndCreateTable();
        var descriptionBox = document.querySelector("#shop_description");
        var headerBox = document.querySelector("#shop_name");
        headerBox.classList.remove("hidden");
        headerBox.innerText = this.currentShop?.name || "";
        headerBox.classList.remove("hidden");
        descriptionBox.innerHTML = this.currentShop?.description || "";
        this.createMetaData();
        if (!this.currentShop?.name)
            return;
        document.getElementById("reroll_shop_button").classList.remove("hidden");
        var embedBtn = document.getElementById("embed_shop_button");
        if (embedBtn)
            embedBtn.classList.remove("hidden");

        var saveBtn = document.getElementById("save_shop_button");
        if (saveBtn)
            saveBtn.classList.remove("hidden");

        if (this.currentShop?.id) {
            var deleteBtn = document.getElementById("delete_shop_button");
            if (deleteBtn)
                deleteBtn.classList.remove("hidden");

        }
    }

    emptyAndCreateTable() {
        var tableContainer = document.querySelector("#shop_generator_table");
        while (tableContainer.firstChild) {
            tableContainer.removeChild(tableContainer.firstChild);
        }
        var shopInventory = this.currentShop?.inventory;
        if (!shopInventory)
            return;
        var table = ElementCreator.generateHTMLTable(shopInventory);
        var nameFields = table.querySelectorAll("td:first-of-type");
        for (var i = 0; i < nameFields.length; i++) {
            nameFields[i].classList.add("tooltipped", "tooltipped_large");
            nameFields[i].setAttribute("data-tooltip", this.currentShop?.inventoryTooltips[i])
        }

        tableContainer.setAttribute("data-shop_inventory", JSON.stringify(shopInventory));
        tableContainer.appendChild(table)



        var headers = document.querySelectorAll("th");
        var cls = this;
        for (var i = 0; i < headers.length; i++) {
            headers[i].addEventListener("click", (e) => {
                cls.sortByHeaderValue(e, this)
            });
        }
    }


    randomizeItemPrice(rarity) {
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
    evaluateRarity(str) {
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



    sortByHeaderValue(e, cls) {

        var rows, switching, i, x, y, shouldSwitch, switchcount = 0;
        var n = cls.keys.indexOf(e.target.innerText)

        if (n < 2) {
            cls.switchFunction = function (x, y) { return x.innerText.toLowerCase() > y.innerText.toLowerCase() }
        } else {
            cls.switchFunction = function (x, y) { return parseInt(cls.undoPrettyPriceString(x.innerText)) > parseInt(cls.undoPrettyPriceString(y.innerText)) }
        }
        switching = true;
        cls.sortDirections[n] = true;
        while (switching) {
            switching = false;
            rows = document.querySelectorAll("#shop_generator_table>table>tbody>tr");

            for (i = 0; i < rows.length - 1; i++) {
                shouldSwitch = false;
                x = rows[i].getElementsByTagName("TD")[n];

                y = rows[i + 1].getElementsByTagName("TD")[n];

                if (cls.sortDirections[n]) {
                    if (cls.switchFunction(x, y)) {
                        shouldSwitch = true;
                        break;
                    }
                } else if (!cls.sortDirections[n]) {
                    if (cls.switchFunction(y, x)) {
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
                if (switchcount == 0 && cls.sortDirections[n]) {
                    cls.sortDirections[n] = false;
                    switching = true;
                }
            }
        }

    }

    async showShopMetadataModal(callback) {
        var modalCreate = Modals.createModal("Shop", () => { });
        var modal = modalCreate.modal;
        var notePad = new NotePad(this.currentShop?.metadata?.description, false);
        var desc = notePad.container();

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
    generateShopDescription() {
        var shopWealth = this.currentShop.wealth;
        var shopType = this.currentShop.type;
        shopType = shopType.serialize();
        var data = this.generatorData;
        var inventorySize = this.currentShop.inventory.price.length;
        var randomIndex = Math.floor(Math.random() * data.shops.names.template.length);

        var shopOwner;
        var shopName = "" + data.shops.names.template[randomIndex];
        var fantasyProbability = 0.1 + 0.1 * shopWealth;
        var rand = Math.random();
        var descriptionSet, clutterSet, locationSet;

        if (rand < fantasyProbability) {
            descriptionSet = data.shops.interior.description_fantastic[shopWealth];
            clutterSet = data.shops.interior.clutter_fantastic;
        } else {
            descriptionSet = data.shops.interior.description[shopWealth];
            clutterSet = data.shops.interior.clutter;
        }


        rand = Math.random();
        var creatureType = "humanoid";
        var ownerGender = ["male", "female"].pickOne();
        if (rand < fantasyProbability) {
            locationSet = data.shops.location_fantastic;
            var nameset;
            creatureType = ["celestial", "fey", "aberration", "fiend", "humanoid"].pickOne()
            if (creatureType === "humanoid") {
                nameset = "anglo";
            } else {
                nameset = creatureType;
            }

            shopOwner = npcGenerator.generateNPC(data, ownerGender, data.names[nameset], creatureType, "shop");

        } else {
            locationSet = data.shops.location;
            shopOwner = npcGenerator.generateNPC(data, ownerGender, data.names.anglo, "humanoid", "shop");
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
        shopName = shopName.replace(/_typeboundname/g, data.shops.names.typeboundname[shopType].pickOne());
        shopName = shopName.replace(/_typebound/g, data.shops.names.typebound[shopType].pickOne());

        shopName = shopName.replace(/_wealthbound/g, data.shops.names.wealthbound[shopWealth].pickOne());
        shopName = shopName.replace(/_name/g, ownerName + ending);
        shopName = shopName.replace(/_adjective/g, data.shops.names.adjective.pickOne());

        shopName = shopName.replace(/_wares/g, data.shops.names.wares[shopType].pickOne());
        shopName = shopName.replace(/_surname/g, ownerLastName + ending);

        shopName = replacePlaceholders(shopName, null, data);

        shopName = shopName.toProperCase();

        var description = "<strong>" + shopName + "</strong>" + [" is located", " is situated", " can be found", " is placed "].pickOne() + locationSet.pickOne() + ". ";
        description = description.replace(/_roominhouse/g, data.roominhouse.pickOne());
        if (description.includes("!nointerior")) {
            description = description.replace(/!nointerior/g, "");
        } else {
            description += "The interior of the shop is " + descriptionSet.pickOne() + ". "
                + clutterSet.pickOne() + "."
            description = description.replace(/_material/g, data.material[shopWealth].pickOne());
            description = description.replace(/_metal/g, data.metals.pickOne());
            description = description.replace(/_element/g, ["earth", "fire", "water", "air"].pickOne());
            description = description.replace(/_inventory/g, ["inventory is", "merchandise is", "stock is"].pickOne());
            description = description.replace(/_inventorypl/g, ["wares are", "commodities are", "goods are"].pickOne());

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
        this.currentShop.description = description;
        this.currentShop.name = shopName;
        this.displayShop();

    }

}

module.exports = ShopGenerator;

