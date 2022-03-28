
gridLayer.onwheel = function (event) {
    event.preventDefault();
    if (event.ctrlKey && previewPlacementElement) {
        effectManager.onPreviewPlacementResized(event);
    }

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
