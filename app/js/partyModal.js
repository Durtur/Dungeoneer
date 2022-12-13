const TokenSelector = require("./tokenSelector");
const tokenSelector = new TokenSelector();
const partyModal = (function () {
    const rowTemplate = $(".pcRow:nth-child(1)").clone();

    function addRow() {
        var row = rowTemplate.clone();
        var id = uniqueID();
        row.attr("data-char_id", id);
        row.attr("data-token_to_save", null);

        var tokenEle = row[0].querySelector(".pc_input_character_token");
        tokenEle.onclick = pickPlayerToken;

        tokenEle.src = tokenSelector.defaultHeroTokenUrl(id, true);
     
        window.setTimeout(() => {
            var colorInput = row[0].querySelector(".pc_input_background_color");
            colorInput.value = Util.randomHexColor();
        }, 150);

        var linkButton = row[0].querySelector(".link_button");
        linkButton.setAttribute("data-linked", "false");
        linkButton.onclick = (e) => {
            showCharacterLinkModal(e.target);
        };

        row.appendTo("#party--stats");

        var changePartyButton = row[0].getElementsByClassName("change_party_button")[0];
        changePartyButton.onclick = changePartyHandler;

        if (settings.current_party != "Any") {
            row.attr("data-pc_party", settings.current_party);
        } else {
            row.attr("data-pc_party", "");
            changePartyButton.classList.add("no_party_loaded");
        }

        [...row[0].getElementsByTagName("input")].forEach((input) => (input.value = ""));
        row[0].getElementsByClassName("pc_input_player_name")[0].focus();
        row[0].classList.remove("hidden");

        addRemoveHandlersPopupPCStats();
        addColorPickerHandlers();
    }

    function addColorPickerHandlers() {
        var rows = document.querySelectorAll(".pc_input_background_color");
        rows.forEach((row) => {
            row.onchange = function (evt) {
                console.log(evt.target.value);
            };
        });
    }

    function pickPlayerToken(evt) {
        var row = evt.target.closest(".pcRow");

        tokenSelector.getNewTokenPaths(false, (path) => {
            if (!path) return;
            row.setAttribute("data-token_to_save", path);
            evt.target.setAttribute("src", path);
        });
    }

    function showCharacterLinkModal(linkButton) {
        var modalCreate = Modals.createModal("Add character source", (result) => {});
        var modal = modalCreate.modal;
        var dndBeyondButton = Util.ele("button", " button_style margin padding", "DnDBeyond");
        modal.appendChild(dndBeyondButton);

        dndBeyondButton.onclick = (e) => {
            modal.close();
            Modals.prompt("Character URL", "Enter the public URL for your DnDBeyond character:", (value) => {
                //Break if user cancels
                if (!value) return;
                dndBeyondImporter.getCharacter(value, function (character, errorCode) {
                    console.log(character);

                    if (errorCode || !character) {
                        console.error("Error contacting DnDBeyond", errorCode);
                        Util.showFailedMessage(`${errorCode || ""}: Character retrieval failed`);
                        return;
                    }
                    console.log(linkButton);
                    linkButton.setAttribute("data-linked", "true");
                    linkButton.setAttribute("data-link-url", value);
                    linkButton.setAttribute("data-link-url-type", "dnd_beyond");
                    var row = linkButton.closest(".pcRow");

                    ["character_name", "dexterity", "perception", "level", "ac", "darkvision"].forEach((field) => {
                        row.querySelector(`.pc_input_${field}`).value = character[field] == null ? "" : character[field];
                    });
                });
            });
        };
        if (linkButton.getAttribute("data-linked") == "true") {
            var removeButton = Util.ele("button", " button_style  padding red", "Remove");
            modal.appendChild(removeButton);
            removeButton.onclick = (e) => {
                modal.close();

                linkButton.setAttribute("data-linked", "false");
                linkButton.setAttribute("data-link-url", null);
                linkButton.setAttribute("data-link-url-type", null);
            };
        }
        document.body.appendChild(modalCreate.parent);
    }

    function show() {
        $(".pcRow").not(":first").remove(); //Clear html to default
        dataAccess.getParty(function (data) {
            var members = data && data.members ? data.members : [];
            var parties = ["Any"];
            partyInformationList.parties = [];
            $(".pcRow").attr("data-char_id", null);
            for (var i = 0; i < members.length - 1; i++) {
                var row = $(".pcRow:nth-child(1)").clone();
                row.appendTo("#party--stats");
            }

            var tokenPhotos = document.getElementsByClassName("pc_input_character_token");
            [...tokenPhotos].forEach((token) => (token.onclick = pickPlayerToken));
            var allRows = [...document.getElementsByClassName("pcRow")];
            var index = 0;
            if (members.length > 0) {
                allRows.forEach((row) => {
                    ["player_name", "character_name", "dexterity", "perception", "level", "ac", "alternative_ac", "darkvision", "notes"].forEach((field) => {
                        row.getElementsByClassName("pc_input_" + field)[0].value = members[index][field];
                    });
                    var pMember = members[index];
                    var token = dataAccess.getTokenPathSync(pMember.id) || tokenSelector.defaultHeroTokenUrl(pMember.id, true);
                    var linkButton = row.querySelector(".link_button");

                    if (pMember.external_source) {
                        linkButton.setAttribute("data-linked", "true");
                        linkButton.setAttribute("data-link-url-type", pMember.external_source.type);
                        linkButton.setAttribute("data-link-url", pMember.external_source.url);
                    } else {
                        linkButton.setAttribute("data-linked", "false");
                    }
                    linkButton.onclick = (e) => {
                        showCharacterLinkModal(e.target);
                    };
                    row.getElementsByClassName("pc_input_character_token")[0].setAttribute("src", token);
                    if (pMember.party && parties.indexOf(pMember.party) < 0) {
                        partyInformationList.parties.push(pMember.party);
                        parties.push(pMember.party);
                    } else if (!pMember.party) {
                        row.getElementsByClassName("change_party_button")[0].classList.add("no_party_loaded");
                    }
                    row.setAttribute("data-pc_party", members[index].party);
                    row.setAttribute("data-char_id", members[index].id);
                    row.getElementsByClassName("checkbox_party_menu")[0].checked = members[index].active;
                    row.querySelector(".pc_input_background_color").value = members[index].color;
                    index++;
                });
            }

            addRemoveHandlersPopupPCStats();
            addColorPickerHandlers();
            var pcInput = document.getElementById("active_party_input");
            pcInput.value = settings.current_party ? settings.current_party : "Any";
            if (partyInputAwesomeplete) partyInputAwesomeplete.destroy();
            partyInputAwesomeplete = new Awesomplete(pcInput, { list: parties, autoFirst: true, minChars: 0 });
            filterPcRowsBySelectedParty(true);
            var changePartyButtons = [...document.getElementsByClassName("change_party_button")];
            changePartyButtons.forEach((button) => {
                button.onclick = changePartyHandler;
            });
        });
    }

    function hideAllFloatingInputs() {
        var floats = document.getElementsByClassName("floating_input");
        [...floats].forEach((fl) => {
            if (fl.awesomplete) fl.awesomplete.destroy();
            if (fl.parentNode) fl.parentNode.removeChild(fl);
        });
    }

    function changePartyHandler(evt) {
        var newInp = document.createElement("input");
        var newDiv = document.createElement("div");
        newInp.placeholder = "Party name";
        newDiv.classList.add("floating_input");
        newDiv.appendChild(newInp);
        newInp.classList.add("brown_input");
        document.body.appendChild(newDiv);

        newInp.awesomplete = new Awesomplete(newInp, { list: partyInformationList.parties, autoFirst: true, minChars: 0 });
        newInp.addEventListener("awesomplete-selectcomplete", (e) => {
            changePartyHandlerHelper(evt);
        });
        newInp.focus();
        newInp.addEventListener("keydown", (e) => {
            if (e.keyCode == 13) {
                changePartyHandlerHelper(evt);
            }
        });
        var mouseLeaveTimer;
        newInp.onfocus = (e) => {
            window.clearTimeout(mouseLeaveTimer);
        };
        newInp.onfocusout = (e) => {
            mouseLeaveTimer = window.setTimeout(() => {
                $(".floating_input").fadeOut(400);
                mouseLeaveTimer = window.setTimeout(() => hideAllFloatingInputs(), 400);
            }, 600);
        };

        newDiv.style.left = evt.clientX - newDiv.clientWidth / 2 + "px";
        newDiv.style.top = evt.clientY - newDiv.clientHeight / 2 + "px";

        function changePartyHandlerHelper(evt) {
            evt.target.parentNode.setAttribute("data-pc_party", newInp.value);
            if (partyInformationList.parties.indexOf(newInp.value) < 0) {
                partyInformationList.parties.push(newInp.value);
                if (partyInputAwesomeplete) partyInputAwesomeplete.destroy();
                var parties = [...partyInformationList.parties];
                parties.push("Any");
                partyInputAwesomeplete = new Awesomplete(document.getElementById("active_party_input"), { list: parties, autoFirst: true, minChars: 0 });
            }

            evt.target.parentNode.getElementsByClassName("change_party_button")[0].classList.remove("no_party_loaded");
            saveParty(false, true);
            var currentParty = document.querySelector("#active_party_input").value;
            if (currentParty != "Any" && currentParty != "" && currentParty != newInp.value.value) {
                evt.target.parentNode.classList.add("hidden");
            }
            hideAllFloatingInputs();
        }
    }

    function saveParty(showWarnings, dontClose) {
        dataAccess.getParty((party) => {
            var allRows = document.getElementsByClassName("pcRow");

            var tempArr = [];
            var pcObject;
            [...allRows].forEach((row) => {
                if (row.getElementsByClassName("pc_input_character_name")[0].value == "") {
                    if (!showWarnings) return;
                    row.getElementsByClassName("pc_input_character_name")[0].classList.add("required_field");
                    if (row.getAttribute("data-pc_party") != document.getElementById("active_party_input").value) {
                        document.getElementById("active_party_input").value = "Any";
                        filterPcRowsBySelectedParty();
                    }

                    window.setTimeout(function () {
                        row.getElementsByClassName("pc_input_character_name")[0].classList.remove("required_field");
                    }, 3000);
                    return;
                }

                var charId = row.getAttribute("data-char_id");
                pcObject = {};
                if (!charId) {
                    charId = uniqueID();
                } else {
                    pcObject = party.members.find((x) => x.id == charId);
                    if (!pcObject) pcObject = {};
                }

                ["player_name", "character_name", "dexterity", "perception", "level", "ac", "alternative_ac", "darkvision", "notes"].forEach((field) => {
                    pcObject[field] = row.getElementsByClassName("pc_input_" + field)[0].value;
                });
                pcObject.active = row.getElementsByClassName("checkbox_party_menu")[0].checked;
                pcObject.color = row.querySelector(".pc_input_background_color").value;
                pcObject.party = row.getAttribute("data-pc_party");
                var linkBtn = row.querySelector(".link_button");
                var linkUrl = linkBtn.getAttribute("data-link-url");
                pcObject.external_source = linkUrl ? { url: linkUrl, type: linkBtn.getAttribute("data-link-url-type") } : null;
                if (parseInt(pcObject.level) <= 0) pcObject.level = "1";
                tempArr.push(pcObject);

                var saveTokenPath = row.getAttribute("data-token_to_save");
                if (saveTokenPath) dataAccess.saveToken(charId, saveTokenPath);
                pcObject.id = charId;
            });
            if (tempArr.length < allRows.length) return;
            partyArray = tempArr;
            partyArray.sort(function (a, b) {
                if (a.player_name > b.player_name) return 1;
                if (b.player_name > a.player_name) return -1;
                return 0;
            });

            var obj = { members: partyArray, partyInfo: partyInformationList };
            console.log("Saving party ", obj);
            if (dontClose) return;
            $('[data-popup="' + "popup-1" + '"]').fadeOut(350);
            dataAccess.setParty(obj, function (data) {
                loadParty();
            });
        });
    }

    return {
        show: show,
        saveParty: saveParty,
        addRow: addRow,
    };
})();
module.exports = partyModal;
