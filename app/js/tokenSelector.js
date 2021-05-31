const dataaccess = require("./dataaccess");
const dataAccess = require("./dataaccess");
const Modals = require("./modals")
const { resolve, basename } = require('path');
const { readdir } = require('fs').promises;
const util = require("./util");
class TokenSelector {

    async getNewTokenPaths(multiSelect = true, callback, monsterInfo) {
        var cls = this;
        this.callback = callback;
        this.monsterInfo = monsterInfo;
        this.multiSelect = multiSelect;
        this.removeQueue = [];
        var title = `Select token${(this.multiSelect ? "s" : "")}${(this.monsterInfo?.name ? ` for ${this.monsterInfo.name}` : "")}`;
        this.done = (result) => {

            this.removeQueue.forEach(ele => {
                document.removeEventListener(ele.list, ele.func)
            });
            this.modal?.close();
            this.hidePreview();
            callback(result)
        }
        dataAccess.getSettings(settings => {
            var modal = Modals.createModal(title, cls.done);
            cls.modal = modal;
            if (!settings.tokenFolder) {
                cls._createNoTokenFolder(modal);
            } else {
                cls.tokenFolder = settings.tokenFolder;
                cls._showTokenModal(modal);
            }


            document.body.appendChild(modal);
        });


    }

    async _showTokenModal(modal) {
        if (modal.container)
            modal.removeChild(modal.container);

        var cls = this;

        var files = await getFiles(this.tokenFolder);
        files = files.filter(x => util.isImage(x));
        var suggestedTokenContainer = document.createElement("div");
        suggestedTokenContainer.classList = "row_wrap token_selector_suggested"

        var suggestedTokenContainerParent = document.createElement("div");
        suggestedTokenContainerParent.appendChild(createLabel(`Matching '${this.monsterInfo?.name}'`));
        suggestedTokenContainerParent.appendChild(suggestedTokenContainer);
        suggestedTokenContainerParent.style.position = "relative";
        var suggestedTokenTypeContainer = document.createElement("div");
        suggestedTokenTypeContainer.classList = "row_wrap token_selector_suggested";

        var suggestedTokenTypeContainerParent = document.createElement("div");
        suggestedTokenTypeContainerParent.style.position = "relative";
        suggestedTokenTypeContainerParent.appendChild(createLabel(`Matching '${this.monsterInfo?.type}'`));
        suggestedTokenTypeContainerParent.appendChild(suggestedTokenTypeContainer);

        var restContainer = document.createElement("div");
        restContainer.classList = "row_wrap token_selector_rest"
        document.addEventListener("keydown", showPrevewOnKeyDown);
        this.removeQueue.push({ list: "keydown", func: showPrevewOnKeyDown });

        var buttonContainer = document.createElement("div");
        var buttonContainerParent = util.ele("div", "row space_between");
        buttonContainer.classList = "row flex_end";
        var btn = document.createElement("button");
        btn.classList = "button_base button_style green";
        btn.innerHTML = "Select";
        btn.style.maxHeight = "3em";
        btn.onclick = () => {
            var selectedImg = [...modal.querySelectorAll(".modal_token_node_selected")];
            if (selectedImg.length == 0) cls.done(null);
            var paths = selectedImg.map(x => x.getAttribute("data-path"));
            cls.done(paths);
        }

        
        var searchInp = util.ele("input", "list_search_style token_search_input");
        buttonContainerParent.appendChild(searchInp);
        buttonContainerParent.appendChild(buttonContainer);

        var tokenSelectionText = document.createElement("p");
        tokenSelectionText.style.margin = "1em";
        buttonContainer.appendChild(tokenSelectionText);
        buttonContainer.appendChild(btn);
        var info = document.createElement("div");
        info.innerHTML = "CTRL hover to enlarge";
        info.style.position = "absolute";
        info.style.left = "0px",
            info.style.top = "0px"
        info.classList = "button_base button_style_transparent";
        modal.appendChild(info);

        var suggestedFiles = [];
        var nameFiltered, typeFiltered;
        if (this.monsterInfo) {
            var monName = this.monsterInfo?.name?.toLowerCase();
            if (monName) {

                var monsplt = monName.split(" ");
                suggestedFiles = files.filter(x => {
                    var fileName = basename(x).deserialize().toLowerCase();
                    return monsplt.find(x => fileName.includes(x));

                });
                nameFiltered = suggestedFiles.length > 0;
                suggestedFiles.forEach(async (path) => {
                    suggestedTokenContainer.appendChild(await createTokenNode(path));
                })

                files = files.filter(x => !suggestedFiles.includes(x));
            }
            var monType = this.monsterInfo?.type?.toLowerCase();
            if (monType) {
                suggestedFiles = await filterType(files);
                suggestedFiles.forEach(async (path) => {
                    suggestedTokenTypeContainer.appendChild(await createTokenNode(path));
                })
                files = files.filter(x => !suggestedFiles.includes(x));
                typeFiltered = suggestedFiles.length > 0;
            }
        }

        if (nameFiltered)
            modal.appendChild(suggestedTokenContainerParent);
        if (typeFiltered)
            modal.appendChild(suggestedTokenTypeContainerParent);

        //Rest

        const scrollTakeCount = 60;

        var destroyHandler = scrollOnDemand(restContainer, files);
        
        searchInp.oninput = () => {
            window.clearTimeout(searchInp.timeout);
            searchInp.timeout = window.setTimeout(()=> {
                var inputSplt = searchInp.value.split(" ");

                var filtered = !searchInp.value ? files:  files.filter(x => {
                    var fileName = basename(x).deserialize().toLowerCase();
                    return inputSplt.find(x => fileName.includes(x));
    
                });
                destroyHandler();
                destroyHandler = scrollOnDemand(restContainer, filtered);
            },200)
   
        }
        modal.appendChild(restContainer);
        modal.appendChild(buttonContainerParent);
        function scrollOnDemand(container, masterList) {
            while (container.firstChild)
                container.removeChild(container.firstChild);
            var end = scrollTakeCount;
            var scrollEndTimeOut;
            masterList.slice(0, scrollTakeCount).forEach(async (path) => {
                container.appendChild(await createTokenNode(path));
            })
            var res = container.removeEventListener("wheel", expandOnScroll);
            console.log(res);
            container.addEventListener("wheel", expandOnScroll);
            return ()=> container.removeEventListener("wheel", expandOnScroll);;
            function expandOnScroll(e) {
                if (container.scrollTop + container.offsetHeight >= container.scrollHeight) {

                    window.clearTimeout(scrollEndTimeOut);
                    scrollEndTimeOut = window.setTimeout(() => {
                        var oldEnd = end;
                        end += scrollTakeCount;

                        masterList.slice(oldEnd, oldEnd + end).forEach(async (path) => {
                            container.appendChild(await createTokenNode(path));
                        })
                    });

                }
            }


        }

        function createLabel(text) {
            var p = document.createElement("p");
            p.innerHTML = text;
            p.classList = "modal_token_suggestion_label";
            return p;
        }

        function updateSelection() {
            var selectedImg = [...modal.querySelectorAll(".modal_token_node_selected")];
            var paths = selectedImg.map(x => x.getAttribute("data-path"));
            tokenSelectionText.innerHTML = paths.map(x => basename(x).deserialize()).join(", ");
        }


        async function filterType(files) {
            return files.filter((x) => {
                var lower = x.toLowerCase();

                return lower.includes(monType);
            });
        }


        async function createTokenNode(path) {
            var img = document.createElement("img");
            img.width = 65;
            img.classList = "token_selector_node_img";
            img.src = path;
            img.style.margin = "0.25em";
            img.setAttribute("data-path", path);
            img.title = basename(path);
            img.addEventListener("click", () => {
                var clsName = "modal_token_node_selected";
                if (img.classList.contains(clsName)) {
                    img.classList.remove(clsName)
                } else {
                    if (!cls.multiSelect) {
                        [...modal.querySelectorAll(`.${clsName}`)].forEach(m => m.classList.remove(clsName));
                    }
                    img.classList.add(clsName);
                    
                }
                updateSelection();
            });
            img.addEventListener("mouseenter", (e) => {
                cls.currentMouseOver = img;
                if (e.ctrlKey) {
                    cls.currentPreview = img;
                }
            });
            img.addEventListener("mouseout", () => cls.hidePreview());
            var div = document.createElement("div");
            div.appendChild(img);
            return div;
        }

        function showPrevewOnKeyDown(e) {

            if (e.ctrlKey && cls.currentMouseOver) {

                var y = window.innerHeight / 2;
                var x = window.innerWidth / 2;
                showPreview(cls.currentMouseOver.src, { clientX: x, clientY: y })
            }
        }

        function showPreview(path, e) {
            cls.hidePreview();
            var preview = document.createElement("div");
            preview.classList = "modal_image_preview";
            var img = document.createElement("img");
            img.src = path;
            img.width = 300;
            var title = document.createElement("h1");
            title.innerHTML = basename(path).slice(0, -4).deserialize();
            preview.appendChild(img);
            preview.appendChild(title);
            cls.imgPreview = preview;
            document.body.appendChild(preview);
            preview.style.top = e.clientY + "px";
            preview.style.left = e.clientX + "px";

        }

        async function getFiles(dir) {

            const dirents = await readdir(dir, { withFileTypes: true });
            const files = await Promise.all(dirents.map((dirent) => {
                const res = resolve(dir, dirent.name);
                return dirent.isDirectory() ? getFiles(res) : res;
            }));
            return Array.prototype.concat(...files);
        }


    }

    _createNoTokenFolder(modal) {
        var cls = this;
        var div = document.createElement("div");
        var btn = document.createElement("button");
        btn.classList = "button_base button_style";
        btn.innerHTML = "Select token folder";
        btn.onclick = () => {
            var folderPath = dialog.showOpenDialogSync(remote.getCurrentWindow(), {
                properties: ['openDirectory'],
                message: "Choose token folder location"
            });
            if (folderPath == null) return;
            folderPath = folderPath[0];
            dataaccess.getSettings(settings => {
                settings.tokenFolder = folderPath;
                dataAccess.saveSettings(settings, () => {
                    cls.tokenFolder = folderPath;
                    cls._showTokenModal(modal);
                });
            })

        }
        var title = document.createElement("h2");
        title.innerHTML = "Select your token folder";
        var p = document.createElement("p");
        p.innerHTML = "Selecting a folder where you keep all your tokens will allow Dungeoneer to suggest tokens more effectively.";
        div.appendChild(title);
        div.appendChild(p);
        div.appendChild(btn);
        modal.appendChild(div);
        modal.container = div;
    }

    hidePreview() {
        this.currentPreview = null;
        if (this.imgPreview) {
            try {
                this.imgPreview.parentNode.removeChild(this.imgPreview);
            } catch { }
        }
    }


}

module.exports = TokenSelector;