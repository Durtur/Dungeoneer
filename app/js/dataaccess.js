const { ipcRenderer } = require("electron");

const uniqueID = require("uniqid");
var pathModule = require("path");
const CONFIG = window.config.get();

const API_BASE_URL = CONFIG.api;
const TOKEN_FORMAT = "webp";
//Refactor to preload script

const sharp = require("sharp");

const settingsPath = pathModule.join(window.api.getPath("userData"), "data", "settings");
const resourcePath = pathModule.join(window.api.getPath("userData"), "data");

const baseTokenSize = 280;

const defaultGeneratorResourcePath = pathModule.join(window.api.getAppPath(), "data", "generators");
const generatorResourcePath = pathModule.join(window.api.getPath("userData"), "data", "generators");
const defaultTokenPath = pathModule.join(window.api.getPath("userData"), "data", "maptool_tokens");
const defaultEffectPath = pathModule.join(window.api.getPath("userData"), "data", "maptool_effects");

const conditionImagePath = pathModule.join(window.api.getPath("userData"), "data", "condition_images");
const conditionResourcePath = pathModule.join(window.api.getAppPath(), "app", "mappingTool", "tokens", "conditions");

module.exports = (function () {
    function initialize() {
        getSettings((settings) => {
            if (settings.theme) ThemeManager.initThemeFile(settings.theme);
        });
    }

    var isFirstTimeLoading = false;
    function initializeData() {
        if (isFirstTimeLoading) return;
        isFirstTimeLoading = true;

        // if (!fs.existsSync(conditionImagePath)) {
        //     fs.mkdirSync(conditionImagePath);
        //     getConditions((conditions) => {
        //         conditions.forEach((condition) => {
        //             var condResourcePath = pathModule.join(conditionResourcePath, condition.name.toLowerCase() + ".png");
        //             var condStorePath = pathModule.join(conditionImagePath, condition.name.toLowerCase() + ".png");

        //             if (fs.existsSync(condResourcePath)) {
        //                 fs.createReadStream(condResourcePath).pipe(fs.createWriteStream(condStorePath));
        //                 condition.condition_background_location = condStorePath;
        //             }
        //         });
        //         setConditions(conditions);
        //     });
        // }

        getHomebrewAndMonsters(function (data) {
            setMetadata(data, () => {});
        });
    }

    async function writeTempFile(fileName, dataBuffer, callback) {
        return await basePost(
            "tempFile",
            {
                fileName,
                dataBuffer,
            },
            callback
        );
    }

    function getTags(callback) {
        baseGet(
            "monster_metadata.json",
            function (data) {
                callback((data || { tags: [] }).tags);
            },
            null
        );
    }

    function getMonsterTypes(callback) {
        baseGet(
            "monster_metadata.json",
            function (data) {
                callback((data || { types: [] }).types);
            },
            null
        );
    }
    function setMetadata(data, callback) {
        var tagSet = new Set();
        var typeSet = new Set();
        data.forEach((npc) => {
            if (npc.tags) npc.tags.forEach((tag) => tagSet.add(tag));
            if (npc.type) {
                typeSet.add(npc.type.toLowerCase());
                if (npc.subtype) typeSet.add(npc.type.toLowerCase() + ` (${npc.subtype.toProperCase()})`);
            }
        });

        return baseSet("monster_metadata.json", { tags: [...tagSet], types: [...typeSet].map((x) => x.toProperCase()) }, callback);
    }

    async function writeAutofillData(data, callback) {
        return await basePost(
            "module_file",
            {
                fileName: "autofill_data.json",
                data: data,
            },
            callback
        );
        //  baseSet("autofill_data.json", data, callback);
    }

    function getAutofillData(callback) {
        return baseGet("autofill_data.json", callback);
    }
    function setParty(data, callback) {
        baseSet("party", data, callback);
    }
    function getMonsters(callback) {
        return baseGet("monsters", callback);
    }
    function setMonsters(data, callback) {
        getHomebrewMonsters((hbList) => {
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
        return baseGet("homebrew", callback);
    }

    function addHomebrew(dataList, overwrite, callback) {
        getHomebrewMonsters((hbData) => {
            if (overwrite) {
                hbData = hbData.filter((x) => !dataList.find((y) => y.name == x.name));
            }
            hbData = hbData.concat(dataList);
            setHomebrewMonsters(hbData, callback);
        });
    }
    function setHomebrewMonsters(data, callback) {
        getMonsters((hbList) => {
            setMetadata(data.concat(hbList));
        });
        baseSet("homebrew", data, callback);
    }

    function getConditions(callback) {
        return baseGet("conditions", callback);
    }

    function setConditions(data, callback) {
        return baseSet("conditions", data, callback);
    }

    function getRandomTables(callback) {
        return baseGet("randomTables", callback);
    }

    function setRandomTables(data, callback) {
        return baseSet("randomTables", data, callback);
    }

    function getItems(callback) {
        return baseGet("items", callback);
    }

    function setItems(data, callback) {
        return baseSet("items", data, callback);
    }

    function getParty(callback) {
        return baseGet("party", callback);
    }

    function getSpells(callback) {
        return baseGet("spells", callback);
    }

    function setSpells(data, callback) {
        return baseSet("spells", data, callback);
    }

    function getScrolls(callback) {
        return baseGet(`module_file?fileName=${encodeURIComponent("\\generators\\scrolls.json")}`, callback);
    }

    function setScrolls(data, callback) {
        if (!fs.existsSync(generatorResourcePath)) fs.mkdirSync(generatorResourcePath);
        return baseSetWithFullPath(pathModule.join(generatorResourcePath, "scrolls.json"), data, callback);
    }

    function getEncounters(callback) {
        return baseGet("encounters", callback);
    }

    function setEncounters(data, callback) {
        return baseSet("encounters", data, callback);
    }

    function setMapToolData(data, callback) {
        return baseSet("mapToolData.json", data, callback);
    }
    function getMapToolData(callback) {
        return baseGet("mapToolData.json", callback);
    }

    function getGeneratorData(callback) {
        return baseGetWithFullPath(pathModule.join(generatorResourcePath, "names.json"), callback, null, pathModule.join(defaultGeneratorResourcePath, "names.json"));
    }

    function setGeneratorData(data, callback) {
        if (!fs.existsSync(generatorResourcePath)) fs.mkdirSync(generatorResourcePath);
        return baseSetWithFullPath(pathModule.join(generatorResourcePath, "names.json"), data, callback);
    }

    function getGeneratorHookData(callback) {
        return baseGetWithFullPath(pathModule.join(generatorResourcePath, "hook.json"), callback, [], pathModule.join(defaultGeneratorResourcePath, "hook.json"));
    }

    function getHomebrewAndMonsters(callback) {
        getMonsters((data) => {
            getHomebrewMonsters((hbData) => {
                data = data.concat(hbData);
                callback(data);
            });
        });
    }

    function setGeneratorHookData(data, callback) {
        if (!fs.existsSync(generatorResourcePath)) fs.mkdirSync(generatorResourcePath);

        return baseSetWithFullPath(pathModule.join(generatorResourcePath, "hook.json"), data, callback);
    }

    function getSettings(callback) {
        baseGet(`${CONFIG.module.name}/settings`, callback);
    }

    function getTokenPathSync(creatureId) {
        var fileEndings = [".webp", ".png", ".jpg", ".gif"];
        for (var i = 0; i < fileEndings.length; i++) {
            fileEnding = fileEndings[i];
            var path = pathModule.join(defaultTokenPath, creatureId + fileEnding);

            if (fs.existsSync(path)) return path;
        }
        return null;
    }

    async function commitTokenSave(tokenId, allPaths, newPaths, removePaths, trim) {
        for (var i = 0; i < removePaths.length; i++) {
            fs.unlink(removePaths[i], (err) => {
                if (err) console.error(err);
            });
        }

        allPaths = allPaths.filter((x) => !removePaths.find((y) => y == x));
        allPaths.sort();
        console.log(allPaths);

        for (var i = allPaths.length - 1; i >= 0; i--) {
            var pth = allPaths[i];
            var isNew = newPaths.find((x) => x == pth);
            if (isNew) {
                console.log(tokenId + i);
                await saveToken(tokenId + i, pth);
            } else {
                await fs.renameSync(pth, getNewTokenSavePath(pth, tokenId + i));
            }
        }
    }

    async function getTokenPaths(creatureId) {
        var possiblePaths = [];
        console.log(creatureId);
        var i = 0;
        while (true) {
            var pawnPath = await getTokenPath(creatureId + i);

            if (pawnPath != null) {
                possiblePaths.push(pawnPath);
                i++;
            } else {
                break;
            }
        }
        return possiblePaths;
    }

    async function saveToken(tokenId, currentPath, trim) {
        return basePost("saveToken", { tokenId, currentPath, trim });
    }

    function saveSettings(settings, callback) {
        console.log("Saving settings");
        if (!fs.existsSync(settingsPath)) {
            fs.mkdirSync(settingsPath, { recursive: true });
        }
        return baseSetWithFullPath(pathModule.join(settingsPath, "settings.json"), settings, callback);
    }

    function baseSet(path, data, callback) {
        if (!fs.existsSync(resourcePath)) {
            fs.mkdirSync(resourcePath);
        }
        if (!fs.existsSync(pathModule.join(resourcePath, "backups"))) fs.mkdirSync(pathModule.join(resourcePath, "backups"));
        fs.readFile(pathModule.join(resourcePath, "backups", "backupstatus.json"), function (err, backupstatusData) {
            if (err) backupdata = {};
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
                if (now.getDate() === lastBackedUp.getDate()) return;
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
            fs.writeFile(backupDataPath, JSON.stringify(data), (err) => {
                if (err) throw err;
            });
            fs.writeFile(pathModule.join(resourcePath, "backups", "backupstatus.json"), JSON.stringify(backupdata), (err) => {
                if (err) throw err;
            });
        });

        return baseSetWithFullPath(pathModule.join(resourcePath, path), data, callback);
    }

    function baseSetWithFullPath(path, data, callback) {
        fs.writeFile(path, JSON.stringify(data, null, "\t"), (err) => {
            if (err) {
                console.log("Error saving file", err);
            }
            if (callback) callback(data, err);
        });
    }

    function baseGet(path, callback) {
        fetch(`${API_BASE_URL}${path}`)
            .then((response) => response.json())
            .then((data) => callback(data));
    }

    async function basePost(path, data, callback) {
        var resp = await fetch(`${API_BASE_URL}${path}`, {
            method: "POST",
            body: JSON.stringify(data),
            headers: {
                "Content-Type": "application/json",
            },
        });
        var json = resp.json();
        if (callback) callback(json);
        return json;
    }

    function openFile(path, callback, asJson = true, nullIfDoesNotExist) {
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

    async function saveCoverImage(path) {
        var res = await basePost("setCoverImage", { path: path });
        return { name: res.name, path: res.path };
    }

    async function getMapToolLibraryData(libraryName, callback) {
        await baseGetWithFullPath(
            pathModule.join(maptoolLibraryFolder, libraryName, "library_data.json"),
            (data) => {
                callback(data);
            },
            null
        );
    }

    function supportedMapTypes() {
        return ["dungeoneer_map", "dd2vtt"];
    }

    async function createLibraryFolder(libraryName, folderPath, callback, thumbnailSize) {
        await basePost("/mapLibrary/create", {
            libraryName,
            folderPath,
            thumbnailSize,
        });
        if (callback) callback();
    }

    async function saveLibraryState(libraryObject) {
        await basePost("/mapLibrary/saveState", { libraryObject });
    }

    function getPersistedGeneratorData(group, callback) {
        baseGetWithFullPath(
            pathModule.join(generatorResourcePath, "generator_persisted.json"),
            (data) => {
                if (group) {
                    callback(data[group]);
                } else {
                    callback(data);
                }
            },
            []
        );
    }
    function persistGeneratorData(data, group, callback) {
        var savePath = pathModule.join(generatorResourcePath, "generator_persisted.json");
        if (!fs.existsSync(generatorResourcePath)) fs.mkdirSync(generatorResourcePath);

        if (!fs.existsSync(savePath)) {
            var saveData = {};
            saveData[group] = [];
            saveData[group].push(data);
            baseSetWithFullPath(savePath, saveData, callback);
            return;
        }

        getPersistedGeneratorData(null, (saveData) => {
            if (!saveData[group]) saveData[group] = [];
            if (settings && settings.currentParty) data.party = settings.currentParty;
            if (data.id) saveData[group] = saveData[group].filter((x) => x.id != data.id);
            else data.id = uniqueID();

            saveData[group].push(data);
            baseSetWithFullPath(savePath, saveData, callback);
        });
    }

    function deleteGeneratorPersisted(group, id, callback) {
        if (!id) return;
        var savePath = pathModule.join(generatorResourcePath, "generator_persisted.json");
        getPersistedGeneratorData(null, (saveData) => {
            saveData[group] = saveData[group].filter((x) => x.id != id);
            baseSetWithFullPath(savePath, saveData, callback);
        });
    }

    function getScratchPad(callback) {
        var party = settings?.current_party ? settings.current_party : "";

        openFile(
            pathModule.join(resourcePath, party + "_scratchpad.json"),
            (data) => {
                if (data) {
                    return callback(data);
                }
                openFile(
                    pathModule.join(resourcePath, "_scratchpad.json"),
                    (globalData) => {
                        callback(globalData);
                    },
                    true,
                    true
                );
            },
            true,
            true
        );
    }

    function setScratchPad(data) {
        var party = settings?.current_party ? settings.current_party : "";
        baseSet(party + "_scratchpad.json", data, (err) => {
            if (err) console.log(err);
        });
    }

    async function base64(path) {
        return await basePost("fileTobase64", { path: path });
    }

    return {
        getFiles: getFiles,
        readFile: openFile,
        getTokenPathSync: getTokenPathSync,
        getTokenPaths: getTokenPaths,
        commitTokenSave: commitTokenSave,
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
        getMapToolLibraryData: getMapToolLibraryData,
        createLibraryFolder: createLibraryFolder,
        saveLibraryState: saveLibraryState,
        getMapLibraryThumbNailPath: getMapLibraryThumbNailPath,
        supportedMapTypes: supportedMapTypes,
        base64: base64,
        tokenFilePath: defaultTokenPath,
        baseTokenSize: baseTokenSize,
    };
})();
