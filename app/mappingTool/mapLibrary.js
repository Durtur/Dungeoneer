
const pathModule = require("path");
const dataaccess = require("../js/dataaccess");
const util = require("../js/util");
const elementCreator = require("../js/lib/elementCreator");
const Modals = require("../js/modals");


const NEW_LIB_TEXT = "Select a root folder as your map library for your current party. Dungeoneer will go through the folder to find dungeoneer and dungeondraft maps to catalog, as well as image files. For best results, select a folder that only has maps and not tokens and other images."
const DEFAULT_LIBRARIES = ["Default"];
class MapLibrary {
    constructor() {
        this.libraries = [];
    }

    initialize() {
        var path = pathModule.join(defaultResourcePath, "default_library");
        dataAccess.createLibraryFolder("Default", path);
    }
    open() {
        this.modal = Modals.createModal(null, () => {
            this.close();
        });
        this.container = util.ele("div", "map_library_container");
        this.modal.modal.appendChild(this.container);
        this.container.classList.remove("hidden");
        document.body.appendChild(this.modal.parent)
        this.loadLibraries();

    }
    loadLibraries() {
        this.libraries = [];
        dataaccess.getSettings(globalSettings => {

            var cls = this;
            var party = (globalSettings.current_party && globalSettings.current_party != "Any") ? globalSettings.current_party : "Common library";

            if (!settings.selectedLibrary || !DEFAULT_LIBRARIES.find(x => x == settings.selectedLibrary))
                settings.selectedLibrary = party;

            var allLibraries = [party, ...DEFAULT_LIBRARIES];
            allLibraries.forEach(library => {
                cls.createLibrary(library, () => {
                    if (cls.libraries.length == allLibraries.length){
                        cls.libraries.sort((a,b) => a.name.localeCompare(b.name));
                        cls.generateModal();
                    }
                });
            });
        });
    }
    generateModal() {
        while (this.container.firstChild)
            this.container.removeChild(this.container.firstChild);
        var selected = this.libraries.find(x => x.name == settings.selectedLibrary);
        var cont = util.ele("div", "map_library_maps");

        cont.appendChild(this.createControlButtons());
        if (selected.data == null) {
            cont.appendChild(this.createLibrarySetup(selected.name));
        } else {
            cont.appendChild(this.createLibraryUI(selected));
        }
        this.container.appendChild(cont);
    }

    createControlButtons() {
        var div = util.ele("div", "row");
        var cls = this;
        var btnRow = util.ele("div", "row");
        this.libraries.forEach(lib => {
            console.log(lib)
            var btn = util.ele("button", "button_style toggle_button", lib.name);
            if (lib.name == settings.selectedLibrary) {
                btn.setAttribute("toggled", "true");
            } else {
                btn.setAttribute("toggled", "false");
            }
            btn.onclick = (e) => {
                settings.selectedLibrary = e.target.innerHTML;
                cls.loadLibraries();
            };
            btnRow.appendChild(btn);
        });
        div.appendChild(btnRow);
        return div;
    }

    createLibraryUI(library) {

        var h2 = util.ele("h1", "", `${library.name} map library`);
        var cont = util.ele("div", "mosaic_layout");
        var thumbnailFolder = dataaccess.getMapLibraryThumbNailPath(library.name);
        var cls = this;
        if (library.data.pinned.length > 0) {
            library.data.paths.sort((a, b) => {
                if (library.data.pinned.includes(a)) return -1;
                if (library.data.pinned.includes(b)) return 1;
                return 0;
            });
        }
        library.data.paths.forEach(path => {
            var img = elementCreator.createTextOverlayImage(pathModule.join(thumbnailFolder, pathModule.basename(path) + ".png"), pathModule.basename(path));
            img.classList.add("map_library_tile");
            img.appendChild(cls.createFavIcon(path, library));
            cont.appendChild(img);
            img.addEventListener("click", (e) => {
                if (e.target.classList.contains("map_tile_favorite_button"))
                    return;
                saveManager.loadMapFromPath(path);
                cls.modal.modal.close();
            });
        });
        var parent = util.wrapper("div", "column", h2);
        parent.appendChild(cont);
        return parent;

    }

    createFavIcon(path, library) {
        var button = util.ele("button", "map_tile_favorite_button");
        if (library.data.pinned.includes(path)) {
            button.classList.add("map_tile_favorite_button_pinned");
        }
        var cls = this;
        button.onclick = function (e) {
            e.preventDefault();
            if (button.classList.contains("map_tile_favorite_button_pinned")) {
                cls.unpin(path, library);
                button.classList.remove("map_tile_favorite_button_pinned")
            } else {
                cls.pin(path, library);
                button.classList.add("map_tile_favorite_button_pinned")
            }
        }
        return button;
    }

    pin(path, library) {
        library.data.pinned = library.data.pinned.filter(x => x != path);
        library.data.pinned.push(path);
        this.saveLibraryState(library);
    }
    unpin(path, library) {
        library.data.pinned = libary.data.pinned.filter(x => x != path);
        this.saveLibraryState(library);
    }
    saveLibraryState(library) {
        dataaccess.saveLibraryState(library.data);
    }
    createLibrarySetup(libName) {
        var h2 = util.ele("h1", "", `${libName} map library`);
        var p = util.ele("p", "", NEW_LIB_TEXT);
        var btn = util.ele("button", "button_base button_style green center", "Select library folder");
        btn.style.width = "12em";
        var cls = this;
        btn.onclick = (e) => {
            var filePath = window.dialog.showOpenDialogSync(
                {
                    properties: ['openDirectory'],
                    message: "Choose map library root folder"
                });
            if (!filePath) return;
            while (cls.container.firstChild)
                cls.container.removeChild(cls.container.firstChild);
            cls.container.appendChild(util.createLoadingEle("Creating library", "Please do not close the window"));
            dataaccess.createLibraryFolder(libName, filePath[0], (result) => {
                console.log("DONE!");
                cls.loadLibraries();
            });

        };
        var div = util.wrapper("div", "column", h2);

        div.appendChild(p);
        div.appendChild(btn);
        return div;
    }

    close() {
        this.container.classList.add("hidden");
        if (this.container.parentNode)
            this.container.parentNode.removeChild(this.container);

    }


    createLibrary(libName, callback) {
        var cls = this;
        dataaccess.getMapToolLibraryData(libName, libData => {
            cls.libraries.push({ name: libName, data: libData });
            callback();
        });

    }



}


module.exports = MapLibrary;