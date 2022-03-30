var settings = { gridSettings: {},
enableGrid:true
};
var module = {}, previewPlacementElement;
var addingFromMainWindow = false;

function require() {
    return null;
}

var creaturePossibleSizes;
var soundManager;

document.addEventListener("DOMContentLoaded", () => {
    soundManager = new SoundManager();
    soundManager.initialize();
    visibilityLayerVisible = true;
    fovLighting.setVisibilityLayerVisible(true);
    map.init();
});

gridLayer.onwheel = function (event) {
    event.preventDefault();
    return map.onzoom(event);
};

function generalMousedowngridLayer(event) {

    if (event.button == 0) {
        clearSelectedPawns();
        if (event.ctrlKey) {
            clearSelectedPawns();
            startSelectingPawns(event);
        } else {
            startMovingMap(event);
        }

    } else if (event.button == 1) {
        startMovingMap(event);
    }
}

function notifySelectedPawnsChanged (){
    //Do something 
}


