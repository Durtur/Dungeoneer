const fs = require("fs");
const fsE = require("fs-extra");
const path = require("path");
const module5e = require("./modules/module.5e");
const moduleCommon = require("./modules/module.common");
const PathConstants = require("./pathConstants");
class ModuleLoader {
    loadDefaults() {
        if (!fs.existsSync(PathConstants.baseUserDataFolder())) fs.mkdirSync(PathConstants.baseUserDataFolder());
        if (!fs.existsSync(PathConstants.moduleUserFolder())) fs.mkdirSync(PathConstants.moduleUserFolder());
        this.initializeModule(moduleCommon);
        this.initializeModule(module5e);
      
    }

    moveModule(module, newPath) {
        var modulePath = path.join(PathConstants.moduleUserFolder(), module.name);
        newPath = path.join(newPath, module.name);
        if (!fs.existsSync(modulePath)) return;
        fsE.moveSync(modulePath, newPath);
    }

    initializeModule(module) {
        var moduleImportPath = module.thirdParty ? null : path.join(PathConstants.modulesFolder(), module.name);
        var modulePath = path.join(PathConstants.moduleUserFolder(), module.name);
        if (!fs.existsSync(modulePath)) fs.mkdirSync(modulePath);
        if (module.requiredFolders) {
            module.requiredFolders.forEach((folderName) => {
                var folderPath = path.join(modulePath, folderName);
                if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath);
            });
        }
        if (module.dataFiles) {
            module.dataFiles.forEach((x) => {
                var fullPath = x.folder ? path.join(modulePath, x.folder, x.fileName) : path.join(modulePath, x.fileName);

                if (fs.existsSync(fullPath)) return;
                var fileToImport = x.folder ? path.join(moduleImportPath, x.folder, x.fileName) : path.join(moduleImportPath, x.fileName);
                var defaultData = fs.readFileSync(fileToImport);
                fs.writeFileSync(fullPath, defaultData);
            });
        }
    }

    getModule() {}
}
module.exports = ModuleLoader;
