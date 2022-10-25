var effectManager = (function () {
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

    var selectedSfxBackground;
    function addSfxEffect(effectObj, e) {
        var newEffect = createBaseEffect(effectObj, false, e);
        newEffect.classList.add("sfx_effect");
        tokenLayer.appendChild(newEffect);
        return newEffect;
    }

    function addLightEffect(effectObj, e) {
        var newEffect = createBaseEffect(effectObj, false, e);

        newEffect.sight_radius_dim_light = effectObj.dimLightRadius == "" ? 20 : effectObj.dimLightRadius;
        newEffect.sight_radius_bright_light = effectObj.brightLightRadius == "" ? 20 : effectObj.brightLightRadius;
        console.log();

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
    }

    function createBaseEffect(effectObj, isPreviewElement, e) {
        var newEffect = document.createElement("div");
        var chosenWidth = effectObj.width;
        var chosenHeight = effectObj.height;
        var actualWidth, actualHeight;

        chosenWidth == "" ? (actualWidth = 20) : (actualWidth = chosenWidth);
        chosenHeight == "" ? (actualHeight = 20) : (actualHeight = chosenHeight);

        newEffect.dnd_width = actualWidth;
        newEffect.dnd_height = actualHeight;

        actualWidth *= cellSize / UNITS_PER_GRID;
        actualHeight *= cellSize / UNITS_PER_GRID;
        newEffect.style.width = actualWidth + "px";
        newEffect.style.height = actualHeight + "px";
        var angle = effectObj.angle;
        newEffect.style.transform = "rotate(" + angle + "deg)";
        newEffect.setAttribute("data-deg", angle);
        newEffect.id = effectObj.id || "effect_" + effectId++;
        var x = e.clientX;
        var y = e.clientY;
        newEffect.style.top = y + "px";
        newEffect.style.left = x + "px";

        if (effectObj.classes) {
            newEffect.setAttribute("data-effect-classes", JSON.stringify(effectObj.classes));
            effectObj.classes.forEach((effClass) => newEffect.classList.add(effClass));
        }
        if (effectObj.filePaths && effectObj.filePaths.length > 0) {
            var randEff = effectObj.filePaths.pickOne();
            var sfxPath = pathModule.join(effectFilePath, randEff);
            if (isPreviewElement) {
                selectedSfxBackground = "url('" + sfxPath + "')";
            }
        } else if (effectObj.bgPhotoBase64 && effectObj.bgPhotoBase64 != "none") {
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

    function resizeEffects() {
        effects.forEach((effect) => resize(effect));

        function resize(ele) {
            var width, height;
            width = parseFloat(ele.dnd_width);
            height = parseFloat(ele.dnd_height);
            ele.style.width = (width * cellSize) / UNITS_PER_GRID + "px";
            ele.style.height = (height * cellSize) / UNITS_PER_GRID + "px";
        }
    }

    function rotate(effect, deg) {
        console.log(`Rotate ${deg} `);
        effect.style.transform = "rotate(" + deg + "deg)";
        effect.setAttribute("data-deg", deg);
    }

    function resize(effect, mapUnitHeight, mapUnitWidth) {
        console.log(`Resize ${mapUnitHeight} `);
        effect.dnd_height = mapUnitHeight;
        effect.dnd_width = mapUnitWidth;

        effect.style.width = (mapUnitWidth * cellSize) / UNITS_PER_GRID + "px";
        effect.style.height = (mapUnitHeight * cellSize) / UNITS_PER_GRID + "px";
    }

    return {
        resize: resize,
        rotate: rotate,
        resizeEffects: resizeEffects,
        removeEffect: removeEffect,
        addLightEffect: addLightEffect,
        addSfxEffect: addSfxEffect,
    };
})();
