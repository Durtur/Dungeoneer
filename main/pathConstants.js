const { app } = require("electron");
const path = require("path");

const settingsPath = path.join(app.getPath("userData"), "data", "settings");
const resourcePath = path.join(app.getPath("userData"), "data");
const tempFilePath = path.join(app.getPath("userData"), "temp");

const defaultGeneratorResourcePath = path.join(app.getAppPath(), "data", "generators");
const generatorResourcePath = path.join(app.getPath("userData"), "data", "generators");
const defaultTokenPath = path.join(app.getPath("userData"), "data", "maptool_tokens");
const defaultEffectPath = path.join(app.getPath("userData"), "data", "maptool_effects");
const maptoolLibraryFolder = path.join(app.getPath("userData"), "data", "maptool_libraries");
const conditionImagePath = path.join(app.getPath("userData"), "data", "condition_images");
const conditionResourcePath = path.join(app.getAppPath(), "app", "mappingTool", "tokens", "conditions");

class PathConstants {
    static baseUserDataFolder() {
        return path.join(app.getPath("userData"), "data");
    }
    static globalSettings() {
        return path.join(app.getPath("userData"), "data", "settings");
    }

    static moduleUserFolder() {
        return path.join(app.getPath("userData"), "data", "modules");
    }

    static modulesFolder() {
        return path.join(app.getAppPath(), "modules");
    }

    static defaultResources() {
        return path.join(app.getAppPath(), "data");
    }
}

module.exports = PathConstants;
