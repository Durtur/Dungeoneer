var fs = require("fs");
const { ipcRenderer } = require("electron");
const { readdir, writeFile, readFile } = require("fs").promises;
const uniqueID = require("uniqid");
var pathModule = require("path");
const TOKEN_FORMAT = "webp";
//Refactor to preload script
window.api = {
    getPath: (arg) => {
        return ipcRenderer.sendSync("get-path", arg);
    },
    getAppPath: () => {
        return ipcRenderer.sendSync("app-path");
    },
    getAppVersion: () => {
        return ipcRenderer.sendSync("app-version");
    },
    messageWindow: (windowName, eventName, args) => {
        return ipcRenderer.send("notify-window", { name: windowName, event: eventName, args: args });
    },
    openBrowser: (path) => {
        return ipcRenderer.send("open-browser", path);
    },
    openWindowWithArgs: (windowName, eventName, args) => {
        return ipcRenderer.send("notify-window", { name: windowName, event: eventName, args: args, openIfClosed: true });
    },
    openExplorer: (path) => {
        return ipcRenderer.send("open-explorer", path);
    },
    path: pathModule,
};
window.dialog = {
    showOpenDialogSync: (options) => {
        return ipcRenderer.sendSync("open-dialog", options);
    },
    showMessageBoxSync: (options) => {
        return ipcRenderer.sendSync("show-message-box", options);
    },
    showSaveDialogSync: (options) => {
        return ipcRenderer.sendSync("show-save-dialog", options);
    },
};

const sharp = require("sharp");

const settingsPath = pathModule.join(window.api.getPath("userData"), "data", "settings");
const resourcePath = pathModule.join(window.api.getPath("userData"), "data");
const tempFilePath = pathModule.join(window.api.getPath("userData"), "temp");
const baseTokenSize = 280;
const defaultResourcePath = pathModule.join(window.api.getAppPath(), "data");
const defaultGeneratorResourcePath = pathModule.join(window.api.getAppPath(), "data", "generators");
const generatorResourcePath = pathModule.join(window.api.getPath("userData"), "data", "generators");
const defaultTokenPath = pathModule.join(window.api.getPath("userData"), "data", "maptool_tokens");
const defaultEffectPath = pathModule.join(window.api.getPath("userData"), "data", "maptool_effects");
const maptoolLibraryFolder = pathModule.join(window.api.getPath("userData"), "data", "maptool_libraries");
const conditionImagePath = pathModule.join(window.api.getPath("userData"), "data", "condition_images");
const conditionResourcePath = pathModule.join(window.api.getAppPath(), "app", "mappingTool", "tokens", "conditions");

module.exports = (function () {
    function initialize() {
        checkIfFirstTimeLoadComplete();
        getSettings((settings) => {
            if (settings.theme) ThemeManager.initThemeFile(settings.theme);
        });
    }

    var isFirstTimeLoading = false;
    function initializeData() {
        if (isFirstTimeLoading) return;
        isFirstTimeLoading = true;
        console.log("Initalizing data...");

        var baseFolder = pathModule.join(window.api.getPath("userData"), "data");
        if (!fs.existsSync(baseFolder)) fs.mkdirSync(baseFolder);
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

        [defaultTokenPath, settingsPath, generatorResourcePath, maptoolLibraryFolder, defaultEffectPath].forEach((folder) => {
            if (!fs.existsSync(folder)) fs.mkdirSync(folder);
        });

        loadGeneratorDefaults();

        if (!fs.existsSync(conditionImagePath)) {
            fs.mkdirSync(conditionImagePath);
            getConditions((conditions) => {
                conditions.forEach((condition) => {
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
            setMetadata(data, () => {});
        });
        function loadGeneratorDefaults() {
            ["names.json", "hook.json"].forEach((p) => {
                var generatorPath = pathModule.join(generatorResourcePath, p);
                if (fs.existsSync(generatorPath)) return;
                var defaultPath = pathModule.join(defaultGeneratorResourcePath, p);
                var defaultData = fs.readFileSync(defaultPath);
                fs.writeFileSync(generatorPath, defaultData);
            });
        }
        function loadDefaults(path) {
            console.log("Loading defaults for " + path);
            var fullPath = pathModule.join(resourcePath, path);
            if (fs.existsSync(fullPath)) return;
            var defaultPath = pathModule.join(defaultResourcePath, path);
            console.log(fullPath, defaultPath);
            var defaultData = fs.readFileSync(defaultPath);
            fs.writeFileSync(fullPath, defaultData);
            console.log("Wrote " + defaultPath);
        }
    }

    async function writeTempFile(fileName, dataBuffer, callback) {
        if (!fs.existsSync(tempFilePath)) fs.mkdirSync(tempFilePath);
        var filePath = pathModule.join(tempFilePath, fileName);
        await writeFile(filePath, dataBuffer);
        filePath = filePath.replaceAll("\\", "/");
        if (callback) callback(filePath);
        return filePath;
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
        console.log("setting metadata");
        return baseSet("monster_metadata.json", { tags: [...tagSet], types: [...typeSet].map((x) => x.toProperCase()) }, callback);
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
        return baseGet("homebrew.json", callback);
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
        if (!fs.existsSync(generatorResourcePath)) fs.mkdirSync(generatorResourcePath);
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
        fs.readFile(pathModule.join(settingsPath, "settings.json"), function (err, data) {
            if (err) {
                data = loadDefaultSettings();
                initializeData();
                saveSettings(data, () => {});
            } else {
                data = JSON.parse(data);
                console.log(err, data);
            }
            if (!data.firstLoadComplete) {
                data.firstLoadComplete = true;
                saveSettings(data);
            }
            callback(data);
        });
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
                console.log(tokenId +i)
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

    async function getTokenPath(creatureId) {
        var fileEndings = [".webp", ".png", ".jpg", ".gif"];
        for (var i = 0; i < fileEndings.length; i++) {
            fileEnding = fileEndings[i];
            var path = pathModule.join(defaultTokenPath, creatureId + fileEnding);
            console.log(path);
            if (fs.existsSync(path)) return path;
        }
        return null;
    }
    function getNewTokenSavePath(currentPath, tokenId) {
        var fileEnding = currentPath.substring(currentPath.lastIndexOf("."));
        return pathModule.join(defaultTokenPath, tokenId + fileEnding);
    }

    async function saveToken(tokenId, currentPath, trim) {
        console.log("Saving token", tokenId, "trim:" + trim);
        var savePath = getNewTokenSavePath;
        currentPath, tokenId;
        savePath = pathModule.join(defaultTokenPath, tokenId + ".webp");
        let buffer = await sharp(currentPath)
            .resize({
                width: baseTokenSize,
            })
            .toFormat(TOKEN_FORMAT)
            .toBuffer();
        if (trim) await sharp(buffer).trim(0.5).toFile(pathModule.resolve(savePath));
        else await sharp(buffer).toFile(pathModule.resolve(savePath));
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

    function baseGetPredefined(path, callback, fallbackValue) {
        return baseGetWithFullPath(pathModule.join(resourcePath, path), callback, fallbackValue, pathModule.join(defaultResourcePath, path));
    }

    function baseGet(path, callback, fallbackValue) {
        return baseGetWithFullPath(pathModule.join(resourcePath, path), callback, fallbackValue);
    }

    function baseGetWithFullPath(path, callback, fallbackValue, fallbackPath) {
        fs.readFile(path, function (err, data) {
            if (err) {
                console.log("Error getting file", err, fallbackValue);

                if (fallbackPath) {
                    console.log("Falling back on ", fallbackPath);
                    fs.readFile(fallbackPath, function (err, fallbackData) {
                        if (err) throw err;
                        baseSetWithFullPath(path, JSON.parse(fallbackData), (err) => {});
                        callback(JSON.parse(fallbackData));
                    });
                } else {
                    initializeData();
                    console.error(err);
                    callback(fallbackValue);
                }
            } else {
                var ret = JSON.parse(data);
                callback(ret);
            }
            if (typeof callback != "function") console.log("Attempted to open " + path + " without a callback function, received " + callback);
        });
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

    function checkIfFirstTimeLoadComplete() {
        var baseFolder = pathModule.join(window.api.getPath("userData"), "data");
        if (!fs.existsSync(baseFolder)) initializeData();
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
        const files = await Promise.all(
            dirents.map((dirent) => {
                const res = pathModule.resolve(dir, dirent.name);
                return dirent.isDirectory() ? getFiles(res) : res;
            })
        );
        return Array.prototype.concat(...files);
    }

    function getMapToolLibraryData(libraryName, callback) {
        baseGetWithFullPath(
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

    function getMapLibraryThumbNailPath(libName) {
        var destinationFolder = pathModule.join(maptoolLibraryFolder, libName);
        var thumbnailFolder = pathModule.join(destinationFolder, "thumbnails");

        if (!fs.existsSync(destinationFolder)) fs.mkdirSync(destinationFolder);

        if (!fs.existsSync(thumbnailFolder)) fs.mkdirSync(thumbnailFolder);
        return thumbnailFolder;
    }
    async function createLibraryFolder(libraryName, folderPath, callback, thumbnailSize) {
        console.log(`Creating library ${libraryName}`);
        var files = await getFiles(folderPath);

        var destinationFolder = pathModule.join(maptoolLibraryFolder, libraryName);
        var thumbnailFolder = getMapLibraryThumbNailPath(libraryName);
        if (!fs.existsSync(maptoolLibraryFolder)) fs.mkdirSync(maptoolLibraryFolder);

        baseGetWithFullPath(
            pathModule.join(destinationFolder, "library_data.json"),
            async (data) => {
                if (data == null)
                    data = {
                        paths: [],
                        name: libraryName,
                        pinned: [],
                        rootFolder: folderPath,
                    };

                var newFiles = files.filter((x) => !data.paths.find((y) => pathModule.basename(x) == pathModule.basename(y)));
                var deletedFiles = data.paths.filter((x) => !files.find((y) => pathModule.basename(x) == pathModule.basename(y)));

                deletedFiles.forEach((x) => {
                    var thumbnailPath = pathModule.join(thumbnailFolder, `${pathModule.basename(x)}.png`);
                    fs.unlink(thumbnailPath, (err) => {
                        if (err) console.error(err);
                    });
                });

                var dungeoneerMaps = newFiles.filter((x) => [".dd2vtt", ".dungeoneer_map"].includes(pathModule.extname(x)));
                var images = newFiles.filter((x) => constants.imgFilters.includes(pathModule.extname(x).replace(".", "")));
                var libraryList = [...images, ...dungeoneerMaps];
                data.paths = data.paths.filter((x) => !deletedFiles.includes(x));
                data.paths = [...data.paths, ...libraryList];
                var workCount = dungeoneerMaps.length + images.length;
                var processedImages = 0;
                console.log("New files:");
                console.log([...images, ...dungeoneerMaps]);

                images.forEach(async (img) => {
                    await sharp(img)
                        .resize(await getMosaicDimensions(img, thumbnailSize))
                        .png()
                        .toFile(pathModule.join(thumbnailFolder, `${pathModule.basename(img)}.png`));

                    processedImages++;
                    if (processedImages == workCount) callback();
                });

                dungeoneerMaps.forEach((path) => {
                    console.log(path);
                    openFile(path, async (data) => {
                        var buffer = pathModule.extname(path) == ".dungeoneer_map" ? Buffer.from(data.foregroundBase64, "base64") : Buffer.from(data.image, "base64");
                        var dimensions = await getMosaicDimensions(buffer, thumbnailSize);
                        await sharp(buffer)
                            .resize(dimensions)
                            .png()
                            .toFile(pathModule.join(thumbnailFolder, `${pathModule.basename(path)}.png`));

                        processedImages++;
                        if (processedImages == workCount) callback();
                    });
                });
                fs.writeFileSync(pathModule.join(destinationFolder, "library_data.json"), JSON.stringify(data));
                if (workCount == 0) callback();
            },
            null
        );
    }

    async function getMosaicDimensions(img, thumbnailSize) {
        var metaData = await sharp(img).metadata();

        return {
            height: getHeight(),
            width: getWidth(),
        };

        function getWidth() {
            var returnValue = (metaData.width / metaData.height) * thumbnailSize;
            returnValue -= returnValue % thumbnailSize;
            return returnValue == 0 ? thumbnailSize : returnValue;
        }
        function getHeight() {
            var returnValue = (metaData.height / metaData.width) * thumbnailSize;
            returnValue -= returnValue % thumbnailSize;
            return returnValue == 0 ? thumbnailSize : returnValue;
        }
    }
    function saveLibraryState(libraryObject) {
        var destinationFolder = pathModule.join(maptoolLibraryFolder, libraryObject.name);
        fs.writeFileSync(pathModule.join(destinationFolder, "library_data.json"), JSON.stringify(libraryObject));
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
        var b64 = await readFile(path, { encoding: "base64" });
        return b64;
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
