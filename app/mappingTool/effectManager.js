const sidebarManager = require("../js/sidebarManager");
const SlimSelect = require("slim-select");

var effectManager = function () {
    var currentlyDeletingEffects = false;

    var effectData;
    var SELECTED_EFFECT_TYPE = {
        sfx: 0,
        light: 1,
        sound: 2
    };
    var currentlySelectedEffectDropdown = SELECTED_EFFECT_TYPE.sfx;
    function initialize() {

        document.getElementById("sidebar_sfx").onclick = () => selectEffectType(SELECTED_EFFECT_TYPE.sfx);
        document.getElementById("sidebar_light").onclick = () => selectEffectType(SELECTED_EFFECT_TYPE.light);
        document.getElementById("sidebar_sound").onclick = () => selectEffectType(SELECTED_EFFECT_TYPE.sound);

        document.getElementById("add_sfx_dropdown").onclick = effectDropdownChange;
        ["effect_input_width", "effect_input_height", "light_effect_input_width", "light_effect_input_height"]
            .forEach(x => document.getElementById(x).oninput = onEffectSizeChanged)

        document.getElementById("popup_menu_add_effect").addEventListener("mouseenter", function (evt) {
            if (previewPlacementElement) {
                previewPlacementElement.classList.add("invisible");
            }

        })
        document.getElementById("popup_menu_add_effect").addEventListener("mouseleave", function (evt) {
            if (previewPlacementElement) {
                previewPlacementElement.classList.remove("invisible");

            }
        });
        createEffectMenus();
    }
    var sfxSelect, lightSourceSelect, soundSelect, soundRangeSelect;
    async function createEffectMenus() {
        dataAccess.getMapToolData(data => {
            effectData = data.effects;
            sfxSelect = createMenu("add_sfx_dropdown", effectData.filter(x => !x.isLightEffect), sfxSelect);
            lightSourceSelect = createMenu("add_light_source_dropdown", effectData.filter(x => x.isLightEffect), lightSourceSelect);
            sfxSelect.onChange = (e) => {
                selectEffectType(SELECTED_EFFECT_TYPE.sfx);
                effectDropdownChange(e);
            }
            lightSourceSelect.onChange = (e) => {
                selectEffectType(SELECTED_EFFECT_TYPE.light);
                effectDropdownChange(e);
            }

        });
        var soundList = await soundManager.getAvailableSounds();
        if (!soundSelect) {
            soundSelect = createMenu("add_sound_dropdown", soundList, soundSelect, false);
        }
        soundSelect.onChange = (e) => {
            selectEffectType(SELECTED_EFFECT_TYPE.sound);
            effectDropdownChange(e);
        }
        var ranges = Object.keys(soundManager.getSoundProfiles()).map(x => { return { name: x } });

        if (!soundRangeSelect) {
            soundRangeSelect = createMenu("add_sound_spread", ranges, soundRangeSelect, false);
        }

        console.log(soundList);

        function createMenu(parentId, dataset, existingMenu, icon = true) {

            var list = dataset.map(eff => {
                return {
                    text: eff.name,
                    value: eff.name,
                    innerHTML: icon ? createIcon(eff) : null
                }
            });
            if (!existingMenu) {
                existingMenu =
                    new SlimSelect({
                        select: document.getElementById(parentId),
                        hideSelectedOption: true
                    });

            }

            existingMenu.setData(list)
            return existingMenu;
        }
        function createIcon(eff) {
            return createInMenuEffect(effectData.find(x => x.name == eff.name))
        }
    }

    function startMovingEffects(e) {
        clearPreviewPlacement();
        if (currentlySelectedEffectDropdown != null)
            selectEffectType(null);

        var priorState = e.target.getAttribute("toggled");
        if (priorState == "false") {
            if (document.getElementById("delete_effects_button").getAttribute("toggled") != "false") document.getElementById("move_effects_button").click();
            lastgridLayerCursor = gridLayer.style.cursor;
            gridLayer.style.cursor = "auto";
            gridLayer.onmousedown = function (event) {
                if (event.button == 2) {
                    var bn = document.getElementById("move_effects_button")
                    bn.click();
                }
            };
            showSoundLayer();
            effects.map(eff => {
                eff.classList.add("elevated")
                Util.makeUIElementDraggable(eff)
            })
        } else {
            gridLayer.onmousedown = generalMousedowngridLayer;
            gridLayer.style.cursor = lastgridLayerCursor;
            hideSoundLayer();
            effects.map(eff => {
                eff.classList.remove("elevated")
                eff.onmousedown = null;
            })
        }

    }

    function startDeletingEffects(e) {

        clearPreviewPlacement();
        if (currentlySelectedEffectDropdown != null)
            selectEffectType(null);
        currentlyDeletingEffects = !currentlyDeletingEffects;
        if (currentlyDeletingEffects) {
            if (document.getElementById("move_effects_button").getAttribute("toggled") != "false") document.getElementById("move_effects_button").click();
            showSoundLayer();
            gridLayer.onmousedown = function (event) {
                if (event.button == 2) {
                    var bn = document.getElementById("delete_effects_button")
                    bn.click();
                }
            };
            lastgridLayerCursor = gridLayer.style.cursor;
            gridLayer.style.cursor = "auto";
            for (var i = 0; i < effects.length; i++) {
                effects[i].classList.add("elevated");
                effects[i].style.cursor = "pointer";
                effects[i].onmousedown = function (event) {
                    if (event.buttons != 1) return;
                    var target = event.target;

                    while (target.parentNode != tokenLayer) {
                        target = target.parentNode;
                    }
                    if (target.sound)
                        soundManager.removeEffect(target);
                    target.parentNode.removeChild(target);
                    effects.splice(effects.indexOf(target), 1);
                    unattachObjectFromPawns(target);
                    if (pawns.lightSources.indexOf(target) >= 0) pawns.lightSources.splice(pawns.lightSources.indexOf(target), 1)
                    window.requestAnimationFrame(refreshFogOfWar);
                }
            }
        } else {
            hideSoundLayer();
            gridLayer.onmousedown = generalMousedowngridLayer;
            currentlyDeletingEffects = false;
            gridLayer.style.cursor = lastgridLayerCursor;
            for (var i = 0; i < effects.length; i++) {
                effects[i].classList.remove("elevated");
                effects[i].onmousedown = null;

            }
        }
    }

    function unattachObjectFromPawns(objectElement) {
        var objectIndex;
        for (var i = 0; i < pawns.all.length; i++) {
            var pawn = pawns.all[i];
            if ((objectIndex = pawn.attached_objects.indexOf(objectElement)) >= 0) {
                pawn.attached_objects.splice(objectIndex, 1);
            }
        }
    }

    function stopDeletingEffects() {
        if (currentlyDeletingEffects) {
            var bn = document.getElementById("delete_effects_button")
            bn.click();
        }
    }

    function showSoundLayer() {
        [...document.querySelectorAll(".sound_effect")].forEach(x => x.classList.remove("hidden"))
    }

    function hideSoundLayer() {
        [...document.querySelectorAll(".sound_effect")].forEach(x => x.classList.add("hidden"))
    }
    function onEffectSizeChanged(event) {
        console.log(event)
        previewPlacement(createEffect(event, true));
    }


    function createEffect(e, isPreviewElement) {
        console.log(e)
        var newEffect;
        if (currentlySelectedEffectDropdown == SELECTED_EFFECT_TYPE.sfx) {
            newEffect = addSfxEffectHandler(e, isPreviewElement);
        } else if (currentlySelectedEffectDropdown == SELECTED_EFFECT_TYPE.light) {
            newEffect = addLightEffectHandler(e, isPreviewElement);
        } else if (currentlySelectedEffectDropdown == SELECTED_EFFECT_TYPE.sound) {
            newEffect = addSoundEffectHandler(e, isPreviewElement);
        }
        console.log(newEffect)
        if (newEffect.sound && !isPreviewElement) {
            soundManager.addEffect(newEffect.sound, newEffect.id);
        }

        return newEffect;

    }


    var selectedSfxBackground;
    function addSfxEffectHandler(e, isPreviewElement) {


        var effectName = sfxSelect.selected();

        var effectObj = effectData.find(x => x.name == effectName);

        if (!effectObj && effectName.toLowerCase() != "custom") {
            return;
        } else if (effectName.toLowerCase() == "custom") {
            effectObj = { name: "custom" }
        }
        var newEffect = createBaseEffect(effectObj, isPreviewElement, e)
        newEffect.classList.add("sfx_effect");
        tokenLayer.appendChild(newEffect);
        return newEffect;
    }

    function createInMenuEffect(effectObj) {
        var bgString = effectObj.filePaths && effectObj.filePaths.length > 0 ? `style="background-image: ${Util.cssify(pathModule.join(effectFilePath, effectObj.filePaths[0]))}"` : "";

        return `<div class = "row "> 
                    <div class ='effect_preview ${effectObj.isLightEffect ? " light_effect_preview " : ""} ${effectObj.classes.join(" ")}' ${bgString}></div>
                    <p style ="margin-left:1em;">${effectObj.name}</p>
                </div>`

    }
    function getSeletedEffectInputs() {
        if (currentlySelectedEffectDropdown == SELECTED_EFFECT_TYPE.sfx) {
            return {
                w: document.getElementById("effect_input_width"),
                h: document.getElementById("effect_input_height")
            }

        } else if (currentlySelectedEffectDropdown == SELECTED_EFFECT_TYPE.light) {
            return {
                w: document.getElementById("light_effect_input_width"),
                h: document.getElementById("light_effect_input_height")
            }
        }
        return null;
    }
    function getSelectedEffectSize() {
        var inputs = getSeletedEffectInputs();
        if (inputs == null) {
            return {
                w: 3,
                h: 3
            }
        }
        return { w: inputs.w.value, h: inputs.h.value };
    }

    function createBaseEffect(effectObj, isPreviewElement, e) {
        var newEffect = document.createElement("div");
        var wHeight = getSelectedEffectSize();
        var chosenWidth = wHeight.w;
        var chosenHeight = wHeight.h;
        var actualWidth, actualHeight;

        chosenWidth == "" ? actualWidth = 20 : actualWidth = chosenWidth;
        chosenHeight == "" ? actualHeight = 20 : actualHeight = chosenHeight;

        newEffect.dnd_width = actualWidth;
        newEffect.dnd_height = actualHeight;

        actualWidth *= cellSize / 5;
        actualHeight *= cellSize / 5
        newEffect.style.width = actualWidth + "px";
        newEffect.style.height = actualHeight + "px";
        newEffect.style.transform = "rotate(" + effectAngle + "deg)";
        newEffect.id = "effect_" + effectId++;
        var x = e.clientX - actualWidth / 2;
        var y = e.clientY - actualHeight / 2;
        newEffect.style.top = y + "px";
        newEffect.style.left = x + "px";

        if (effectObj.classes) {
            effectObj.classes.forEach(effClass => newEffect.classList.add(effClass));
        }
        if (effectObj.filePaths && effectObj.filePaths.length > 0) {
            var randEff = pickOne(effectObj.filePaths);
            var sfxPath = pathModule.join(effectFilePath, randEff);
            if (isPreviewElement) {
                selectedSfxBackground = "url('" + sfxPath.replace(/\\/g, "/").replace(/ /g, '%20') + "')";
            }
        } else if (effectObj.name != "custom") {
            selectedSfxBackground = null;
        }

        newEffect.style.backgroundImage = selectedSfxBackground;
        //Refresh preview
        if (!isPreviewElement) {
            effects.push(newEffect)
            previewPlacement(createEffect(e, true));
        }
        if (effectObj.sound) {
            newEffect.sound = effectObj.sound;
            newEffect.sound.x = x;
            newEffect.sound.y = y;
        }

        return newEffect;
    }

    function showPopupMenuAddEffect(event) {
        for (var i = 0; i < pawns.all.length; i++) {
            pawns.all[i].data_overload_click = popupMenuAddEffectClickHandler;
            pawns.all[i].classList.add("attach_lightsource_pawn")
        }
        var popup = document.getElementById("popup_menu_add_effect");
        sidebarManager.showInSideBar(popup);
        popup.classList.remove("hidden");
        selectEffectType(SELECTED_EFFECT_TYPE.sfx)
        closeOnEscape()
    }
    function close() {
        selectEffectType(null);
        stopAddingEffects();
        sidebarManager.close();

    }
    function closeOnEscape() {
        document.addEventListener("keydown", closeEsc)
        function closeEsc(e) {
            if (e.key == "Escape") {
                document.removeEventListener("keydown", closeEsc)
                close();
            }
        }
    }

    function stopAddingEffects() {
        hideSoundLayer();
        clearPreviewPlacement();
        gridLayer.style.cursor = "auto";
        for (var i = 0; i < pawns.all.length; i++) {
            pawns.all[i].data_overload_click = null;
            pawns.all[i].classList.remove("attach_lightsource_pawn")
        }
        gridLayer.onmousedown = generalMousedowngridLayer;
        effects = effects.filter(eff => eff != previewPlacementElement)

        if (currentlySelectedEffectDropdown == null) {
            sidebarManager.close();
        } else {
            selectEffectType(null);
        }
    }
    function onPreviewPlacementResized() {
        var inputs = getSeletedEffectInputs();
        var value = inputs.h.value;
        var value2 = inputs.w.value;
        value = value != "" ? parseInt(value) : 20;
        value2 = value2 != "" ? parseInt(value2) : 20;
        if (isNaN(value)) value = 20;
        if (isNaN(value2)) value2 = 20;
        if (event.deltaY < 0) {
            value++;
            value2++;
        } else {
            value--;
            value2--;
        }
        if (value == 0) value = 1;
        if (value2 == 0) value2 = 1;
        inputs.h.value = value;
        inputs.w.value = value2;

        var actualWidth = value * cellSize / 5;
        var actualHeight = value2 * cellSize / 5

        previewPlacementElement.dnd_width = value;
        previewPlacementElement.dnd_height = value2;
        previewPlacementElement.style.width = actualWidth + "px";
        previewPlacementElement.style.height = actualHeight + "px";
        adjustPreviewPlacement(event);
    }
    function selectEffectType(effectType) {

        [...document.querySelectorAll(".sidebar_section")].forEach(x => x.classList.remove("selected_section"));
        currentlySelectedEffectDropdown = effectType;
        if (currentlySelectedEffectDropdown == null)
            return;
        if (effectType == SELECTED_EFFECT_TYPE.sfx) {
            hideSoundLayer();
            document.getElementById("sidebar_sfx").classList.add("selected_section");
        } else if (effectType == SELECTED_EFFECT_TYPE.light) {
            hideSoundLayer();
            document.getElementById("sidebar_light").classList.add("selected_section");
        } else {
            showSoundLayer();
            document.getElementById("sidebar_sound").classList.add("selected_section");
        }
        gridLayer.onmousedown = popupMenuAddEffectClickHandler;
        previewPlacement(createEffect(event, true));

    }

    function popupMenuAddEffectClickHandler(e) {
        if (e.button == 2) {
            stopAddingEffects();
            return;
        }
        if (currentlySelectedEffectDropdown == null)
            return;

        var pawn;
        
        if (e.button == 0 && e.target == gridLayer) {

            createEffect(e);
        } else if (e.button == 0 && (pawn = pawnClicked(e.target))) {
      
            pawn.attached_objects.push(createEffect(e));
        }

        function pawnClicked(clickedEle) {
            for (var i = 0; i < pawns.all.length; i++) {
                if (pawns.all[i] == clickedEle) return clickedEle;
            }
            return null;
        }
    }
    function addSoundEffectHandler(e, isPreviewElement) {
        var selectedEffect = soundSelect.selected();
        var selectedSpread = soundRangeSelect.selected();
        var volume = parseFloat(document.getElementById("add_sound_volume").value);
        if (volume < 0) volume = 0.1;
        if (volume > 1) volume = 1;
        var effectObj = {};
        effectObj.sound = {
            src: selectedEffect,
            distance: selectedSpread,
            volume: volume
        };
        effectObj.classes = ["sound_effect"];


        var effect = createBaseEffect(effectObj, isPreviewElement, e);
        tokenLayer.appendChild(effect);
        return effect;
    }
    function addLightEffectHandler(e, isPreviewElement) {

        var effectName = lightSourceSelect.selected();
        var effectObj = effectData.filter(x => x.name == effectName)[0];
        if (!effectObj) return;
        var newEffect = createBaseEffect(effectObj, isPreviewElement, e)

        var chosenBrightLightRadius = document.getElementById("effect_input_value_three").value;
        var chosenDimLightRadius = document.getElementById("effect_input_value_four").value;

        chosenBrightLightRadius == "" ? newEffect.sight_radius_bright_light = 20 : newEffect.sight_radius_bright_light = chosenBrightLightRadius;
        chosenDimLightRadius == "" ? newEffect.sight_radius_dim_light = 20 : newEffect.sight_radius_dim_light = chosenDimLightRadius;

        newEffect.flying_height = 0;
        newEffect.classList.add("light_effect");
        if (visibilityLayerVisible) {
            newEffect.classList.add("light_source_visibility_layer");
        } else {
            newEffect.classList.add("light_source_normal_layer");
        }

        pawns.lightSources.push(newEffect);
        tokenLayer.appendChild(newEffect);
        if (currentlySelectedEffectDropdown == SELECTED_EFFECT_TYPE.light) refreshFogOfWar();
        return newEffect;
    }

    function effectDropdownChange(event) {
        stopDeletingEffects();
        previewPlacement(createEffect(event, true));

    }
    function resizeEffects() {

        effects.forEach(effect => resize(effect));
        if (previewPlacementElement) {
            resize(previewPlacementElement);
        }

        function resize(ele) {
            var width, height;
            width = parseFloat(ele.dnd_width);
            height = parseFloat(ele.dnd_height);
            ele.style.width = width * cellSize / 5 + "px";
            ele.style.height = height * cellSize / 5 + "px";

        }
    }
    return {
        resizeEffects: resizeEffects,
        effectDropdownChange: effectDropdownChange,
        startDeletingEffects: startDeletingEffects,
        startMovingEffects: startMovingEffects,
        showPopupMenuAddEffect: showPopupMenuAddEffect,
        createEffectMenus: createEffectMenus,
        onPreviewPlacementResized: onPreviewPlacementResized,
        close: close,
        initialize: initialize

    }
}();

module.exports = effectManager;