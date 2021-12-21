
var fs = require('fs');
const { ipcRenderer } = require('electron');
const { readdir, writeFile } = require('fs').promises;
const uniqueID = require('uniqid');
var pathModule = require('path');
//Refactor to preload script
window.api = {
    getPath: (arg) => { return ipcRenderer.sendSync('get-path', arg) },
    getAppPath: () => { return ipcRenderer.sendSync('app-path') },
    getAppVersion: () => { return ipcRenderer.sendSync('app-version') },
    messageWindow: (windowName, eventName, args) => { return ipcRenderer.send('notify-window', { name: windowName, event: eventName, args: args }) },
    openBrowser: (path) => { return ipcRenderer.send("open-browser", path) },
    openWindowWithArgs: (windowName, eventName, args) => { return ipcRenderer.send('notify-window', { name: windowName, event: eventName, args: args, openIfClosed: true }) },
    openExplorer: (path) => { return ipcRenderer.send("open-explorer", path) },
    path: pathModule

}
window.dialog = {
    showOpenDialogSync: (options) => { return ipcRenderer.sendSync('open-dialog', options) },
    showMessageBoxSync: (options) => { return ipcRenderer.sendSync("show-message-box", options) },
    showSaveDialogSync: (options) => { return ipcRenderer.sendSync("show-save-dialog", options) }


}




const sharp = process.platform != "linux" ? require("sharp") : {};

const settingsPath = pathModule.join(window.api.getPath("userData"), "data", "settings");
const resourcePath = pathModule.join(window.api.getPath("userData"), 'data');
const tempFilePath = pathModule.join(window.api.getPath("userData"), 'temp');
const baseTokenSize = 280;
const defaultResourcePath = pathModule.join(window.api.getAppPath(), 'data');
const defaultGeneratorResourcePath = pathModule.join(window.api.getAppPath(), "data", "generators");
const generatorResourcePath = pathModule.join(window.api.getPath("userData"), "data", "generators");
const defaultTokenPath = pathModule.join(window.api.getPath("userData"), "data", "maptool_tokens");
const defaultEffectPath = pathModule.join(window.api.getPath("userData"), "data", "maptool_effects");
const conditionImagePath = pathModule.join(window.api.getPath("userData"), "data", "condition_images");
const conditionResourcePath = pathModule.join(window.api.getAppPath(), 'app', 'mappingTool', 'tokens', 'conditions');


module.exports = function () {
    function initialize() {

        checkIfFirstTimeLoadComplete();
        getSettings(settings => {
            if (settings.theme)
                ThemeManager.initThemeFile(settings.theme);
        });
    }

    var isFirstTimeLoading = false;
    function initializeData() {
        if (isFirstTimeLoading) return;
        isFirstTimeLoading = true;
        console.log("Initalizing data...");

        var baseFolder = pathModule.join(window.api.getPath("userData"), "data");
        if (!fs.existsSync(baseFolder))
            fs.mkdirSync(baseFolder);
        loadDefaults("monsters.json");
        loadDefaults("tables.json");
        loadDefaults("conditions.json");
        loadDefaults("items.json");
        loadDefaults("randomTables.json");
        loadDefaults("spells.json");
        loadDefaults("mapToolData.json");
        loadDefaults("homebrew.json");
        loadDefaults("party.json");
        loadDefaults("encounters.json");

        if (!fs.existsSync(defaultTokenPath))
            fs.mkdirSync(defaultTokenPath);

        if (!fs.existsSync(settingsPath))
            fs.mkdirSync(settingsPath);

        if (!fs.existsSync(generatorResourcePath))
            fs.mkdirSync(generatorResourcePath);

        loadGeneratorDefaults();
        if (!fs.existsSync(defaultEffectPath))
            fs.mkdirSync(defaultEffectPath);

        if (!fs.existsSync(conditionImagePath)) {
            fs.mkdirSync(conditionImagePath);
            getConditions((conditions) => {
                conditions.forEach(condition => {
                    var condResourcePath = pathModule.join(conditionResourcePath, condition.name.toLowerCase() + ".png");
                    var condStorePath = pathModule.join(conditionImagePath, condition.name.toLowerCase() + ".png");

                    if (fs.existsSync(condResourcePath)) {
                        fs.createReadStream(condResourcePath).pipe(fs.createWriteStream(condStorePath));
                        condition.condition_background_location = condStorePath;
                    }
                });
                setConditions(conditions);
            });
        }

        isFirstTimeLoading = false;
        getHomebrewAndMonsters(function (data) {
            setMetadata(data, () => { });
        });
        function loadGeneratorDefaults() {
            ["names.json", "hook.json"].forEach(p => {
                var generatorPath = pathModule.join(generatorResourcePath, p);
                if (fs.existsSync(generatorPath)) return;
                var defaultPath = pathModule.join(defaultGeneratorResourcePath, p);
                var defaultData = fs.readFileSync(defaultPath);
                fs.writeFileSync(generatorPath, defaultData)

            });

        }
        function loadDefaults(path) {
            console.log("Loading defaults for " + path);
            var fullPath = pathModule.join(resourcePath, path);
            if (fs.existsSync(fullPath)) return;
            var defaultPath = pathModule.join(defaultResourcePath, path);
            console.log(fullPath, defaultPath)
            var defaultData = fs.readFileSync(defaultPath);
            fs.writeFileSync(fullPath, defaultData)
            console.log("Wrote " + defaultPath)
        }
    }

    async function writeTempFile(fileName, dataBuffer, callback) {
        if (!fs.existsSync(tempFilePath))
            fs.mkdirSync(tempFilePath);
        var filePath = pathModule.join(tempFilePath, fileName);
        await writeFile(filePath, dataBuffer);
        filePath = filePath.replaceAll("\\", "/");
        if (callback)
            callback(filePath);
        return filePath;
    }

    function getTags(callback) {
        baseGet("monster_metadata.json", function (data) {
            callback((data || { tags: [] }).tags)
        }, null);
    }

    function getMonsterTypes(callback) {
        baseGet("monster_metadata.json", function (data) {
            callback((data || { types: [] }).types)
        }, null);
    }
    function setMetadata(data, callback) {
        var tagSet = new Set();
        var typeSet = new Set();
        data.forEach(npc => {
            if (npc.tags)
                npc.tags.forEach(tag => tagSet.add(tag));
            if (npc.type) {
                typeSet.add(npc.type.toLowerCase());
                if (npc.subtype)
                    typeSet.add(npc.type.toLowerCase() + ` (${npc.subtype.toProperCase()})`);
            }

        });
        console.log("setting metadata");
        return baseSet("monster_metadata.json", { tags: [...tagSet], types: [...typeSet].map(x => x.toProperCase()) }, callback);
    }

    function writeAutofillData(data, callback) {
        baseSet("autofill_data.json", data, callback);
    }

    function getAutofillData(callback) {
        return baseGet("autofill_data.json", callback);
    }
    function setParty(data, callback) {
        baseSet("party.json", data, callback);
    }
    function getMonsters(callback) {
        return baseGetPredefined("monsters.json", callback);
    }
    function setMonsters(data, callback) {
        getHomebrewMonsters(hbList => {
            setMetadata(data.concat(hbList));
        });
        return baseSet("monsters.json", data, callback);
    }
    function getTables(callback) {
        return baseGet("tables.json", callback);
    }
    function setTables(data, callback) {
        return baseSet("tables.json", data, callback);
    }
    function getHomebrewMonsters(callback) {
        return baseGet("homebrew.json", callback);
    }

    function addHomebrew(dataList, overwrite, callback) {
        getHomebrewMonsters(hbData => {
            if (overwrite) {
                hbData = hbData.filter(x => !dataList.find(y => y.name == x.name));
            }
            hbData = hbData.concat(dataList);
            setHomebrewMonsters(hbData, callback);
        });
    }
    function setHomebrewMonsters(data, callback) {
        getMonsters(hbList => {
            setMetadata(data.concat(hbList));
        });
        baseSet("homebrew.json", data, callback);
    }

    function getConditions(callback) {
        return baseGet("conditions.json", callback);
    }

    function setConditions(data, callback) {
        return baseSet("conditions.json", data, callback);
    }

    function getConstantsSync() {
        var data = JSON.parse(fs.readFileSync(pathModule.join(defaultResourcePath, "constants.json")));
        data.specialAbilities = JSON.parse(fs.readFileSync(pathModule.join(defaultResourcePath, "special_abilities.json")));
        data.weapons = JSON.parse(fs.readFileSync(pathModule.join(defaultResourcePath, "weapons.json")));
        return data;
    }
    function setConstants(data, callback) {
        return baseSet("constants.json", data, callback);
    }

    function getRandomTables(callback) {
        return baseGet("randomTables.json", callback, { encounter_sets: {}, tables: {} });
    }

    function setRandomTables(data, callback) {
        return baseSet("randomTables.json", data, callback);
    }

    function getItems(callback) {
        return baseGet("items.json", callback);
    }

    function setItems(data, callback) {
        return baseSet("items.json", data, callback);
    }

    function getParty(callback) {
        return baseGet("party.json", callback);
    }

    function getSpells(callback) {
        return baseGet("spells.json", callback);
    }

    function setSpells(data, callback) {
        return baseSet("spells.json", data, callback);
    }

    function getScrolls(callback) {
        return baseGetWithFullPath(pathModule.join(generatorResourcePath, "scrolls.json"), callback);
    }

    function setScrolls(data, callback) {
        if (!fs.existsSync(generatorResourcePath))
            fs.mkdirSync(generatorResourcePath);
        return baseSetWithFullPath(pathModule.join(generatorResourcePath, "scrolls.json"), data, callback);
    }

    function getEncounters(callback) {
        return baseGet("encounters.json", callback);
    }

    function setEncounters(data, callback) {
        return baseSet("encounters.json", data, callback);
    }

    function setMapToolData(data, callback) {
        return baseSet("mapToolData.json", data, callback);
    }
    function getMapToolData(callback) {
        return baseGetPredefined("mapToolData.json", callback);
    }

    function getGeneratorData(callback) {
        return baseGetWithFullPath(pathModule.join(generatorResourcePath, "names.json"), callback, null, pathModule.join(defaultGeneratorResourcePath, "names.json"));
    }

    function setGeneratorData(data, callback) {
        if (!fs.existsSync(generatorResourcePath))
            fs.mkdirSync(generatorResourcePath);
        return baseSetWithFullPath(pathModule.join(generatorResourcePath, "names.json"), data, callback);
    }

    function getGeneratorHookData(callback) {
        return baseGetWithFullPath(pathModule.join(generatorResourcePath, "hook.json"), callback, [], pathModule.join(defaultGeneratorResourcePath, "hook.json"));
    }

    function getHomebrewAndMonsters(callback) {
        getMonsters(data => {
            getHomebrewMonsters(hbData => {
                data = data.concat(hbData);
                callback(data);
            });
        });
    }

    function setGeneratorHookData(data, callback) {
        if (!fs.existsSync(generatorResourcePath))
            fs.mkdirSync(generatorResourcePath);

        return baseSetWithFullPath(pathModule.join(generatorResourcePath, "hook.json"), data, callback);
    }

    function getSettings(callback) {
        fs.readFile(pathModule.join(settingsPath, "settings.json"), function (err, data) {
            if (err) {
                data = loadDefaultSettings();
                initializeData();
                saveSettings(data, () => { });
            } else {
                data = JSON.parse(data);
            }
            if (!data.firstLoadComplete) {
                data.firstLoadComplete = true;
                saveSettings(data);
            }
            callback(data);
        });
    }
    function getTokenPathSync(creatureId) {
        var fileEndings = [".png", ".jpg", ".gif"];
        for (var i = 0; i < fileEndings.length; i++) {
            fileEnding = fileEndings[i];
            var path = pathModule.join(defaultTokenPath, creatureId + fileEnding);
            if (fs.existsSync(path))
                return path;

        }
        return null;
    }

    async function getTokenPath(creatureId) {
        var fileEndings = [".png", ".jpg", ".gif"];
        for (var i = 0; i < fileEndings.length; i++) {
            fileEnding = fileEndings[i];
            var path = pathModule.join(defaultTokenPath, creatureId + fileEnding);
            if (fs.existsSync(path))
                return path;

        }
        return null;
    }

    async function saveToken(tokenName, currentPath, trim) {
        console.log("Saving token", tokenName, "trim:" + trim)
        var fileEnding = currentPath.substring(currentPath.lastIndexOf("."));
        var savePath = pathModule.join(defaultTokenPath, tokenName + fileEnding);
        if (process.platform == "linux") {
            fs.createReadStream(currentPath).pipe(fs.createWriteStream(pathModule.resolve(savePath)));
            return;
        }
        let buffer = await sharp(currentPath)
            .resize(
                {
                    width: baseTokenSize
                })
            .png()
            .toBuffer();
        if (trim)
            await sharp(buffer)
                .trim(0.5)
                .toFile(pathModule.resolve(savePath));
        else
            await sharp(buffer)
                .toFile(pathModule.resolve(savePath));

    }

    function saveSettings(settings, callback) {
        console.log("Saving settings")
        if (!fs.existsSync(settingsPath)) {
            fs.mkdirSync(settingsPath, { recursive: true });
        }
        return baseSetWithFullPath(pathModule.join(settingsPath, "settings.json"), settings, callback)
    }

    function baseSet(path, data, callback) {
        if (!fs.existsSync(resourcePath)) {
            fs.mkdirSync(resourcePath);
        }
        if (!fs.existsSync(pathModule.join(resourcePath, "backups")))
            fs.mkdirSync(pathModule.join(resourcePath, "backups"));
        fs.readFile(pathModule.join(resourcePath, "backups", "backupstatus.json"), function (err, backupstatusData) {
            if (err)
                backupdata = {};
            else
                try {
                    backupdata = JSON.parse(backupstatusData);
                } catch {
                    backupdata = {};
                }

            var now = new Date();
            if (backupdata[path]) {
                var lastBackedUp = new Date(backupdata[path]?.date);
                console.log(now.getDate(), lastBackedUp.getDate());
                if (now.getDate() === lastBackedUp.getDate())
                    return;

            }

            var i = 0;
            var backupDataPath = pathModule.join(resourcePath, "backups", i + path);


            while (fs.existsSync(backupDataPath)) {
                i++;
                if (i > 10) {
                    i = 0;
                    backupDataPath = pathModule.join(resourcePath, "backups", i + path);
                    break;
                }
                backupDataPath = pathModule.join(resourcePath, "backups", i + path);
            }
            backupdata[path] = { date: now.toString(), index: i };
            fs.writeFile(backupDataPath, JSON.stringify(data), (err) => { if (err) throw err });
            fs.writeFile(pathModule.join(resourcePath, "backups", "backupstatus.json"), JSON.stringify(backupdata), (err) => { if (err) throw err });

        });

        return baseSetWithFullPath(pathModule.join(resourcePath, path), data, callback);
    }

    function baseSetWithFullPath(path, data, callback) {
        fs.writeFile(path, JSON.stringify(data, null, "\t"), (err) => {
            if (err) {
                console.log("Error saving file", err)
            }
            if (callback) callback(data, err);
        });
    }

    function baseGetPredefined(path, callback, fallbackValue) {
        return baseGetWithFullPath(pathModule.join(resourcePath, path), callback, fallbackValue, pathModule.join(defaultResourcePath, path));
    }

    function baseGet(path, callback, fallbackValue) {
        return baseGetWithFullPath(pathModule.join(resourcePath, path), callback, fallbackValue);
    }

    function baseGetWithFullPath(path, callback, fallbackValue) {

        fs.readFile(path, function (err, data, fallbackPath) {

            if (err) {
                console.log("Error getting file", err, fallbackValue)

                if (fallbackPath) {
                    console.log("Falling back on ", fallbackPath)
                    fs.readFile(fallbackPath, function (err, fallbackData) {
                        if (err) throw err;
                        baseSetWithFullPath(path, JSON.parse(fallbackData), (err) => { })
                        callback(JSON.parse(fallbackData));
                    });
                } else {
                    initializeData();
                    console.error(err);
                }


            } else {

                var ret = JSON.parse(data);

                callback(ret);
            }
            if (typeof (callback) != "function") console.log("Attempted to open " + path + " without a callback function, received " + callback);
        });
    }

    function readFile(path, callback, asJson = true, nullIfDoesNotExist) {
        fs.readFile(path, "utf8", function (err, data) {
            if (err) {
                if (nullIfDoesNotExist) {
                    return callback(null);
                } else {
                    throw err;
                }
            }

            if (asJson) data = JSON.parse(data);
            callback(data);
        });
    }


    function checkIfFirstTimeLoadComplete() {
        var baseFolder = pathModule.join(window.api.getPath("userData"), "data");
        if (!fs.existsSync(baseFolder))
            initializeData();
    }

    function saveCoverImage(path) {

        var basename = pathModule.basename(path);
        var ext = pathModule.extname(basename);
        var newPath = pathModule.join(resourcePath, "cover_image" + ext);
        fs.createReadStream(path).pipe(fs.createWriteStream(newPath));
        return { name: basename, path: newPath };
    }
    async function getFiles(dir) {
        const dirents = await readdir(dir, { withFileTypes: true });
        const files = await Promise.all(dirents.map((dirent) => {
            const res = pathModule.resolve(dir, dirent.name);
            return dirent.isDirectory() ? getFiles(res) : res;
        }));
        return Array.prototype.concat(...files);
    }

    function getPersistedGeneratorData(group, callback) {
        baseGetWithFullPath(pathModule.join(generatorResourcePath, "generator_persisted.json"), (data) => {

            if (group) {
                callback(data[group]);
            } else {
                callback(data);
            }

        }, []);
    }
    function persistGeneratorData(data, group, callback) {
        var savePath = pathModule.join(generatorResourcePath, "generator_persisted.json");
        if (!fs.existsSync(generatorResourcePath))
            fs.mkdirSync(generatorResourcePath);

        if (!fs.existsSync(savePath)) {
            var saveData = {};
            saveData[group] = [];
            saveData[group].push(data)
            baseSetWithFullPath(savePath, saveData, callback);
            return;
        }

        getPersistedGeneratorData(null, saveData => {
            if (!saveData[group])
                saveData[group] = [];
            if (settings && settings.currentParty)
                data.party = settings.currentParty;
            if (data.id)
                saveData[group] = saveData[group].filter(x => x.id != data.id);
            else
                data.id = uniqueID();

            saveData[group].push(data)
            baseSetWithFullPath(savePath, saveData, callback);
        });



    }

    function deleteGeneratorPersisted(group, id, callback) {
        if (!id) return;
        var savePath = pathModule.join(generatorResourcePath, "generator_persisted.json");
        getPersistedGeneratorData(null, saveData => {
            saveData[group] = saveData[group].filter(x => x.id != id);
            baseSetWithFullPath(savePath, saveData, callback);
        });
    }

    function getScratchPad(callback) {
        var party = settings?.current_party ? settings.current_party : "";

        readFile(pathModule.join(resourcePath, party + "_scratchpad.json"), data => {
            if (data) {
                return callback(data);
            }
            readFile(pathModule.join(resourcePath, "_scratchpad.json"), globalData => {
                callback(globalData);
            }, true, true);
        }, true, true);

    }

    function setScratchPad(data) {
        var party = settings?.current_party ? settings.current_party : "";
        baseSet(party + "_scratchpad.json", data, (err) => { if (err) console.log(err) });
    }
    return {
        getFiles: getFiles,
        readFile: readFile,
        getTokenPathSync: getTokenPathSync,
        getTokenPath: getTokenPath,
        saveToken: saveToken,
        setMapToolData: setMapToolData,
        getMapToolData: getMapToolData,
        getMonsters: getMonsters,
        setMonsters: setMonsters,
        getHomebrewMonsters: getHomebrewMonsters,
        setHomebrewMonsters: setHomebrewMonsters,
        addHomebrew: addHomebrew,
        getHomebrewAndMonsters: getHomebrewAndMonsters,
        getEncounters: getEncounters,
        setEncounters: setEncounters,
        writeAutofillData: writeAutofillData,
        getConditions: getConditions,
        setConditions: setConditions,
        getItems: getItems,
        setItems: setItems,
        getScratchPad: getScratchPad,
        setScratchPad: setScratchPad,
        getSpells: getSpells,
        setSpells: setSpells,
        getSettings: getSettings,
        saveSettings: saveSettings,
        getParty: getParty,
        setParty: setParty,
        getAutofillData: getAutofillData,
        getConstantsSync: getConstantsSync,
        setConstants: setConstants,
        getRandomTables: getRandomTables,
        setRandomTables: setRandomTables,
        setGeneratorData: setGeneratorData,
        getGeneratorData: getGeneratorData,
        getGeneratorHookData: getGeneratorHookData,
        setGeneratorHookData: setGeneratorHookData,
        getScrolls: getScrolls,
        setScrolls: setScrolls,
        getTables: getTables,
        setTables: setTables,
        getTags: getTags,
        saveCoverImage: saveCoverImage,
        getMonsterTypes: getMonsterTypes,
        writeTempFile: writeTempFile,
        initialize: initialize,
        persistGeneratorData: persistGeneratorData,
        deleteGeneratorPersisted: deleteGeneratorPersisted,
        getPersistedGeneratorData: getPersistedGeneratorData,
        tokenFilePath: defaultTokenPath,
        baseTokenSize: baseTokenSize

    }
}();


