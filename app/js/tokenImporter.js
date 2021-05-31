const dataAccess = require("./js/dataaccess");
const dialog = require('electron').remote.dialog;
const { resolve, basename } = require('path');
const { readdir } = require('fs').promises;
const util = require("./js/util")
async function startImporting(e) {

    var filePath = dialog.showOpenDialogSync(
        remote.getCurrentWindow(), {
        properties: ['openDirectory'],
        message: "Choose token root folder"
    });
    if (!filePath || filePath.length == 0) return;
    filePath = filePath[0];
    e.target.classList.add("hidden");
    document.getElementById("expl_text").classList.add("hidden");
    var loading = document.querySelector(".loading_ele_cont");
    var loadingDetail = document.getElementById("loading_detail");
    document.getElementById("loading_title").innerHTML = "Scouring folders...";
    loading.classList.remove("hidden");
    var files = await getFiles(filePath);
    files = files.filter(x => util.isImage(x));
    console.log(files);
    var foundPaths = [];
    loadingDetail.innerHTML = "";
    document.getElementById("loading_title").innerHTML = "Playing monster match...";
    dataAccess.getHomebrewAndMonsters(async data => {
        await data.forEach(async monster => {
            if (!monster.id || await dataAccess.getTokenPath(monster.id + "0")) {
                return;
            }
            var monName = monster.name.trim().toLowerCase();
            files.forEach(filePath => {
                var fileName = basename(filePath).deserialize().toLowerCase();


                if (fileName.startsWith(monName)) {
                    var existing = foundPaths.find(x => x.monster.id == monster.id);
                    if (existing) {
                        existing.paths.push(filePath)
                    } else {
                        foundPaths.push({
                            paths: [filePath],
                            monster: { name: monster.name, id: monster.id }
                        })
                    }


                }
            });
        });
        foundPaths.sort((a, b) => {
            if (a.monster.name > b.monster.name) return 1;
            if (b.monster.name > a.monster.name) return -1;
            return 0;
        });
        createTokenElements(foundPaths);
    });

    async function getFiles(dir) {
        loadingDetail.innerHTML = dir;
        const dirents = await readdir(dir, { withFileTypes: true });
        const files = await Promise.all(dirents.map((dirent) => {
            const res = resolve(dir, dirent.name);
            return dirent.isDirectory() ? getFiles(res) : res;
        }));
        return Array.prototype.concat(...files);
    }

}

function createTokenElements(foundPaths) {
    if (foundPaths.length == 0) {
        document.getElementById("nodata_text").classList.remove("hidden");
        var loading = document.querySelector(".loading_ele_cont");
        loading.classList.add("hidden");
        return;
    }
    var parent = document.getElementById("importer_token_container");
    foundPaths.forEach(entry => {
        var cont = document.createElement("div");
        cont.classList = "row token_container";
        var lbl = document.createElement("label");
        lbl.innerHTML = entry.monster.name;
        cont.setAttribute("data-monster_id", entry.monster.id);
        cont.appendChild(lbl);
        var tokenCont = document.createElement("div");
        tokenCont.classList = "row";
        cont.appendChild(tokenCont);
        entry.paths.forEach(path => {
            tokenCont.appendChild(createImg(path));
        });
        parent.appendChild(cont);
        var loading = document.querySelector(".loading_ele_cont");
        loading.classList.add("hidden");
        document.getElementById("save_tokens_button").classList.remove("hidden");

    });

    function createImg(path) {
        var img = document.createElement("img");
        img.classList = "token";
        img.setAttribute("src", path);
        img.title = fileName(path);
        img.addEventListener("click", function (evt) {
            var parent = img.parentNode;
            parent.removeChild(img);
            if (parent.childNodes.length == 0) {
                var row = parent.closest(".token_container");
                row.parentNode.removeChild(row);
            }
        });
        return img;
    }

}

function fileName(path) {
    return path.substring(path.lastIndexOf("\\") + 1)
}


async function saveTokens() {
    document.getElementById("save_tokens_button").classList.add("hidden");
    var allEles = [...document.querySelectorAll("#importer_token_container .token_container")];

    var filePaths = [];
    allEles.forEach(row => {
        var id = row.getAttribute("data-monster_id");
        var index = 0;
        console.log(row)
        var tokens = [...row.querySelectorAll(".token")];
        tokens.forEach(token => {
            filePaths.push({
                filePath: token.getAttribute("src"),
                savePath: id + index++
            });
        });
    });


    document.querySelector(".loading_ele_cont").classList.remove("hidden");
    var loadingDetail = document.getElementById("loading_detail");
    document.getElementById("loading_title").innerHTML = "Saving tokens..."

    document.getElementById("importer_token_container").classList.add("hidden");
    for (var i = 0; i < filePaths.length; i++) {
        var path = filePaths[i];
        loadingDetail.innerHTML = path.filePath;
        await dataAccess.saveToken(path.savePath, path.filePath, true);
    }


    document.getElementById("loading_title").innerHTML = "Save successful!";
    loadingDetail.innerHTML = "";
    document.querySelector(".loading_ele_cont").classList.add("hidden");
}