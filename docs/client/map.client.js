
var settings = {
    gridSettings: {},
    enableGrid: true,
    colorTokenBases: true,
    fogOfWarHue: "#000000"
};
var module = {};


const PLAYERS_ALL_OPTION = "Players";
const DEFAULT_TOKEN_PATH_JS_RELATIVE = "client/default.png";
function require() {
    return null;
}

var creaturePossibleSizes;
var soundManager;
var touchMoveResetTimeout;
document.addEventListener("DOMContentLoaded", () => {
    soundManager = new SoundManager();
    soundManager.initialize();

    map.init();
    setMapForeground("./client/default.png");
    resetGridLayer();
    var gridEnable = localStorage.getItem('enableGrid');
    console.log(gridEnable)
    if (gridEnable != settings.enableGrid + "")
        toggleGrid();


    var hammertime = new Hammer(gridLayer, null);

    hammertime.on('pinchin', function (ev) {
        disableMapDrag = true;
        console.log("disableMapDrag")
        ev.x = ev.center.x;
        ev.y = ev.center.y;

    
        window.ontouchend   = ()=>{
            disableMapDrag= false;
            
        console.log("!disableMapDrag")
            window.ontouchend = null;
        }
     
        setMapZoom(ev, ev.scale)

    });
    hammertime.on('pinchout', function (ev) {
        disableMapDrag = true;
        console.log("disableMapDrag")
        ev.x = ev.center.x;
        ev.y = ev.center.y;
        window.ontouchend   = ()=>{
            disableMapDrag= false;
            console.log("!disableMapDrag")
            window.ontouchend = null;
        }
        setMapZoom(ev, ev.scale)

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
        if (selected && selected == pawn.character_name || TOKEN_ACCESS.length == 1)
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

function hideAllTooltips() {

    document.getElementById("tooltip").classList.add("hidden");
}

function toggleGrid() {

    settings.enableGrid = !settings.enableGrid;

    localStorage.setItem('enableGrid', settings.enableGrid);
    
    resizeAndDrawGrid();

    var btn = document.getElementById("toggle_grid_button");
    btn.setAttribute("toggled", settings.enableGrid);
}


function centerCurrentViewer(){
    centerPawnFlag = false;
    var ele = fovLighting.getPerspective();

    if(ele)
        map.centerOn(ele);
}




