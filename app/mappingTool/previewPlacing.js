var effectAngle = 0;

var previewPlacementElement;
function previewPlacement(elmnt, callback) {
    if (elmnt == null)
        return closeDragElement();
    if (previewPlacementElement != null) {
        closeDragElement();
    }
    previewPlacementElement = elmnt;


    elmnt.classList.add("preview_placement");

    gridLayer.addEventListener("wheel", rotatePreview)
    document.onmousemove = elementDrag;

    document.addEventListener("mousedown", function (event) {
        if (event.button != 0) {
            closeDragElement();
        }
    })
    document.addEventListener("mousemove", elementDrag);
    function rotatePreview(event) {
        if (event.shiftKey) {
            if (event.deltaY > 0) {
                effectAngle++;
                if (effectAngle >= 360)
                    effectAngle = 0;
            } else {
                effectAngle--;
                if (effectAngle <= 0) {
                    effectAngle = 360;
                }
            }
        }
        elmnt.style.transform = "rotate(" + effectAngle + "deg)";

    }
    var eleDragTimestamp;
    function elementDrag(e) {
        window.requestAnimationFrame(function (ts) {
            if (ts == eleDragTimestamp) {
                return
            }
            eleDragTimestamp = ts;
            e.preventDefault();
            var elementHeight = parseFloat(elmnt.style.height);
            var elementWidth = parseFloat(elmnt.style.width);

            // calculate the new cursor position:
            var x = e.clientX - elementWidth / 2;
            var y = e.clientY - elementHeight / 2;
            elmnt.style.top = y + "px";
            elmnt.style.left = x + "px";
            window.requestAnimationFrame(refreshFogOfWar);
            /*
            pos1 = pos3 - x;
            pos2 = pos4 - y;
            pos3 = x;
            pos4 = y;
            window.requestAnimationFrame(refreshFogOfWar);
            // set the element's new position:
            elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
            elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
            */
        });
    }



    function closeDragElement() {
        // stop moving when mouse button is released:
        document.removeEventListener("mousedown", closeDragElement);
        document.removeEventListener("mousemove", elementDrag);
        gridLayer.removeEventListener("wheel", rotatePreview)
        if (previewPlacementElement) {
            previewPlacementElement.classList.remove("preview_placement")
            previewPlacementElement.parentNode?.removeChild(previewPlacementElement);
            pawns.lightSources = pawns.lightSources.filter(item => item !== previewPlacementElement)
            previewPlacementElement = null;
        }

        if (callback) callback();
    }
}
function adjustPreviewPlacement(event) {
    if (!previewPlacementElement) return;

    var dndHeight = previewPlacementElement.dnd_height ? parseInt(previewPlacementElement.dnd_height) : 1;
    var dndWidth = previewPlacementElement.dnd_width ? parseInt(previewPlacementElement.dnd_width) : 1;
    var feetSize = cellSize / 5;
    previewPlacementElement.style.width = dndWidth * feetSize + "px";
    previewPlacementElement.style.height = dndHeight * feetSize + "px";
    // calculate the new cursor position:
    var x = event.clientX - dndWidth * feetSize / 2;
    var y = event.clientY - dndHeight * feetSize / 2;
    previewPlacementElement.style.top = y + "px";
    previewPlacementElement.style.left = x + "px";

}

function clearPreviewPlacement() {
    [effects, pawns.lightSources].forEach(arr => {
        if (arr.indexOf(previewPlacementElement) >= 0)
            arr.splice(arr.indexOf(previewPlacementElement), 1);
    })

    previewPlacement(null);
}