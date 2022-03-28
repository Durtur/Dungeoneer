
var effectManager = function () {
  
    function removeEffect(target) {
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

    function unattachObjectFromPawns(objectElement) {
        var objectIndex;
        for (var i = 0; i < pawns.all.length; i++) {
            var pawn = pawns.all[i];
            if ((objectIndex = pawn.attached_objects.indexOf(objectElement)) >= 0) {
                pawn.attached_objects.splice(objectIndex, 1);
            }
        }
    }

    
    function createEffect(e, effectType) {
        console.log(e)
        var newEffect;
        if (effectType == SELECTED_EFFECT_TYPE.sfx) {
            newEffect = addSfxEffectHandler(e);
        } else if (effectType == SELECTED_EFFECT_TYPE.light) {
            newEffect = addLightEffectHandler(e);
        } else if (effectType == SELECTED_EFFECT_TYPE.sound) {
            newEffect = addSoundEffectHandler(e);
        }
     
        if (newEffect.sound) {
            soundManager.addEffect(newEffect.sound, newEffect.id);
        }

        return newEffect;

    }


    var selectedSfxBackground;
    function addSfxEffectHandler(e) {


        var effectName = sfxSelect.selected();

        var effectObj = effectData.find(x => x.name == effectName);

        if (!effectObj && effectName.toLowerCase() != "custom") {
            return;
        } else if (effectName.toLowerCase() == "custom") {
            effectObj = { name: "custom" }
        }
        var newEffect = createBaseEffect(effectObj, e)
        newEffect.classList.add("sfx_effect");
        tokenLayer.appendChild(newEffect);
        return newEffect;
    }


    function createBaseEffect(effectObj, e) {
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
            var randEff = effectObj.filePaths.pickOne();
            var sfxPath = pathModule.join(effectFilePath, randEff);
         
        } else if (effectObj.name != "custom") {
            selectedSfxBackground = null;
        }

        newEffect.style.backgroundImage = selectedSfxBackground;

        if (effectObj.sound) {
            newEffect.sound = effectObj.sound;
            newEffect.sound.x = x;
            newEffect.sound.y = y;
        }

        return newEffect;
    }

    function resizeEffects() {

        effects.forEach(effect => resize(effect));
 
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
        removeEffect:removeEffect,
        createEffect:createEffect,
      
    }
}();
