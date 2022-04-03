
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
    visibilityLayerVisible = false;
    fovLighting.setVisibilityLayerVisible(true);
    map.init();
    setMapForeground("./client/default.png");
    resetGridLayer();
   
    var hammertime = new Hammer(gridLayer, null);

    hammertime.on('pinchin', function (ev) {
        console.log(ev);
      
  

       zoomIntoMap(event, 0.1)
    });
    hammertime.on('pinchout', function (ev) {
        console.log(ev);
        zoomIntoMap(event, -0.1)
    });
    hammertime.get('pinch').set({ enable: true })
});

gridLayer.onwheel = function (event) {
    event.preventDefault();
    return map.onzoom(event);
};

function showBubblyText(text, point, smallfont, multiple) {
    var newEle = document.createElement("div");

    newEle.innerHTML = text;
    newEle.classList.add("roll_result_effect");
    if (!multiple)
        [...document.getElementsByClassName("roll_result_effect")].forEach(ele => ele.parentNode.removeChild(ele));
    document.body.appendChild(newEle);
    if (smallfont)
        newEle.style.fontSize = "18px";
    newEle.style.top = point.y - newEle.clientHeight / 2 + "px";
    newEle.style.left = point.x - newEle.clientWidth / 2 + "px";

    window.setTimeout(function (evt) {
        newEle.classList.add("fade_out");
        if (newEle.parentNode) newEle.parentNode.removeChild(newEle);
    }, 3000);
}
function generalMousedowngridLayer(event) {
    console.log(event)
    event.preventDefault();
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


