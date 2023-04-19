const express = require("express");
const PathConstants = require("./pathConstants");
const TokenPersister = require("./tokenPersister");
const MapLibraryManager = require("./mapLibraryManager");
const ImageUtils = require("./imageUtils");
const path = require("path");
const Settings = require("./settings");
const { writeFile, readFile } = require("fs").promises;
const Util = require("./util");

const checkApiKey = (req, res, next) => {
    next();
    // const providedKey = req.headers["x-api-key"];
    // if (!providedKey || providedKey !== apiKey) {
    //     return res.status(401).json({ error: "Unauthorized" });
    // }
    // next(req);
};

class Api {
    static start(port, modules) {
        this.app = express();
        this.app.use(checkApiKey);

        this.app.listen(port, () => {
            console.log(`Server started on port ${port}`);
        });
        this.modules = modules;
        modules.forEach((m) => this.mapModule(m));
        this.mapEndpoints();
    }

    static mapEndpoints() {
        this.app.post(`/tempfile`, async (req, res) => {
            let data = req.body;
            var result = await Util.writeTempFile(data.fileName, data.dataBuffer);
            res.send(result);
        });
        this.app.get(`/module_file`, async (req, res) => {
            console.log(req.params);
            var module = this.modules.find((x) => x.name != "common");
            var result = await readFile(PathConstants.moduleFile(module.name, req.fileName));
            res.send(JSON.parse(result));
        });

        this.app.get("/tokenPath", async (req, res) => {});

        this.app.post(`/module_file`, async (req, res) => {
            let data = req.body;
            var module = this.modules.find((x) => x.name != "common");
            var fileName = data.fileName;
            var result = await writeFile(PathConstants.moduleFile(module.name), fileName);
            res.send(result);
        });

        this.app.post("/saveToken", async (req, res) => {
            let data = req.body;
            res.send(await TokenPersister.saveToken(data.TokenId, data.currentPath, data.trim));
        });

        this.app.post("/setCoverImage", async (req, res) => {
            let data = req.body;
            var basename = pathModule.basename(data.path);
            var ext = pathModule.extname(basename);
            var newPath = path.join(PathConstants.baseUserDataFolder(), "cover_image" + ext);
            Util.copyFile(path, newPath);
            res.send({ name: basename, path: newPath });
        });

        this.app.post("/mapLibrary/create", async (req, res) => {
            let data = req.body;
            await MapLibraryManager.createLibraryFolder(
                data.libraryName,
                data.folderPath,
                () => {
                    res.send({ success: true });
                },
                data.thumbnailSize
            );
        });

        this.app.post("/toBase64", async (req, res) => {
            let data = req.body;
            await ImageUtils.toBase64(data.path);
        });

        this.app.post("/fileToBase64", async (req, res) => {
            let data = req.body;
            await Util.fileToBase64(data.path);
        });

        this.app.post("/mapLibrary/saveState", async (req, res) => {
            let data = req.body;
            res.send(await MapLibraryManager.saveLibraryState(data.libraryObject));
        });
    }

    static mapModule(module) {
        if (module.dataFiles) {
            module.dataFiles.forEach((file) => {
                this.app.get(`/${file.name}`, async (req, res) => {
                    var result = await readFile(PathConstants.moduleFile(module.name, file.fileName));
                    res.send(JSON.parse(result));
                });

                this.app.post(`/${file.name}`, (req, res) => {
                    let data = req.body;
                    res.send("Data Received: " + JSON.stringify(data));
                });
            });
        }
        this.app.get(`/settings/${module.name}`, async (req, res) => {
            var settngs = await Settings.moduleSettingsAsync(module);
            res.send(settngs);
        });
    }
}

module.exports = Api;
