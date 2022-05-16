
const pathModule = require("path");
const dataaccess = require("../js/dataaccess");
const util = require("../js/util");
const elementCreator = require("../js/lib/elementCreator");
const Modals = require("../js/modals");



const NEW_LIB_TEXT = "Select a root folder as your map library for your current party. Dungeoneer will go through the folder to find dungeoneer and dungeondraft maps to catalog, as well as image files. For best results, select a folder that only has maps and not tokens and other images."
const DEFAULT_LIBRARIES = ["Default", "Common"];
class MapLibrary {
    constructor() {
        this.libraries = [];
        this.THUMBNAIL_SIZE = 256;
    }

    initialize() {
        var path = pathModule.join(defaultResourcePath, "default_library");
        dataaccess.createLibraryFolder("Default", path, () => { }, this.THUMBNAIL_SIZE);
        this.scanLibrary("common");
        var cls = this;
        dataaccess.getSettings(globalSettings => {
            console.log(globalSettings.current_party)
            if (globalSettings.current_party && globalSettings.current_party != "Any") {
                cls.scanLibrary(globalSettings.current_party);

            }
        })
    }

    scanLibrary(libName) {
        console.log(`Scannning ${libName}`);
        dataaccess.getMapToolLibraryData(libName, libData => {
            if (libData != null && libData.rootFolder) {
                dataaccess.createLibraryFolder(libName, libData.rootFolder, () => {
                    console.log("Libary scan complete");
                }, this.THUMBNAIL_SIZE)
            }
        });
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
            var party = (globalSettings.current_party && globalSettings.current_party != "Any") ? globalSettings.current_party : null;
            var allLibraries = party ? [party, ...DEFAULT_LIBRARIES] : DEFAULT_LIBRARIES;
            if (!settings.selectedLibrary || !allLibraries.find(x => x == settings.selectedLibrary))
                settings.selectedLibrary = DEFAULT_LIBRARIES[0];

            allLibraries.forEach(library => {
                cls.createLibrary(library, () => {
                    if (cls.libraries.length == allLibraries.length) {
                        cls.libraries.sort((a, b) => a.name.localeCompare(b.name));
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

    editLibrary() {
        var selected = this.libraries.find(x => x.name == settings.selectedLibrary);
        selected.data = null;
        this.generateModal();
    }

    createControlButtons() {
        var div = util.ele("div", "row space_between");
        var cls = this;
        var btnRow = util.ele("div", "row");
        this.libraries.forEach(lib => {

            var btn = util.ele("button", "button_style toggle_button button_wide", lib.name);
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

        var searchBar = util.ele("input", "search_input");
        if (this.searchBar)
            searchBar.value = this.searchBar.value;
        this.searchBar = searchBar;
        searchBar.oninput = function (e) {
            window.clearTimeout(cls.searchTimeout);
            cls.searchTimeout = window.setTimeout(() => cls.filterResults(), 150);
        };

        var fileButton = util.ele("button", "file_button");
        fileButton.title = "Open map file"
        fileButton.onclick = () => saveManager.loadMapFileDialog(() => {
            cls.modal.modal.close();
        });
        var searchWrapper = util.wrapper("div", "row", fileButton);
        searchWrapper.appendChild(searchBar);
        div.appendChild(searchWrapper);
        window.setTimeout(() => searchBar.focus(), 450);
        return div;
    }
    filterResults() {
        while (this.mapTileContainer.firstChild)
            this.mapTileContainer.removeChild(this.mapTileContainer.firstChild);
        var library = this.selectedLibrary;
        var thumbnailFolder = dataaccess.getMapLibraryThumbNailPath(library.name);
        var cls = this;
        var searchString = this.searchBar?.value?.toLowerCase();
        var displayData = !searchString ? library.data.paths : library.data.paths.filter(x => x.includes(searchString));

        if (library.data.pinned.length > 0) {
            displayData.sort((a, b) => {
                if (library.data.pinned.includes(a)) return -1;
                if (library.data.pinned.includes(b)) return 1;
                return 0;
            });
        }

        displayData.forEach(path => {
            var thumbnailPath = pathModule.join(thumbnailFolder, pathModule.basename(path) + ".png");
            var extension = pathModule.extname(path);
            var img = elementCreator.createTextOverlayImage(thumbnailPath, pathModule.basename(path).replace(extension, ""));

            img.classList.add("map_library_tile");

            img.appendChild(cls.createFavIcon(path, library));
            img.appendChild(cls.createFileIcon(extension));
            cls.mapTileContainer.appendChild(img);
            img.addEventListener("click", (e) => {
                if (e.target.classList.contains("map_tile_favorite_button"))
                    return;
                saveManager.loadMapFromPath(path);
                cls.modal.modal.close();
            });
            var imageObj = new Image();
            imageObj.onload = () => {

                img.style.gridColumnEnd = `span ${Math.round(imageObj.width / this.THUMBNAIL_SIZE)}`;
                img.style.gridRowEnd = `span ${Math.round(imageObj.height / this.THUMBNAIL_SIZE)}`

            }
            imageObj.src = thumbnailPath;
        });
    }
    createLibraryUI(library) {
        var cls = this;
        this.selectedLibrary = library;
        var h2 = util.ele("h1", "", `${library.name} map library`);
        var editBtn = util.ele("button", "edit_button");
        editBtn.onclick = () => {
            cls.editLibrary();
        }
        if (library.name != "Default")
            h2.appendChild(editBtn);
        var cont = util.ele("div", "mosaic_layout map_tiles");
        this.mapTileContainer = cont;
        this.filterResults();
        var parent = util.wrapper("div", "column", h2);
        parent.appendChild(cont);
        return parent;

    }

    createFileIcon(extension) {
        var iconPath = util.getFileIcon(extension);
        var dd = util.ele("div", "file_icon");
        console.log(iconPath)
        if (iconPath)
            dd.style.backgroundImage = util.cssify(iconPath);
        return dd;
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
        library.data.pinned = library.data.pinned.filter(x => x != path);
        this.saveLibraryState(library);

    }
    saveLibraryState(library) {
        dataaccess.saveLibraryState(library.data);
    }
    createLibrarySetup(libName) {
        var cls = this;
        var h2 = util.ele("h1", "", `${libName} map library`);

        var p = util.ele("p", "", NEW_LIB_TEXT);
        var btn = util.ele("button", "button_base button_style green center", "Select library folder");
        btn.style.width = "12em";

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
            }, this.THUMBNAIL_SIZE);

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