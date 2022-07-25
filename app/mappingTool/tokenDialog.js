


const SlimSelect = require("slim-select");
const dataaccess = require("../js/dataaccess");
const util = require("../js/util")
const ElementCreator = require("../js/lib/elementCreator");
class TokenDialog {

    initialize() {
        this.populateSizeDropdown();
        var cls = this;
        this.dialog = document.getElementById("popup_dialogue_add_pawn");
        document.getElementById("icon_load_button_add_pawn").onclick = async function () {
            var info = { name: document.getElementById("add_pawn_name").value }
            await tokenSelector.getNewTokenPaths(true, imagePaths => {
                if (imagePaths == null) return;
                cls.pawnsSelected(imagePaths);
            }, info);

        }

        document.getElementById("add_pawn_name").oninput = async function (e) {
            var isPlayer = partyArray.find(x => x[0] == e.target.value);
            if (!isPlayer) {
                if (cls.playerTokenLoaded)
                    cls.deselectPlayerToken();
                return;
            }


            cls.selectPlayerToken(isPlayer);

        }
    }
    deselectPlayerToken() {
        this.pawnsSelected(null);
        this.pawnQueued = null;
        this.playerTokenLoaded = false;
    }

    async selectPlayerToken(player) {
        var cls = this;
        var path = await dataAccess.getTokenPath(player[2]);
        this.pawnsSelected([path]);
        this.pawnQueued = function (e) {
            cls.pawnQueued = null;
            console.log(player)
            var existing = pawns.players.find(x => x[1] == player[0]);
            console.log(existing)

            if (existing)
                map.removePawn(existing[0]);

            dataaccess.getParty(async party => {

                var ele = party.members.find(x => x.id == player[2]);
                if (!ele) return;
                await generatePawns([
                    {
                        name: ele.character_name,
                        id: ele.id,
                        size: "medium",
                        color: Util.hexToRGBA(ele.color, 0.4),
                        bgPhoto: null,
                        darkVisionRadius: ele.darkvision,
                        spawnPoint: e
                    }
                ], false);
            });
        }

    }
    pawnsSelected(paths) {
        this.addPawnImagePaths = paths;
        var row = document.querySelector("#add_pawn_selected_row");
        while (row.firstChild)
            row.removeChild(row.firstChild);
        if (!paths || paths.length == 0) {
            document.querySelector("#add_pawn_selected_row").classList.add("hidden");
        } else {
            document.querySelector("#add_pawn_selected_row").classList.remove("hidden");
        }
        paths.forEach(path => {
            row.appendChild(ElementCreator.createTokenElement(path));
        })

    }

    show() {

        var cls = this;
        sidebarManager.showInSideBar(this.dialog, () => {
            document.body.appendChild(cls.dialog);
        });

        this.dialog.classList.remove("hidden");
        gridLayer.style.cursor = "copy";
        document.getElementById("add_pawn_name").select();
        var cls = this;
        gridLayer.onmousedown = function (e) {
            if (e.button == 0) {
                cls.addPawnHandler(e);
            } else {
                cls.close();
            }
        }
        var missingPawnContainer = this.dialog.querySelector(".quick_add_pc_buttons");
        while (missingPawnContainer.firstChild)
            missingPawnContainer.removeChild(missingPawnContainer.firstChild);

        var missingPlayerPawns = partyArray.filter(x => !pawns.players.find(y => y[1] == x[0]));
        if (missingPlayerPawns.length > 0) {
            missingPlayerPawns.forEach(ele => {
                var charName = ele[0];
                var btn = util.ele("button", " button_style_transparent ", charName);
                btn.onclick = (e) => {
                    btn.parentNode.removeChild(btn);
                    var inp = document.getElementById("add_pawn_name");
                    inp.value = charName;
                    inp.oninput({ target: inp });
                }
                missingPawnContainer.appendChild(btn)
            });
        }
    }

    close() {

        this.dialog.classList.add("hidden");
        sidebarManager.close();
        pauseAlternativeKeyboardMoveMap = false;
        resetGridLayer();
        gridLayer.style.cursor = "auto";
    }


    async addPawnHandler(e) {
        if (this.pawnQueued) return this.pawnQueued(e);

        var pawnName = document.getElementById("add_pawn_name").value;

        var sizeIndex = parseInt(this.sizeMenu.selected());
        console.log(sizeIndex)
        console.log(this.sizeMenu.selected())

        var pawnSize = creaturePossibleSizes.sizes[sizeIndex];
        var dndSize = creaturePossibleSizes.hexes[sizeIndex];

        var color = document.getElementById("background_color_button_add_pawn").value;

        await generatePawns([{
            name: pawnName,
            size: pawnSize,
            color: color,
            bgPhoto: this.addPawnImagePaths,
            spawnPoint: { x: e.clientX - (dndSize * cellSize) / 2, y: e.clientY - (dndSize * cellSize) / 2 }

        }], true )
    
    }

    populateSizeDropdown() {
        var parent = document.getElementById("add_pawn_size");

        var list = creaturePossibleSizes.sizes.map(size => {
            return {
                text: size.toProperCase(),
                value: "" + creaturePossibleSizes.sizes.indexOf(size),
                selected: size == "medium"
            }
        });

        this.sizeMenu = new SlimSelect({
            select: parent,
            hideSelectedOption: true
        });
        this.sizeMenu.setData(list)

    }
}

module.exports = TokenDialog;