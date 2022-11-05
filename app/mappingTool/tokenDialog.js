const SlimSelect = require("slim-select");
const dataaccess = require("../js/dataaccess");
const Util = require("../js/util");
const ElementCreator = require("../js/lib/elementCreator");
class TokenDialog {
    initialize() {
        this.populateSizeDropdown();
        var cls = this;
        this.selectedTokenImageIndex = 0;
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
            var player = partyArray.find((x) => x.character_name == e.target.value);
            if (!player) {
                if (cls.playerTokenLoaded) cls.deselectPlayerToken();
                cls.onPlacementInfoChanged();
                return;
            }

            cls.selectPlayerToken(player);
            cls.onPlacementInfoChanged();
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
        Util.masonryLayout(container, elementList, this.token_size, 5);
    }
    getName() {
        return document.getElementById("add_pawn_name").value || this.defaultName;
    }

    setName(name) {
        document.getElementById("add_pawn_name").value = name;
    }
    deselectPlayerToken() {
        this.pawnsSelected(null);
        this.existingPawnInfo = null;
        this.playerTokenLoaded = false;
    }
    setExistingPawnInfo(info) {
        console.log("Set existing ", info);
        this.existingPawnInfo = info;
    }
    async selectPlayerToken(player) {
        var path = await dataAccess.getTokenPath(player.id);
        this.playerTokenLoaded = true;
        this.setExistingPawnInfo({ id: player.id, darkVisionRadius: player.darkvision });
        this.setColor(Util.hexToRGBA(player.color, 0.4));
        this.setSize("medium");
        this.setName(player.character_name);
        this.pawnsSelected([path], true);
    }
    pawnsSelected(paths, quickSelected) {
        this.addPawnImagePaths = paths;
        var row = document.querySelector("#add_pawn_selected_row");
        while (row.firstChild) row.removeChild(row.firstChild);
        if (!paths || paths.length == 0) {
            document.querySelector("#add_pawn_selected_row").classList.add("hidden");
            return;
        } else {
            document.querySelector("#add_pawn_selected_row").classList.remove("hidden");
            document.querySelector("#add_pawn_quick_select").classList.remove("hidden");
        }
        if (quickSelected) document.querySelector("#add_pawn_quick_select").classList.add("hidden");
        paths.forEach((path) => {
            row.appendChild(ElementCreator.createTokenElement(path).token);
        });
        this.onPlacementInfoChanged();
    }

    async onPlacementInfoChanged() {
        previewPlacementManager.clear();
        this.stopTooltip = Util.mouseActionTooltip(this.getName());
        var pawn = this.getPawnParams();
        pawn.id = this.existingPawnInfo?.id || "preview_token";
        pawn.tokenIndex = null;
        await assignTokenImagePath(pawn);
        this.selectedTokenImageIndex = pawn.tokenIndex;
        var preview = await createPawnElement(pawn);

        document.body.appendChild(preview);
        previewPlacementManager.preview(preview, false);
        previewPlacementManager.setAngle(getPawnStartingRotation(pawn, true));
    }

    show() {
        var cls = this;
        this.onPlacementInfoChanged();
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

        var missingPlayerPawns = partyArray.filter((x) => !pawns.players.find((y) => y[0].id == x.id));
        if (missingPlayerPawns.length > 0) {
            missingPlayerPawns.forEach((ele) => {
                var charName = ele.character_name;
                var btn = Util.ele("button", " button_style_transparent ", charName);
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
        $("#background_color_button_add_pawn").spectrum("set", color);
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
        if (this.stopTooltip) this.stopTooltip();
        previewPlacementManager.clear();
    }

    async addPawnHandler(e) {
        if (this.existingPawnInfo) {
            map.removePawn(map.getPawnById(this.existingPawnInfo.id));
        }
        var params = this.getPawnParams(e);
        if (params.tokenImages == null) {
            await assignTokenImagePath(params);
        }
        await generatePawns([params], !partyArray.find((x) => x.id == this.existingPawnInfo?.id));
        if (this.existingPawnInfo) {
            this.existingPawnInfo = null;
            this.pawnsSelected(null);
            this.setName("");
        }

        this.onPlacementInfoChanged();
    }

    setSize(size) {
        var idx = creaturePossibleSizes.sizes.indexOf(size.toLowerCase());
        this.sizeMenu.set(idx);
    }

    getSize() {
        return this.sizeMenu.selected();
    }

    getPawnParams(e) {
        var pawnName = document.getElementById("add_pawn_name").value;

        var sizeIndex = parseInt(this.getSize());
        var pawnSize = creaturePossibleSizes.sizes[sizeIndex];
        var dndSize = creaturePossibleSizes.hexes[sizeIndex];
        var id, darkVisionRadius;
        if (this.existingPawnInfo) {
            id = this.existingPawnInfo.id;
            darkVisionRadius = this.existingPawnInfo.darkvisionRadius;
        }
        var color = this.getColor();

        return {
            name: pawnName,
            id: id,
            darkvisionRadius: darkVisionRadius,
            size: pawnSize,
            color: color,
            bgPhoto: this.addPawnImagePaths,
            tokenImages: this.addPawnImagePaths,
            tokenIndex: this.selectedTokenImageIndex,
            deg: previewPlacementManager.getAngle(),
            spawnPoint: e
                ? {
                      x: e.clientX - (dndSize * cellSize) / 2,
                      y: e.clientY - (dndSize * cellSize) / 2,
                  }
                : null,
        };
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
        var cls = this;
        this.sizeMenu = new SlimSelect({
            select: parent,
            hideSelectedOption: true,
            onChange: (info) => {
                cls.onPlacementInfoChanged();
            },
        });
        this.sizeMenu.setData(list);

        $("#background_color_button_add_pawn").spectrum({
            preferredFormat: "rgb",
            allowEmpty: false,
            showAlpha: true,
            showInput: true,
        });
        document.querySelector("#background_color_button_add_pawn").onchange = () => cls.onPlacementInfoChanged();
    }
}

module.exports = TokenDialog;
