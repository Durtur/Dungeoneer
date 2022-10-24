const previewPlacementManager = (function () {
    var previewAngle = 0;
    var dragPreviewTimestamp;
    var previewPlacementElement;
    var resizeAllowed = true;
    function getAngle() {
        return previewAngle || 0;
    }
    function currentPreview() {
        return previewPlacementElement;
    }

    function rotatePreviewHandler(event) {
        if (!previewAngle) previewAngle = 0;
        if (event.shiftKey) {
            if (event.deltaY > 0) {
                previewAngle++;
                if (previewAngle >= 360) previewAngle = 0;
            } else {
                previewAngle--;
                if (previewAngle <= 0) {
                    previewAngle = 360;
                }
            }
            setAngle(previewAngle);
        }
    }

    function setAngle(angle) {
        console.log(`set angle ${angle}`);
        previewAngle = angle;
        previewPlacementElement.style.transform = "rotate(" + previewAngle + "deg)";
    }

    function dragPreviewHandler(e) {
        window.requestAnimationFrame(function (ts) {
            if (ts == dragPreviewTimestamp) {
                return;
            }

            dragPreviewTimestamp = ts;
            e.preventDefault();
            var elementHeight = parseFloat(previewPlacementElement.style.height);
            var elementWidth = parseFloat(previewPlacementElement.style.width);

            // calculate the new cursor position:
            var x = e.clientX - elementWidth / 2;
            var y = e.clientY - elementHeight / 2;
            previewPlacementElement.style.top = y + "px";
            previewPlacementElement.style.left = x + "px";
            window.requestAnimationFrame(refreshFogOfWar);
        });
    }

    function closeOnMouseDownHandler(event) {
        if (event.button != 0) {
            clear();
        }
    }

    function preview(elmnt, allowResize = true) {
        if (elmnt == null) return clear();
        if (previewPlacementElement != null) {
            clear();
        }
        resizeAllowed = allowResize;
        previewPlacementElement = elmnt;
        map.updateObjectSize(previewPlacementElement);

        previewPlacementElement.classList.add("preview_placement");

        document.addEventListener("wheel", rotatePreviewHandler);
        document.addEventListener("mousemove", dragPreviewHandler);
        document.addEventListener("mousedown", closeOnMouseDownHandler);
    }
    function adjust(event) {
        if (!previewPlacementElement) return;
        map.updateObjectSize(previewPlacementElement);
        map.centerObjectOn(previewPlacementElement, event.clientX, event.clientY);
    }

    function clear() {
        [effects, pawns.lightSources].forEach((arr) => {
            if (arr.indexOf(previewPlacementElement) >= 0) arr.splice(arr.indexOf(previewPlacementElement), 1);
        });

        // stop moving when mouse button is released:
        document.removeEventListener("wheel", rotatePreviewHandler);
        document.removeEventListener("mousemove", dragPreviewHandler);
        document.removeEventListener("mousedown", closeOnMouseDownHandler);
        if (previewPlacementElement) {
            previewPlacementElement.parentNode?.removeChild(previewPlacementElement);
            previewPlacementElement = null;
        }
    }

    function allowResize() {
        return previewPlacementElement != null && resizeAllowed;
    }
    return {
        clear: clear,
        allowResize: allowResize,
        preview: preview,
        adjust: adjust,
        setAngle: setAngle,
        getAngle: getAngle,
        currentPreview: currentPreview,
    };
})();
