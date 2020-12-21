
var fs = require('fs');
const remote = require('electron').remote;
const app = remote.app;

const uniqueID = require('uniqid');
var pathModule = require('path');
const sharp = require("sharp");

const settingsPath = pathModule.join(app.getPath("userData"), "data", "settings");
const resourcePath = pathModule.join(app.getPath("userData"), 'data');
const baseTokenSize = 280;
const defaultResourcePath = pathModule.join(app.getAppPath(), 'data');
const defaultGeneratorResourcePath = pathModule.join(app.getAppPath(), "data", "generators");
const generatorResourcePath = pathModule.join(app.getPath("userData"), "data", "generators");
const defaultTokenPath = pathModule.join(app.getPath("userData"), "data", "maptool_tokens");
const defaultEffectPath = pathModule.join(app.getPath("userData"), "data", "maptool_effects");
const conditionImagePath = pathModule.join(app.getPath("userData"), "data", "condition_images");
const conditionResourcePath = pathModule.join(app.getAppPath(), 'app', 'mappingTool', 'tokens', 'conditions');
module.exports = function () {

    function initializeData() {
        console.log("Initalizing data...");
        var baseFolder = pathModule.join(app.getPath("userData"), "data");
        if (!fs.existsSync(baseFolder))
            fs.mkdirSync(baseFolder);

        if (!fs.existsSync(defaultTokenPath))
            fs.mkdirSync(defaultTokenPath);

        if (!fs.existsSync(settingsPath))
            fs.mkdirSync(settingsPath);

        if (!fs.existsSync(generatorResourcePath))
            fs.mkdirSync(generatorResourcePath);

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

    }

    function getTags(callback) {
        return baseGet("npc_tags.json", callback, []);
    }
    function setTags(data, callback) {
        var tagSet = new Set();
        data.forEach(npc => {
            if (!npc.tags) return;
            npc.tags.forEach(tag => tagSet.add(tag));
        });

        return baseSet("npc_tags.json", [...tagSet], callback);
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
            setTags(data.concat(hbList));
        });
        return baseSet("monsters.json", data, callback);
    }
    function getTables(callback) {
        return baseGetPredefined("tables.json", callback);
    }
    function setTables(data, callback) {
        return baseSet("tables.json", data, callback);
    }
    function getHomebrewMonsters(callback) {
        return baseGet("homebrew.json", callback);
    }
    function setHomebrewMonsters(data, callback) {
        getMonsters(hbList => {
            setTags(data.concat(hbList));
        });
        baseSet("homebrew.json", data, callback);
    }

    function getConditions(callback) {
        return baseGetPredefined("conditions.json", callback);
    }

    function setConditions(data, callback) {
        return baseSet("conditions.json", data, callback);
    }

    function getConstantsSync() {
        return JSON.parse(fs.readFileSync(pathModule.join(defaultResourcePath, "constants.json")));
    }
    function setConstants(data, callback) {
        return baseSet("constants.json", data, callback);
    }

    function getRandomTables(callback) {
        return baseGetPredefined("randomTables.json", callback, { encounter_sets: {}, tables: {} });
    }

    function setRandomTables(data, callback) {
        return baseSet("randomTables.json", data, callback);
    }

    function getItems(callback) {
        return baseGetPredefined("items.json", callback);
    }

    function setItems(data, callback) {
        return baseSet("items.json", data, callback);
    }

    function getParty(callback) {
        return baseGet("party.json", callback, { members: [], partyInfo: { parties: [] } });
    }

    function getSpells(callback) {
        return baseGetPredefined("spells.json", callback);
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
        return baseGetWithFullPath(pathModule.join(generatorResourcePath, "names.json"), callback, [], pathModule.join(defaultGeneratorResourcePath, "names.json"));
    }

    function setGeneratorData(data, callback) {
        if (!fs.existsSync(generatorResourcePath))
            fs.mkdirSync(generatorResourcePath);
        return baseSetWithFullPath(pathModule.join(generatorResourcePath, "names.json"), data, callback);
    }

    function getGeneratorHookData(callback) {
        return baseGetWithFullPath(pathModule.join(generatorResourcePath, "hook.json"), callback, [], pathModule.join(defaultGeneratorResourcePath, "hook.json"));
    }

    function setGeneratorHookData(data, callback) {
        if (!fs.existsSync(generatorResourcePath))
            fs.mkdirSync(generatorResourcePath);

        return baseSetWithFullPath(pathModule.join(generatorResourcePath, "hook.json"), data, callback);
    }

    function getSettings(callback) {
        fs.readFile(pathModule.join(settingsPath, "settings.JSON"), function (err, data) {
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

    function getTokenPath(creatureId) {
        console.group("Getting token for  " + creatureId)
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

        let buffer = await sharp(currentPath)
            .resize(
                {
                    width: baseTokenSize,
                    height: baseTokenSize
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

    function baseGet(path, callback, fallbackValue, fallbackPath) {
        return baseGetWithFullPath(pathModule.join(resourcePath, path), callback, fallbackValue, fallbackPath);
    }

    function baseGetWithFullPath(path, callback, fallbackValue, fallbackPath) {

        fs.readFile(path, function (err, data) {

            if (err) {
                console.log("Error getting file", err, fallbackValue)

                if (fallbackPath != null) {
                    console.log("Falling back on ", fallbackPath)
                    fs.readFile(fallbackPath, function (err, fallbackData) {
                        console.log(fallbackData)
                        baseSetWithFullPath(path, JSON.parse(fallbackData), (err) => { })
                        callback(JSON.parse(fallbackData));
                    });
                } else {
                    var fallbackData = fallbackValue ? fallbackValue : [];
                    baseSetWithFullPath(path, fallbackData, (err) => { })
                    callback(fallbackData);
                }
                initializeData();

            } else {

                var ret = JSON.parse(data);

                callback(ret);
            }
            if (typeof (callback) != "function") console.log("Attempted to open " + path + " without a callback function, received " + callback);
        });
    }

    function readFile(path, callback) {
        fs.readFile(path, function (err, data) {
            if (err)
                throw err;
            callback(JSON.parse(data));
        });
    }

    return {
        readFile: readFile,
        getTokenPath: getTokenPath,
        saveToken: saveToken,
        setMapToolData: setMapToolData,
        getMapToolData: getMapToolData,
        getMonsters: getMonsters,
        setMonsters: setMonsters,
        getHomebrewMonsters: getHomebrewMonsters,
        setHomebrewMonsters: setHomebrewMonsters,
        getEncounters: getEncounters,
        setEncounters: setEncounters,
        writeAutofillData: writeAutofillData,
        getConditions: getConditions,
        setConditions: setConditions,
        getItems: getItems,
        setItems: setItems,
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
        tokenFilePath: defaultTokenPath,
        baseTokenSize: baseTokenSize,
    }
}();


