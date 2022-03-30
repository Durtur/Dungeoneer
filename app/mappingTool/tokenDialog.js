


const SlimSelect = require("slim-select");
const ElementCreator = require("../js/lib/elementCreator");
class TokenDialog {

    initialize() {
        this.populateSizeDropdown();
        var cls = this;
        document.getElementById("icon_load_button_add_pawn").onclick = async function () {
            var info = { name: document.getElementById("add_pawn_name").value }
            await tokenSelector.getNewTokenPaths(true, imagePaths => {
                if (imagePaths == null) return;
                cls.pawnsSelected(imagePaths);
            }, info);

        }
    }
    pawnsSelected(paths) {
        this.addPawnImagePaths = paths;
        var row = document.querySelector("#add_pawn_selected_row");
        while (row.firstChild)
            row.removeChild(row.firstChild);
        if(!paths || paths.length == 0){
            document.querySelector("#add_pawn_selected_row").classList.add("hidden");
        }else{
            document.querySelector("#add_pawn_selected_row").classList.remove("hidden");
        }
        paths.forEach(path => {
            row.appendChild(ElementCreator.createTokenElement(path));
        })

    }

    show() {
        var dialog = document.getElementById("popup_dialogue_add_pawn");
        sidebarManager.showInSideBar(dialog, () => {
            document.body.appendChild(dialog);
        });

        dialog.classList.remove("hidden");
        gridLayer.style.cursor = "copy";
        document.getElementById("add_pawn_name").focus();
        var cls = this;
        gridLayer.onmousedown = function (e) {
            if (e.button == 0) {
                cls.addPawnHandler(e);
            } else {
                cls.close();
            }
        }
    }

    close() {
        var dialog = document.getElementById("popup_dialogue_add_pawn");
        dialog.classList.add("hidden");
        sidebarManager.close();
        pauseAlternativeKeyboardMoveMap = false;
        resetGridLayer();
        gridLayer.style.cursor = "auto";
    }


    addPawnHandler(e) {


        var pawnName = document.getElementById("add_pawn_name").value;

        var sizeIndex = parseInt(this.sizeMenu.selected());
        console.log(sizeIndex)
        console.log(this.sizeMenu.selected())

        var pawnSize = creaturePossibleSizes.sizes[sizeIndex];
        var dndSize = creaturePossibleSizes.hexes[sizeIndex];

        var color = document.getElementById("background_color_button_add_pawn").value;

        generatePawns([{
            name: pawnName,
            size: pawnSize,
            color: color,
            bgPhoto: this.addPawnImagePaths

        }], true,
            { x: e.clientX - (dndSize * cellSize) / 2, y: e.clientY - (dndSize * cellSize) / 2 })

        notifyTokenAdded(lastIndexInsertedMonsters, pawnName)
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