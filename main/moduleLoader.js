const fs = require("fs");
const fsE = require("fs-extra");
const path = require("path");
const module5e = require("./modules/module.5e");
const moduleCommon = require("./modules/module.common");
const PathConstants = require("./pathConstants");

class ModuleLoader {
    constructor(selectedModule) {
        this.selectedModuleName = "";
        this.selectModule(selectedModule);
    }

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
        fsE.copySync(moduleImportPath, modulePath);
    }
    
    selectModule(selectedModule) {
        this.selectedModuleName = selectedModule;
        this.module = getSelected();

        function getSelected() {
            if (selectedModule == "5e") {
                return module5e;
            }
        }
    }

    commonModule() {
        return moduleCommon;
    }

    getModule() {
        return this.module;
    }
}
module.exports = ModuleLoader;
