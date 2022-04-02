
var settings = {
    gridSettings: {},
    enableGrid: true
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
    setMapForeground("./client/default.png");
    resetGridLayer();

    var hammertime = new Hammer(gridLayer, null);
    hammertime.on('pinch', function (ev) {
        console.log(ev);
        util.showBubblyText(ev.direction, {clientX:50, clientY: 50})
    });
    hammertime.get('pinch').set({ enable: true })
});

gridLayer.onwheel = function (event) {
    event.preventDefault();
    return map.onzoom(event);
};

function generalMousedowngridLayer(event) {
    console.log(event)
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

function notifySelectedPawnsChanged() {
    //Do something 
}


