const SlimSelect = require("slim-select");
const dataaccess = require("../js/dataaccess");
const util = require("../js/util");
const ElementCreator = require("../js/lib/elementCreator");
class TokenDialog {
    initialize() {
        this.populateSizeDropdown();
        var cls = this;
        this.token_size = 50;
        this.defaultName = "Unnamed token";
        this.dialog = document.getElementById("popup_dialogue_add_pawn");
        document.getElementById("icon_load_button_add_pawn").onclick = async function () {
            var info = {
                name: document.getElementById("add_pawn_name").value,
            };
            await tokenSelector.getNewTokenPaths(
                true,
                (imagePaths) => {
                    if (imagePaths == null) return;
                    cls.pawnsSelected(imagePaths);
                },
                info
            );
        };

        document.getElementById("add_pawn_name").oninput = async function (e) {
            cls.stopTooltip = util.mouseActionTooltip(cls.getName());
            var isPlayer = partyArray.find((x) => x[0] == e.target.value);
            if (!isPlayer) {
                if (cls.playerTokenLoaded) cls.deselectPlayerToken();
                return;
            }

            cls.selectPlayerToken(isPlayer);
        };
        document.querySelector("#add_pawn_quick_select").onclick = (e) => {
            cls.addToQuickSelect(cls.addPawnImagePaths);
        };
        this.refreshQuickSelect();
    }
    removeQuickSelect(name) {
        var quickSelect = localStorage.getItem("token_dialog_quick_select_data");
        quickSelect = !quickSelect ? [] : JSON.parse(quickSelect);
        quickSelect = quickSelect.filter((x) => x.name != name);
        localStorage.setItem("token_dialog_quick_select_data", JSON.stringify(quickSelect));
        this.refreshQuickSelect();
    }
    addToQuickSelect(paths) {
        var quickSelect = localStorage.getItem("token_dialog_quick_select_data");
        quickSelect = !quickSelect ? [] : JSON.parse(quickSelect);
        var name = this.getName();
        if (name == this.defaultName) name = `Quickselect ${quickSelect.length + 1}`;
        var existing = quickSelect.find((x) => x.name == name);

        var exists = existing != null;
        if (!existing) existing = {};
        existing.name = name;
        existing.sizeIndex = this.sizeMenu.selected();
        existing.paths = paths;
        existing.color = this.getColor();
        if (!exists) quickSelect.push(existing);
        localStorage.setItem("token_dialog_quick_select_data", JSON.stringify(quickSelect));
        this.refreshQuickSelect();
        document.querySelector("#add_pawn_quick_select").classList.add("hidden");
    }
    refreshQuickSelect() {
        var container = document.querySelector("#pawn_quick_select");
        while (container.firstChild) container.removeChild(container.firstChild);
        var quickSelect = localStorage.getItem("token_dialog_quick_select_data");
        if (!quickSelect) return;
        container.classList.remove("hidden");
        quickSelect = JSON.parse(quickSelect);
        var elementList = [];
        quickSelect.forEach((item) => {
            var tokenCreateResult = ElementCreator.createTokenElement(item.paths[0], item.color);

            var idx = parseInt(item.sizeIndex);
            var multiplier = !isNaN(idx) ? parseFloat(creaturePossibleSizes.hexes[idx]) : 1;

            elementList.push({ element: tokenCreateResult.base || tokenCreateResult.token, size: multiplier * this.token_size });
            var token = tokenCreateResult.token;
            token.onmousedown = (e) => {
                console.log(e);
                if (e.button == 2) {
                    this.removeQuickSelect(item.name);
                    return;
                }
                this.setName(item.name);
                this.pawnsSelected(item.paths, true);
                this.sizeMenu.set(item.sizeIndex);
                this.setColor(item.color);
            };
            var diameter = parseInt(this.token_size) * multiplier;
            token.style.width = diameter + "px";
            token.style.height = diameter + "px";
            if (tokenCreateResult.base) {
                tokenCreateResult.base.style.maxWidth = diameter + "px";
                tokenCreateResult.base.style.maxHeight = diameter + "px";
            }
        });
        util.masonryLayout(container, elementList, this.token_size, 5);
    }
    getName() {
        return document.getElementById("add_pawn_name").value || this.defaultName;
    }

    setName(name) {
        document.getElementById("add_pawn_name").value = name;
    }
    deselectPlayerToken() {
        this.pawnsSelected(null);
        this.pawnQueued = null;
        this.playerTokenLoaded = false;
    }

    async selectPlayerToken(player) {
        var cls = this;
        var path = await dataAccess.getTokenPath(player[2]);
        this.setName(player[0]);
        this.pawnsSelected([path], true);
        this.pawnQueued = function (e) {
            cls.pawnQueued = null;

            var existing = pawns.players.find((x) => x[1] == player[0]);

            if (existing) map.removePawn(existing[0]);

            dataaccess.getParty(async (party) => {
                var ele = party.members.find((x) => x.id == player[2]);
                if (!ele) return;
                await generatePawns(
                    [
                        {
                            name: ele.character_name,
                            id: ele.id,
                            size: "medium",
                            color: Util.hexToRGBA(ele.color, 0.4),
                            bgPhoto: null,
                            darkVisionRadius: ele.darkvision,
                            spawnPoint: e,
                        },
                    ],
                    false
                );
            });
        };
    }
    pawnsSelected(paths, quickSelected) {
        this.addPawnImagePaths = paths;
        var row = document.querySelector("#add_pawn_selected_row");
        while (row.firstChild) row.removeChild(row.firstChild);
        if (!paths || paths.length == 0) {
            document.querySelector("#add_pawn_selected_row").classList.add("hidden");
        } else {
            document.querySelector("#add_pawn_selected_row").classList.remove("hidden");
            document.querySelector("#add_pawn_quick_select").classList.remove("hidden");
        }
        if (quickSelected) document.querySelector("#add_pawn_quick_select").classList.add("hidden");
        paths.forEach((path) => {
            row.appendChild(ElementCreator.createTokenElement(path).token);
        });
        this.stopTooltip = util.mouseActionTooltip(this.getName());
    }

    show() {
        var cls = this;
        this.stopTooltip = util.mouseActionTooltip(this.getName());
        sidebarManager.showInSideBar(this.dialog, () => {
            document.body.appendChild(cls.dialog);
        });

        this.dialog.classList.remove("hidden");
        gridLayer.style.cursor = "copy";
        window.setTimeout(() => document.getElementById("add_pawn_name").select(), 300);
        var cls = this;
        gridLayer.onmousedown = function (e) {
            if (e.button == 0) {
                cls.addPawnHandler(e);
            } else {
                cls.close();
            }
        };
        var missingPawnContainer = this.dialog.querySelector(".quick_add_pc_buttons");
        while (missingPawnContainer.firstChild) missingPawnContainer.removeChild(missingPawnContainer.firstChild);

        var missingPlayerPawns = partyArray.filter((x) => !pawns.players.find((y) => y[1] == x[0]));
        if (missingPlayerPawns.length > 0) {
            missingPlayerPawns.forEach((ele) => {
                var charName = ele[0];
                var btn = util.ele("button", " button_style_transparent ", charName);
                btn.onclick = (e) => {
                    btn.parentNode.removeChild(btn);
                    var inp = document.getElementById("add_pawn_name");
                    inp.value = charName;
                    inp.oninput({ target: inp });
                };
                missingPawnContainer.appendChild(btn);
            });
        }
    }

    setColor(color) {
        document.getElementById("background_color_button_add_pawn").value = color;
    }

    getColor() {
        return document.getElementById("background_color_button_add_pawn").value;
    }

    close() {
        this.dialog.classList.add("hidden");
        sidebarManager.close();
        pauseAlternativeKeyboardMoveMap = false;
        resetGridLayer();
        gridLayer.style.cursor = "auto";
        this.stopTooltip();
    }

    async addPawnHandler(e) {
        if (this.pawnQueued) return this.pawnQueued(e);

        var pawnName = document.getElementById("add_pawn_name").value;

        var sizeIndex = parseInt(this.sizeMenu.selected());
        var pawnSize = creaturePossibleSizes.sizes[sizeIndex];
        var dndSize = creaturePossibleSizes.hexes[sizeIndex];

        var color = this.getColor();

        await generatePawns(
            [
                {
                    name: pawnName,
                    size: pawnSize,
                    color: color,
                    bgPhoto: this.addPawnImagePaths,
                    spawnPoint: {
                        x: e.clientX - (dndSize * cellSize) / 2,
                        y: e.clientY - (dndSize * cellSize) / 2,
                    },
                },
            ],
            true
        );
    }

    populateSizeDropdown() {
        var parent = document.getElementById("add_pawn_size");

        var list = creaturePossibleSizes.sizes.map((size) => {
            return {
                text: size.toProperCase(),
                value: "" + creaturePossibleSizes.sizes.indexOf(size),
                selected: size == "medium",
            };
        });

        this.sizeMenu = new SlimSelect({
            select: parent,
            hideSelectedOption: true,
        });
        this.sizeMenu.setData(list);
    }
}

module.exports = TokenDialog;
