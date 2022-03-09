
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
        dataaccess.getSettings(globalSettings => {

            var cls = this;
            var party = (globalSettings.current_party && globalSettings.current_party != "Any") ? globalSettings.current_party : "Common library";

            if (!settings.selectedLibrary || !DEFAULT_LIBRARIES.find(x => x == settings.selectedLibrary))
                settings.selectedLibrary = party;
            console.log(globalSettings.current_party);
            [party, ...DEFAULT_LIBRARIES].forEach(library => {
                cls.createLibrary(library, library == settings.selectedLibrary)
            });
        });
    }

    generateModal() {
        while (this.container.firstChild)
            this.container.removeChild(this.container.firstChild);
        var selected = this.libraries.find(x => x.name == settings.selectedLibrary);
        var cont = util.ele("div", "map_library_maps");
        console.log(selected);
        if (selected.data == null) {
            cont.appendChild(this.createLibrarySetup(selected.name));
        }else{
            cont.appendChild(this.createLibraryUI(selected));
        }
        this.container.appendChild(cont);
    }

    createLibraryUI(library){
        console.log(library)
        var h2 = util.ele("h1", "", `${library.name} map library`);
        var cont = util.ele("div", "mosaic_layout");
        var thumbnailFolder = dataaccess.getMapLibraryThumbNailPath(library.name);
        var cls = this;
        library.data.paths.forEach(path=> {
            var img =  elementCreator.createTextOverlayImage(pathModule.join(thumbnailFolder ,pathModule.basename(path)+ ".png"),  pathModule.basename(path)) ;
            img.classList.add("map_library_tile");
            //img.appendChild(cls.createFavIcon());
            cont.appendChild(img);
            img.addEventListener("click", (e)=> {
                saveManager.loadMapFromPath(path);
                cls.modal.modal.close();
            });
        });
        var parent = util.wrapper("div", "column", h2);
        parent.appendChild(cont);
        return parent;

    }

    createFavIcon(){

    }

    createLibrarySetup(libName) {
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
            dataaccess.createLibraryFolder(libName, filePath[0], (result) => {
                console.log("DONE!");
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


    createLibrary(libName, selected) {
        var cls = this;
        dataaccess.getMapToolLibraryData(libName, libData => {
            cls.libraries.push({ name: libName, data: libData });
            if (selected)
                cls.generateModal();
        });

    }



}


module.exports = MapLibrary;