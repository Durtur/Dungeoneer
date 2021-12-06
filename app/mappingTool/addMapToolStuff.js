const dataAccess = require("./js/dataaccess");
const SoundManager = require("./js/soundManager");
const soundManager = new SoundManager();
var allEffects;

var editingEffectName = null;
var effectFilePath;
document.addEventListener("DOMContentLoaded", (e) => {
    $("#classlist_select").chosen({
        width: "210px",
        placeholder_text_multiple: "SFX effects"
    })
    effectFilePath = defaultEffectPath;
    dataAccess.getMapToolData(data => {
        allEffects = data.effects;
        var effectNameInput = document.getElementById("effect_name");
        var effectNames = data.effects.map(a => a.name);
        console.log(effectNames)
        new Awesomplete(effectNameInput, { list: effectNames, autoFirst: true, minChars: 0 })
        effectNameInput.select();
        effectNameInput.addEventListener("awesomplete-selectcomplete", startEditingEntry);
    });

    $("#classlist_select").on("change", previewEffectClasses);
    addSoundList();
});

async function addSoundList() {
    soundManager.initialize();
    var list = (await soundManager.getAvailableSounds()).map(x => {
        return {
            label: x.name,
            value: x.path
        }
    });
    console.log(list)
    var input = document.getElementById("sound_input");
    new Awesomplete(input, { list: list, autoFirst: true, minChars: 0 })
    input.addEventListener("awesomplete-selectcomplete", (e) => {

        input.value = e.text.label;
        input.setAttribute("data-sound", e.text.value);
        updateCurrentSound();
    });
    input.addEventListener("focusout", (e) => {
        updateCurrentSound();
    });


    var soundProfiles = Object.keys(soundManager.getSoundProfiles());
    var select = document.getElementById("sound_profile_select");
    soundProfiles.forEach(profile => {
        var ele = Util.ele("option", "", profile);
        if (profile == "normal")
            ele.selected = true;
        select.appendChild(ele);
    });
    select.addEventListener("change", (e) => {
        updateCurrentSound();
    })
    var volumeInp = document.getElementById("sound_volume");
    volumeInp.oninput = function (e) {
        var value = parseFloat(volumeInp.value);
        if (value > 1) volumeInp.value = 1;
        if (value < 0) volumeInp.value = 0;
        soundManager.globalVolume(parseFloat(volumeInp.value))
    }

}
var currentSoundId, currentSoundName;
async function updateCurrentSound() {


    var soundName = document.getElementById("sound_input").value;
    if (currentSoundName == soundName)
        return;
    currentSoundName = soundName;
    if (currentSoundId)
        soundManager.removeSound(currentSoundId);

    if (!soundName) {
        document.getElementById("sound_options_rest").classList.add("hidden");
        return;
    }
    document.getElementById("sound_options_rest").classList.remove("hidden");
    var volume = document.getElementById("sound_volume").value;
    var src = await soundManager.getSoundInfo(soundName);
    if(!src){
        document.getElementById("sound_input").value = null;
        document.getElementById("sound_options_rest").classList.add("hidden");
    }else{
     
        currentSoundId = soundManager.addGlobalSound(src.path, parseFloat(volume));
    }


}

function previewEffectClasses() {
    var classes = $("#classlist_select").val().join(" ");
    var allTokens = document.querySelectorAll(".token");
    var lightClass = document.querySelector("#isLightEffect").checked ? " light_effect " : "";
    allTokens.forEach(token => token.className = "token " + lightClass + classes);
}

function startEditingEntry() {
    var entryName = document.getElementById("effect_name").value;
    document.getElementById("deleteButton").classList.remove("hidden");
    editingEffectName = entryName;
    document.getElementById("editing_header").innerText = "Editing " + entryName;

    var entryObj = allEffects.filter(x => x.name == entryName)[0];
    document.getElementById("isLightEffect").checked = entryObj.isLightEffect;
    var classListSelect = $("#classlist_select");
    classListSelect.val(entryObj.classes);
    classListSelect.trigger('chosen:updated');
    var tokenCont = document.getElementById("effect_token_container");
    while (tokenCont.firstChild)
        tokenCont.removeChild(tokenCont.firstChild);
    entryObj.filePaths.forEach(pathStr => {
        createToken(pathModule.join(effectFilePath, pathStr).replace(/\\/g, "/"));
    });
    if (entryObj.filePaths.length == 0) {
        createToken("");
    }
    previewEffectClasses();
    if (entryObj.sound) {
        document.getElementById("sound_input").value = entryObj.sound.src;
        var select = document.getElementById("sound_profile_select");
        [...select.options].forEach(option => {
            if (option.innerText.toLowerCase() == entryObj.sound.distance.toLowerCase())
                option.selected = true;
        })
        if (entryObj.sound.volume)
            document.getElementById("sound_volume").value = entryObj.sound.volume;
     
    }else{
        document.getElementById("sound_input").value = null;
    }
    updateCurrentSound();
}
function addArtToEffect() {
    var imagePaths = window.dialog.showOpenDialogSync( {
        properties: ['openFile', 'multiSelections'],
        message: "Choose picture location",
        filters: [{ name: 'Images', extensions: ['png', "jpg", "gif"] }]
    });
    if (!imagePaths) return;

    var tokens = document.querySelectorAll(".token");
    if (tokens.length == 1 && (tokens[0].getAttribute("data-file_path") == null || tokens[0].getAttribute("data-file_path") == ""))
        tokens[0].parentNode.removeChild(tokens[0]);

    imagePaths.forEach(path => {
        createToken(path.replace(/\\/g, "/"), true);
    });
    previewEffectClasses();
}
var tokenRemoveQueue = [];
function createToken(pathStr, newToken) {
    console.log(pathStr)
    var token = document.createElement("div");
    token.classList.add("token");
    token.setAttribute("data-file_path", pathStr);
    if (newToken) token.setAttribute("data-new_token", "true");
    if (pathStr != "" && pathStr != null) token.style.backgroundImage = "url('" + pathStr + "')";
    if (pathStr != "") {
        token.addEventListener("click", function (e) {
            var isNewToken = e.target.getAttribute("data-new_token");
            if (!isNewToken) {
                var tokenToRemove = e.target.getAttribute("data-file_path");
                tokenRemoveQueue.push(tokenToRemove);

            }
            e.target.parentNode.removeChild(e.target);
        });
    }

    document.getElementById("effect_token_container").appendChild(token);
}

function deleteEffect() {
    var exists = allEffects.filter(x => x.name == editingEffectName)[0];
    if (!exists || !window.confirm(editingEffectName + " will be permanently removed."))
        return;
    tokenRemoveQueue.concat(exists.filePaths.map(x => pathModule.join(effectFilePath, x)));
    commitTokenDelete();
    allEffects = allEffects.filter(x => x != exists);
    commitSave(() => closeWindow(editingEffectName + " successfully deleted"));
}

function commitTokenDelete() {
    while (tokenRemoveQueue.length > 0) {
        fs.unlink(tokenRemoveQueue.pop(), (err) => {
            if (err) console.log(err); //IS ok
        });
    }
}
function saveEffect() {
    validateFolderExists();
    var effectName = document.getElementById("effect_name").value;
    var exists = allEffects.filter(x => x.name == effectName)[0];

    var editObject = exists ? exists : { name: effectName };
    var hasSameNameAsBefore = editingEffectName === effectName;
    if (exists && !hasSameNameAsBefore) {
        if (!window.confirm(effectName + " already exists. Do you wish to overwrite?"))
            return;
        if (editObject && editObject.filePaths)
            tokenRemoveQueue.concat(editObject.filePaths.map(x => pathModule.join(effectFilePath, x)));
    }
    allEffects = allEffects.filter(x => x != editObject);
    commitTokenDelete();
    editObject.classes = $("#classlist_select").val();
    var allPaths = [...document.querySelectorAll(".token")].map(x => x.getAttribute("data-file_path")).filter(p => p != "" && p != null);
    var pathArr = [];
    for (var i = 0; i < allPaths.length; i++) {
        var currPath = allPaths[i];
        var fileEnding = currPath.substring(currPath.length - 4)
        var newPath = pathModule.join(effectFilePath, effectName + i + fileEnding).replace(/\\/g, "/");
        if (currPath != newPath)
            fs.createReadStream(currPath).pipe(fs.createWriteStream(newPath));
        pathArr.push(effectName + i + fileEnding);
    }
    editObject.filePaths = pathArr;
    editObject.isLightEffect = document.getElementById("isLightEffect").checked;
    var soundName = document.getElementById("sound_input").value;
    if (soundName) {
        var select = document.getElementById("sound_profile_select");
        var profile = select.options[select.selectedIndex].value;
        var volume = document.getElementById("sound_volume").value || 1;
        editObject.sound = {
            src: soundName,
            distance: profile,
            volume: parseFloat(volume)
        }
    }
    console.log(editObject);
    allEffects.push(editObject);
    commitSave(() => closeWindow(editingEffectName ? editingEffectName + " successfully edited" : effectName + " successfully added"));
}
function commitSave(callback) {
    dataAccess.getMapToolData(data => {
        data.effects = allEffects;
        dataAccess.setMapToolData(data, function () {
            window.api.messageWindow('maptoolWindow', 'notify-effects-changed')
            if (callback) callback();
        });
    })
}

function validateFolderExists() {
    if (!fs.existsSync(effectFilePath))
        fs.mkdirSync(effectFilePath, { recursive: true });
}

function closeWindow(msg) {
    if (msg) {
        $('.success_message').finish().fadeIn("fast").delay(2500).fadeOut("slow");
        document.getElementById("close_message").innerText = msg;
        window.setTimeout(function () {
            window.close();
        }, 2500)
    } else {
        window.close();
    }


}