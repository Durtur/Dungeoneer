
var settings = {
    gridSettings: {},
    enableGrid: true,
    colorTokenBases: true
};
var module = {}, previewPlacementElement;
var addingFromMainWindow = false;
const PLAYERS_ALL_OPTION ="Players";
function require() {
    return null;
}

var creaturePossibleSizes;
var soundManager;

document.addEventListener("DOMContentLoaded", () => {
    soundManager = new SoundManager();
    soundManager.initialize();
  
    map.init();
    setMapForeground("./client/default.png");
    resetGridLayer();

    var hammertime = new Hammer(gridLayer, null);

    hammertime.on('pinchin', function (ev) {
        console.log(ev);
        showBubblyText(ev.center.x)
        ev.clientX = ev.center.x;
        ev.clientY = ev.center.y;
        zoomIntoMap(ev, -0.01)
    });
    hammertime.on('pinchout', function (ev) {
        console.log(ev);
        showBubblyText(ev.center.x);
        ev.clientX = ev.center.x;
        ev.clientY = ev.center.y;
        zoomIntoMap(ev, 0.01)
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
    return false;
}

function notifySelectedPawnsChanged() {
    //Do something 
}

function createPerspectiveDropdown() {
    var dd = document.getElementById("fov_perspective_dropdown");
    var selected = dd.options[dd.selectedIndex]?.value;
    while (dd.firstChild)
        dd.removeChild(dd.firstChild);

    dd.appendChild(createOption(PLAYERS_ALL_OPTION, "Players"));
    if (TOKEN_ACCESS == null)
        return;

    TOKEN_ACCESS.forEach(pawn => {
        var opt = createOption(pawn.character_name, pawn.character_name);
        if (selected && selected == pawn.character_name)
            opt.selected = true;
        dd.appendChild(opt);
    });

    onPerspectiveChanged();
}


function createOption(value, dispay) {
    var newOption = document.createElement("option");
    newOption.setAttribute("value", value);
    newOption.innerHTML = dispay;
    return newOption;
}


