const util = require("../js/util");

const MAX_RECENTS_LENGTH = 10;

class Recents {

    initialize(container) {
        if (!settings.recentMaps) {
            settings.recentMaps = [];
        }
        this.container = container;
        console.log(container)
        this.populate();

    }

    populate() {
        while (this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }
        var cls = this;
        settings.recentMaps.forEach(path => {
            if (!path)
                return;
            cls.container.appendChild(cls.createRecentNode(path));
        });
    }
    addToPath(path) {
        console.log(`adding ${path}`)
        if (!path) return;
        settings.recentMaps = settings.recentMaps.filter(x => x != path);
        settings.recentMaps = [path, ...settings.recentMaps];
        settings.recentMaps.length = Math.min(settings.recentMaps.length, MAX_RECENTS_LENGTH);
        saveSettings();
        this.populate();
    }
    createRecentNode(path) {

        var fileName = pathModule.basename(path);
        fileName = fileName.replace(pathModule.extname(path), "");
        var ele = util.ele("a", "button_style menu_recent_map", fileName);
        var extensionIcon = this.getIcon(pathModule.extname(path));
        if (extensionIcon) {
            ele.setAttribute("data-glyph", extensionIcon);
            ele.style.backgroundImage = `url('${extensionIcon}')`;
        }

        ele.setAttribute("data-path", path);
        ele.onclick = this.recentNodeClicked;

        var wrapper = util.wrapper("li", "", ele);
        return wrapper;

    }
    getIcon(extension) {
        return util.getFileIcon(extension);
    }

    recentNodeClicked(evt) {
        console.log(evt)
        var ele = evt.target;
        var path = ele.getAttribute("data-path");
        saveManager.loadMapFromPath(path);
    }


}

module.exports = Recents;