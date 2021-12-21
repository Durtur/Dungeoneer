const pathModule = require("path");
const dataaccess = require("../js/dataaccess");
const Modals = require("../js/modals");


class MapLibrary {

     constructor(path, libName, container) {
        this.container = container;
        this.libraryName = libName;
        // var files = await dataaccess.getFiles(path);
        // if (!files) {
        //     this.createSetupLib();
        // }

    }

    open() {
        var modal = Modals.createModal(`Map library ${this.libraryName}`, () => {
            this.close();
        });
        modal.appendChild(this.container);
        this.container.classList.remove("hidden");
    }

    close() {
        this.container.classList.add("hidden");
        if (this.container.parentNode)
            this.container.parentNode.removeChild(this.container);

    }

    createSetupLib() {

        this.initialized = true;
    }



}


module.exports = MapLibrary;