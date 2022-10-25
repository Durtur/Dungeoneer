const sidebarManager = require("../js/sidebarManager");
const SlimSelect = require("slim-select");

var effectManager = (function () {
    var currentlyDeletingEffects = false,
        currentlyEditingEffects;

    var effectData;
    var SELECTED_EFFECT_TYPE = {
        sfx: 0,
        light: 1,
        sound: 2,
    };

    var currentlySelectedEffectDropdown = SELECTED_EFFECT_TYPE.sfx;
    function initialize() {
        document.getElementById("sidebar_sfx").onclick = () => selectEffectType(SELECTED_EFFECT_TYPE.sfx);
        document.getElementById("sidebar_light").onclick = () => selectEffectType(SELECTED_EFFECT_TYPE.light);
        document.getElementById("sidebar_sound").onclick = () => selectEffectType(SELECTED_EFFECT_TYPE.sound);

        document.getElementById("add_sfx_dropdown").onclick = effectDropdownChange;
        ["effect_input_width", "effect_input_height", "light_effect_input_width", "light_effect_input_height"].forEach((x) => (document.getElementById(x).oninput = onEffectSizeChanged));

        document.getElementById("popup_menu_add_effect").addEventListener("mouseenter", function (evt) {
            if (previewPlacementManager.currentPreview()) {
                previewPlacementManager.currentPreview().classList.add("invisible");
            }
        });
        document.getElementById("popup_menu_add_effect").addEventListener("mouseleave", function (evt) {
            if (previewPlacementManager.currentPreview()) {
                previewPlacementManager.currentPreview().classList.remove("invisible");
            }
        });
        createEffectMenus();
    }
    var sfxSelect, lightSourceSelect, soundSelect, soundRangeSelect;
    var menus = [
        { key: "add_sfx_dropdown", menu: () => sfxSelect },
        { key: "add_light_source_dropdown", menu: () => lightSourceSelect },
        { key: "add_sound_dropdown", menu: () => soundSelect },
        { key: "add_sound_spread", menu: () => soundRangeSelect },
    ];
    async function createEffectMenus() {
        dataAccess.getMapToolData((data) => {
            effectData = data.effects;
            sfxSelect = createMenu(
                "add_sfx_dropdown",
                effectData.filter((x) => !x.isLightEffect),
                sfxSelect
            );
            lightSourceSelect = createMenu(
                "add_light_source_dropdown",
                effectData.filter((x) => x.isLightEffect),
                lightSourceSelect
            );
            sfxSelect.onChange = (e) => {
                selectEffectType(SELECTED_EFFECT_TYPE.sfx);
                effectDropdownChange(e);
            };
            lightSourceSelect.onChange = (e) => {
                selectEffectType(SELECTED_EFFECT_TYPE.light);
                effectDropdownChange(e);
            };
        });
        var soundList = await soundManager.getAvailableSounds();
        if (!soundSelect) {
            soundSelect = createMenu("add_sound_dropdown", soundList, soundSelect, false);
        }
        soundSelect.onChange = (e) => {
            selectEffectType(SELECTED_EFFECT_TYPE.sound);
            effectDropdownChange(e);
        };
        var ranges = Object.keys(soundManager.getSoundProfiles()).map((x) => {
            return { name: x };
        });

        if (!soundRangeSelect) {
            soundRangeSelect = createMenu("add_sound_spread", ranges, soundRangeSelect, false);
        }

        function createMenu(parentId, dataset, existingMenu, icon = true) {
            var lastSelected = localStorage.getItem(`effect_sidebar_last_selected_${parentId}`);
            var list = dataset.map((eff) => {
                return {
                    text: eff.name,
                    selected: eff.name == lastSelected,
                    value: eff.name,
                    innerHTML: icon ? createIcon(eff) : null,
                };
            });
            if (!existingMenu) {
                existingMenu = new SlimSelect({
                    select: document.getElementById(parentId),
                    hideSelectedOption: true,
                });
            }

            existingMenu.setData(list);
            return existingMenu;
        }
        function createIcon(eff) {
            return createInMenuEffect(effectData.find((x) => x.name == eff.name));
        }
    }

    function startMovingEffects(e) {
        currentlyEditingEffects = !currentlyEditingEffects;
        previewPlacementManager.clear();
        if (currentlySelectedEffectDropdown != null) selectEffectType(null);

        var priorState = e.target.getAttribute("toggled");
        if (priorState == "false") {
            if (document.getElementById("delete_effects_button").getAttribute("toggled") != "false") document.getElementById("move_effects_button").click();
            lastgridLayerCursor = gridLayer.style.cursor;
            gridLayer.style.cursor = "auto";
            gridLayer.onmousedown = function (event) {
                if (event.button == 2) {
                    var bn = document.getElementById("move_effects_button");
                    bn.click();
                }
            };
            showSoundLayer();
            effects.map((eff) => {
                eff.classList.add("elevated");
                eff.onwheel = function (e) {
                    console.log(e);
                    if (e.shiftKey) {
                        rotate(eff, e.deltaY);
                    } else if (e.ctrlKey) {
                        resize(eff, e.deltaY);
                    }
                };
                Util.makeUIElementDraggable(eff, () => {
                    if (eff.sound) soundManager.adjustPlacement(eff.id, eff.offsetLeft, eff.offsetLeft);
                    serverNotifier.notifyServer("object-moved", [
                        {
                            pos: map.objectGridCoords(eff),
                            id: eff.id,
                        },
                    ]);
                });
            });
        } else {
            resetGridLayer();
            gridLayer.style.cursor = lastgridLayerCursor;
            hideSoundLayer();
            effects.map((eff) => {
                eff.classList.remove("elevated");
                eff.onmousedown = null;
                eff.onwheel = null;
            });
        }
    }

    function rotate(effect, dir) {
        var deg = parseInt(effect.getAttribute("data-deg"));
        if (isNaN(deg)) deg = 0;

        if (dir > 0) {
            deg++;
            if (deg >= 360) deg = 0;
        } else {
            deg--;
            if (deg <= 0) {
                deg = 360;
            }
        }
        effect.style.transform = "rotate(" + deg + "deg)";
        effect.setAttribute("data-deg", deg);
        window.clearTimeout(serverNotifier.timeouts.effect_rotate);
        serverNotifier.timeouts.effect_rotate = window.setTimeout(() => serverNotifier.notifyServer("effect-rotate", { id: effect.id, rotate: deg }), 600);
    }

    function resize(effect, dir) {
        var mapUnitWidth = parseInt(effect.dnd_width);
        var mapUnitHeight = parseInt(effect.dnd_height);
        var incrDecrement = dir > 0 ? -1 : 1;

        mapUnitWidth += incrDecrement;
        mapUnitHeight += incrDecrement;

        effect.dnd_height = mapUnitHeight;
        effect.dnd_width = mapUnitWidth;

        effect.style.width = (mapUnitWidth * cellSize) / UNITS_PER_GRID + "px";
        effect.style.height = (mapUnitHeight * cellSize) / UNITS_PER_GRID + "px";
        window.clearTimeout(serverNotifier.timeouts.effect_resize);
        serverNotifier.timeouts.effect_resize = window.setTimeout(() => serverNotifier.notifyServer("effect-resize", { id: effect.id, width: mapUnitWidth, height: mapUnitHeight }), 600);
    }

    function startDeletingEffects(e) {
        previewPlacementManager.clear();
        if (currentlySelectedEffectDropdown != null) selectEffectType(null);
        currentlyDeletingEffects = !currentlyDeletingEffects;
        if (currentlyDeletingEffects) {
            if (document.getElementById("move_effects_button").getAttribute("toggled") != "false") document.getElementById("move_effects_button").click();
            showSoundLayer();
            gridLayer.onmousedown = function (event) {
                if (event.button == 2) {
                    var bn = document.getElementById("delete_effects_button");
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
                    removeEffect(event.target);
                };
            }
        } else {
            hideSoundLayer();
            resetGridLayer();
            currentlyDeletingEffects = false;
            gridLayer.style.cursor = lastgridLayerCursor;
            for (var i = 0; i < effects.length; i++) {
                effects[i].classList.remove("elevated");
                effects[i].onmousedown = null;
            }
        }
    }

    function removeEffect(target) {
        while (target.parentNode != tokenLayer) {
            target = target.parentNode;
        }
        if (target.sound) soundManager.removeEffect(target);

        target.parentNode.removeChild(target);
        effects.splice(effects.indexOf(target), 1);
        unattachObjectFromPawns(target);
        if (pawns.lightSources.indexOf(target) >= 0) pawns.lightSources.splice(pawns.lightSources.indexOf(target), 1);
        window.requestAnimationFrame(refreshFogOfWar);
        if (serverNotifier.isServer()) {
            serverNotifier.notifyServer("effect-remove", target.id);
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

    function isLightEffect(pawnElement) {
        for (var i = 0; i < pawns.lightSources.length; i++) {
            if (pawns.lightSources[i] == pawnElement) {
                return true;
            }
        }
        return false;
    }

    function stopDeletingEffects() {
        if (currentlyDeletingEffects) {
            var bn = document.getElementById("delete_effects_button");
            bn.click();
        }
    }
    function stopMovingEffects() {
        if (currentlyEditingEffects) {
            var bn = document.getElementById("move_effects_button");
            bn.click();
        }
    }

    function showSoundLayer() {
        [...document.querySelectorAll(".sound_effect")].forEach((x) => x.classList.remove("hidden"));
    }

    function hideSoundLayer() {
        [...document.querySelectorAll(".sound_effect")].forEach((x) => x.classList.add("hidden"));
    }
    async function onEffectSizeChanged(event) {
        previewPlacementManager.preview(await createEffect(event, true));
    }

    async function createEffect(e, isPreviewElement) {
        var newEffect;
        if (currentlySelectedEffectDropdown == SELECTED_EFFECT_TYPE.sfx) {
            newEffect = await addSfxEffectHandler(e, isPreviewElement);
        } else if (currentlySelectedEffectDropdown == SELECTED_EFFECT_TYPE.light) {
            newEffect = await addLightEffectHandler(e, isPreviewElement);
        } else if (currentlySelectedEffectDropdown == SELECTED_EFFECT_TYPE.sound) {
            newEffect = await addSoundEffectHandler(e, isPreviewElement);
        }
        if (!isPreviewElement) previewPlacementManager.preview(await createEffect(e, true));
        return newEffect;
    }

    var selectedSfxBackground;
    async function addSfxEffectHandler(e, isPreviewElement) {
        var effectName = sfxSelect.selected();

        var effectObj = effectData.find((x) => x.name == effectName);

        if (!effectObj && effectName.toLowerCase() != "custom") {
            return;
        } else if (effectName.toLowerCase() == "custom") {
            effectObj = { name: "custom" };
        }
        var newEffect = createBaseEffect(effectObj, isPreviewElement, e);

        newEffect.classList.add("sfx_effect");
        tokenLayer.appendChild(newEffect);
        if (!isPreviewElement && serverNotifier.isServer()) {
            var obj = await saveManager.exportEffect(newEffect);
            obj.isLightEffect = false;
            serverNotifier.notifyServer("effect-add", obj);
        }
        return newEffect;
    }

    function createInMenuEffect(effectObj) {
        var bgString = effectObj.filePaths && effectObj.filePaths.length > 0 ? `style="background-image: ${Util.cssify(pathModule.join(effectFilePath, effectObj.filePaths[0]))}"` : "";

        return `<div class = "row "> 
                    <div class ='effect_preview ${effectObj.isLightEffect ? " light_effect_preview " : ""} ${effectObj.classes.join(" ")}' ${bgString}></div>
                    <p style ="margin-left:1em;">${effectObj.name}</p>
                </div>`;
    }
    function getSeletedEffectInputs() {
        if (currentlySelectedEffectDropdown == SELECTED_EFFECT_TYPE.sfx) {
            return {
                w: document.getElementById("effect_input_width"),
                h: document.getElementById("effect_input_height"),
            };
        } else if (currentlySelectedEffectDropdown == SELECTED_EFFECT_TYPE.light) {
            return {
                w: document.getElementById("light_effect_input_width"),
                h: document.getElementById("light_effect_input_height"),
            };
        }
        return null;
    }
    function getSelectedEffectSize() {
        var inputs = getSeletedEffectInputs();
        if (inputs == null) {
            return {
                w: 3,
                h: 3,
            };
        }
        return { w: inputs.w.value, h: inputs.h.value };
    }

    function createBaseEffect(effectObj, isPreviewElement, e) {
        var newEffect = document.createElement("div");
        var wHeight = getSelectedEffectSize();
        var chosenWidth = effectObj.width || wHeight.w;
        var chosenHeight = effectObj.height || wHeight.h;
        var actualWidth, actualHeight;

        chosenWidth == "" ? (actualWidth = 20) : (actualWidth = chosenWidth);
        chosenHeight == "" ? (actualHeight = 20) : (actualHeight = chosenHeight);

        newEffect.dnd_width = actualWidth;
        newEffect.dnd_height = actualHeight;

        actualWidth *= cellSize / UNITS_PER_GRID;
        actualHeight *= cellSize / UNITS_PER_GRID;
        newEffect.style.width = actualWidth + "px";
        newEffect.style.height = actualHeight + "px";
        var angle = previewPlacementManager.getAngle() || effectObj.angle;
        newEffect.style.transform = "rotate(" + angle + "deg)";
        newEffect.setAttribute("data-deg", angle);

        newEffect.id = effectObj.id || "effect_" + effectId++;
        var x = e.clientX - actualWidth / 2;
        var y = e.clientY - actualHeight / 2;
        newEffect.style.top = y + "px";
        newEffect.style.left = x + "px";

        if (effectObj.classes) {
            newEffect.setAttribute("data-effect-classes", JSON.stringify(effectObj.classes));
            effectObj.classes.forEach((effClass) => newEffect.classList.add(effClass));
        }
        if (effectObj.filePaths && effectObj.filePaths.length > 0) {
            var randEff = effectObj.filePaths.pickOne();
            var sfxPath = pathModule.join(effectFilePath, randEff).replace(/\\/g, "/");
            if (isPreviewElement) {
                selectedSfxBackground = "url('" + sfxPath + "')";
            }
        } else if (effectObj.bgPhotoBase64) {
            selectedSfxBackground = effectObj.bgPhotoBase64;
        } else if (effectObj.name != "custom") {
            selectedSfxBackground = null;
        }

        newEffect.style.backgroundImage = selectedSfxBackground;
        //Refresh preview
        if (!isPreviewElement) {
            effects.push(newEffect);
        }
        if (effectObj.sound && !isPreviewElement) {
            newEffect.sound = effectObj.sound;
            newEffect.sound.x = x;
            newEffect.sound.y = y;
            soundManager.addEffect(newEffect.sound, newEffect.id);
        }

        return newEffect;
    }

    function showPopupMenuAddEffect(event) {
        var popup = document.getElementById("popup_menu_add_effect");
        sidebarManager.showInSideBar(popup, () => {
            popup.classList.add("hidden");
            document.body.appendChild(popup);
        });
        popup.classList.remove("hidden");
        selectEffectType(SELECTED_EFFECT_TYPE.sfx);
        closeOnEscape();
    }
    function close() {
        selectEffectType(null);
        stopAddingEffects();
        stopDeletingEffects();
        stopMovingEffects();

        sidebarManager.close();
    }
    function closeOnEscape() {
        document.addEventListener("keydown", closeEsc);
        function closeEsc(e) {
            if (e.key == "Escape") {
                document.removeEventListener("keydown", closeEsc);
                close();
            }
        }
    }

    function stopAddingEffects() {
        hideSoundLayer();

        previewPlacementManager.clear();
        gridLayer.style.cursor = "auto";
        if (pawns.all)
            for (var i = 0; i < pawns.all.length; i++) {
                pawns.all[i].data_overload_click = null;
                pawns.all[i].classList.remove("attach_lightsource_pawn");
            }
        resetGridLayer();
        effects = effects.filter((eff) => eff != previewPlacementManager.currentPreview());

        if (currentlySelectedEffectDropdown == null) {
            sidebarManager.close();
        } else {
            selectEffectType(null);
        }
        refreshFogOfWar();
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

        var actualWidth = (value * cellSize) / UNITS_PER_GRID;
        var actualHeight = (value2 * cellSize) / UNITS_PER_GRID;
        var ele = previewPlacementManager.currentPreview();
        ele.dnd_width = value;
        ele.dnd_height = value2;
        ele.style.width = actualWidth + "px";
        ele.style.height = actualHeight + "px";
    }
    async function selectEffectType(effectType) {
        [...document.querySelectorAll(".sidebar_section")].forEach((x) => x.classList.remove("selected_section"));
        currentlySelectedEffectDropdown = effectType;
        if (currentlySelectedEffectDropdown == null) return;
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
        startAddingEffects();
    }

    async function popupMenuAddEffectClickHandler(e) {
        if (e.button == 2) {
            stopAddingEffects();
            return;
        }
        if (currentlySelectedEffectDropdown == null) return;

        var pawn;

        if (e.button == 0 && e.target == gridLayer) {
            await createEffect(e);
        } else if (e.button == 0 && (pawn = pawnClicked(e.target))) {
            pawn.attached_objects.push(await createEffect(e));
        }

        function pawnClicked(clickedEle) {
            for (var i = 0; i < pawns.all.length; i++) {
                if (pawns.all[i] == clickedEle) return clickedEle;
            }
            return null;
        }
    }
    async function addSoundEffectHandler(e, isPreviewElement) {
        var selectedEffect = soundSelect.selected();
        var selectedSpread = soundRangeSelect.selected();
        var volume = parseFloat(document.getElementById("add_sound_volume").value);
        if (volume < 0) volume = 0.1;
        if (volume > 1) volume = 1;
        var effectObj = {};
        effectObj.sound = {
            src: selectedEffect,
            distance: selectedSpread,
            volume: volume,
        };
        effectObj.classes = ["sound_effect"];

        var newEffect = createBaseEffect(effectObj, isPreviewElement, e);
        tokenLayer.appendChild(newEffect);
        if (!isPreviewElement && serverNotifier.isServer()) {
            var obj = await saveManager.exportEffect(newEffect);
            obj.isLightEffect = false;
            serverNotifier.notifyServer("effect-add", obj);
        }
        return newEffect;
    }
    async function addLightEffectHandler(e, isPreviewElement) {
        var effectName = lightSourceSelect.selected();
        var effectObj = effectData.filter((x) => x.name == effectName)[0];
        if (!effectObj) return;

        var chosenBrightLightRadius = document.getElementById("effect_input_value_three").value;
        var chosenDimLightRadius = document.getElementById("effect_input_value_four").value;

        effectObj.dimLightRadius = chosenDimLightRadius;
        effectObj.brightLightRadius = chosenBrightLightRadius;
        var newEffect = await addLightEffect(effectObj, isPreviewElement, e);
        if (!isPreviewElement && serverNotifier.isServer()) {
            var obj = await saveManager.exportEffect(newEffect);
            obj.isLightEffect = true;

            serverNotifier.notifyServer("effect-add", obj);
        }

        return newEffect;
    }

    async function addLightEffect(effectObj, isPreviewElement, e) {
        var newEffect = await createBaseEffect(effectObj, isPreviewElement, e);

        newEffect.sight_radius_bright_light = effectObj.brightLightRadius == "" ? 20 : effectObj.brightLightRadius;
        newEffect.sight_radius_dim_light = effectObj.dimLightRadius == "" ? 20 : effectObj.dimLightRadius;

        newEffect.flying_height = 0;
        newEffect.classList.add("light_effect");
        if (visibilityLayerVisible) {
            newEffect.classList.add("light_source_visibility_layer");
        } else {
            newEffect.classList.add("light_source_normal_layer");
        }

        pawns.lightSources.push(newEffect);
        tokenLayer.appendChild(newEffect);
        refreshFogOfWar();
        return newEffect;
    }

    async function startAddingEffects() {
        previewPlacementManager.preview(await createEffect(event, true));
        gridLayer.onmousedown = popupMenuAddEffectClickHandler;
        for (var i = 0; i < pawns.all.length; i++) {
            pawns.all[i].data_overload_click = popupMenuAddEffectClickHandler;
            pawns.all[i].classList.add("attach_lightsource_pawn");
        }
    }

    async function effectDropdownChange(event) {
        stopDeletingEffects();
        startAddingEffects();
        menus.forEach((item) => {
            var menu = item.menu();
            localStorage.setItem(`effect_sidebar_last_selected_${item.key}`, menu.selected());
        });
    }
    function resizeEffects() {
        effects.forEach((effect) => map.updateObjectSize(effect));
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
        initialize: initialize,
        removeEffect: removeEffect,
    };
})();

module.exports = effectManager;
