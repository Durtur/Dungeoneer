const ModuleLoader = require("./moduleLoader");
const { writeFile, readFile } = require("fs").promises;
const { fs } = require("fs");
const path = require("path");
const PathConstants = require("./pathConstants");

const moduleLoader = new ModuleLoader();
class Settings {
    static async globalSettingsAsync() {
        const settingsPath = PathConstants.globalSettings();
        try {
            var file = await readFile(settingsPath);
            var json = JSON.parse(file);
            return json;
        } catch {
            await writeFile(settingsPath, JSON.stringify(this.defaultGlobalSettings()));
            return this.defaultGlobalSettings();
        }
    }

    static globalSettingsSync() {
        const settingsPath = PathConstants.globalSettings();
        try {
            var file = fs.readFileSync(settingsPath);

            var json = JSON.parse(file);
            return json;
        } catch {
            writeFile(settingsPath, JSON.stringify(this.defaultGlobalSettings()));
            return this.defaultGlobalSettings();
        }
    }

    static async moduleSettingsAsync(module) {
        const settingsPath = PathConstants.moduleSettings(module.name);
        try {
            var file = await readFile(settingsPath);
            var json = JSON.parse(file);
            return json;
        } catch {
            await writeFile(settingsPath, JSON.stringify(module.defaultSettings || {}));
            return module.defaultSettings || {};
        }
    }
    static get() {}

    static defaultGlobalSettings() {
        return {
            selectedModule: "5e",
            serverPort: 9433,
            apiPath: "http://localhost/",
            imageFilters: ["png", "gif", "jpg", "jpeg", "webp", "avif", "svg"],
        };
    }
}

module.exports = Settings;
