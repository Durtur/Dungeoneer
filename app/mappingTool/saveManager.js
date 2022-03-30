const util = require("../js/util");


class SaveManager {

    async saveCurrentMap() {
        var path = this.lastLoadedMapPath ? this.lastLoadedMapPath : window.dialog.showSaveDialogSync(

            {
                filters: [{ name: 'Map', extensions: ['dungeoneer_map'] }],
                title: "Save",
                defaultPath: "map"
            });

        if (path == null) return;


        var loadingEle = Util.createLoadingEle("Creating save", "Packaging...");
        document.body.appendChild(loadingEle);
        try {
            await this.saveMap(path, loadingEle.updateText);
            this.lastLoadedMapPath = path;
            var baseName = pathModule.basename(path);
            Util.showSuccessMessage(`Saved to ${baseName}`);
        } finally {
            loadingEle.parentNode?.removeChild(loadingEle);
        }

    }

    async saveMap(path, progressFunction) {
        this.resetAllStates();
        zoomIntoMap({ x: 0, y: 0 }, 0);
        var data = {};


        var effectsToAdd = [];

        for (var i = 0; i < effects.length; i++) {
            var newEff = {
                data_classList: [...effects[i].classList],
                data_x: effects[i].style.left,
                data_y: effects[i].style.top,
                bg: effects[i].style.backgroundImage,
                sound: effects[i].sound,
                dnd_height: effects[i].dnd_height,
                dnd_width: effects[i].dnd_width
            };
            effectsToAdd.push(newEff)

        }
        var mapContainer = mapContainers[0];
        data.effects = effectsToAdd;
        data.map = settings.currentMap;
        data.mapX = mapContainer.data_transform_x;
        data.mapY = mapContainer.data_transform_y;
        data.bg_scale = mapContainer.data_bg_scale;
        data.foregroundTranslate = { x: foregroundCanvas.data_transform_x, y: foregroundCanvas.data_transform_y }

        data.segments = fovLighting.getSegments();

        //Map slide
        backgroundLoop.saveSlideState(data);

        data.bg_height_width_ratio = foregroundCanvas.heightToWidthRatio;
        data.bg_width = parseFloat(foregroundCanvas.style.width);
        data.map_edge = settings.map_edge_style;
        data.layer2Map = settings.currentBackground;
        data.layer2_height_width_ratio = backgroundCanvas.heightToWidthRatio;
        data.layer2_width = parseFloat(backgroundCanvas.style.width);
        if (settings.currentBackground) {
            progressFunction("Creating save", `Packaging ${pathModule.basename(settings.currentBackground)}`);
            data.backgroundBase64 = await Util.toBase64(settings.currentBackground);
        }

        if (settings.currentMap) {
            progressFunction("Creating save", `Packaging ${pathModule.basename(settings.currentMap)}`);
            data.foregroundBase64 = await Util.toBase64(settings.currentMap);
        }

        if (settings.map_edge_style) {
            progressFunction("Creating save", `Packaging ${pathModule.basename(settings.map_edge_style)}`);
            data.mapEdgeBase64 = await Util.toBase64(settings.map_edge_style, true);
        }

        if (settings.currentOverlay) {
            data.mapOverlaySize = settings.gridSettings.mapOverlaySize;
            progressFunction("Creating save", `Packaging ${pathModule.basename(settings.currentOverlay)}`);
            data.mapOverlayBase64 = await Util.toBase64(settings.currentOverlay, true);
        }
        data.extensions = {
            mapEdge: data.mapEdgeBase64 ? pathModule.basename(settings.map_edge_style) : null,
            foreground: data.foregroundBase64 ? pathModule.basename(settings.currentMap) : null,
            background: data.backgroundBase64 ? pathModule.basename(settings.currentBackground) : null,
            overlay: data.mapOverlayBase64 ? pathModule.basename(settings.currentOverlay) : null
        }

        fs.writeFile(path, JSON.stringify(data), (err) => {
            if (err) return console.log(err)
        });

    }

    supportedMapTypes() { return dataAccess.supportedMapTypes() }

    loadMapDialog() {

        mapLibrary.open();
    }

    loadMapFileDialog(callback) {
        var extensions = this.supportedMapTypes().concat(constants.imgFilters);
        var path = window.dialog.showOpenDialogSync(
            {
                properties: ['openFile'],
                message: "Choose map",
                filters: [{ name: 'Map', extensions: extensions }]
            })[0];
        if (path == null) return;

        this.loadMapFromPath(path);
        if (callback) callback();
    }

    loadMapFromPath(path) {
        recentMaps.addToPath(path);
        this.lastLoadedMapPath = null;
        if (path.substring(path.lastIndexOf(".") + 1) == "dd2vtt") {
            fovLighting.importDungeondraftVttMap(path);
            return;
        } else if (util.isImage(path)) {
            setMapBackground(null);
            setMapForeground(path.replaceAll("\\", "/"));
            this.removeExistingEffects();
            return;
        }
        var cls = this;
        fs.readFile(path, function (err, data) {
            if (err) {
                dialog.showErrorBox("Unable to open map", "The provided file does not exist");
            }
            data = JSON.parse(data);
            cls.loadMap(data);
        })
    }
    resetAllStates() {

        gridMoveOffsetX = 0;
        gridMoveOffsetY = 0;
        var mapContainer = mapContainers[0];
        nudgePawns(-1 * mapContainer.data_transform_x, -1 * mapContainer.data_transform_y);
        fovLighting.nudgeSegments(-1 * mapContainer.data_transform_x, -1 * mapContainer.data_transform_y);
        moveMap(0, 0);

    }

    removeExistingEffects() {

        effects.forEach(effect => effectManager.removeEffect(effect))
    }
    loadMap(data) {
        var cls = this;
        var mapContainer = mapContainers[0];
        this.resetAllStates();
        zoomIntoMap({ x: 0, y: 0 }, data.bg_scale - mapContainer.data_bg_scale, async () => {
            //  pawns = data.pawns;
            cls.removeExistingEffects();
            var cacheBreaker = `? ${new Date().getTime()}`;
            data.effects.forEach((effect) => cls.restoreEffect(effect));
            fovLighting.setSegments(data.segments);
            foregroundCanvas.heightToWidthRatio = data.bg_height_width_ratio;
            var moveX = mapContainer.data_transform_x - data.mapX;
            var moveY = mapContainer.data_transform_y - data.mapY;
            nudgePawns(moveX, moveY);
            fovLighting.nudgeSegments(moveX, moveY);

            resizeForeground(data.bg_width);


            if (data.foregroundTranslate) {
                var trsl = data.foregroundTranslate;
                foregroundCanvas.data_transform_x = trsl.x;
                foregroundCanvas.data_transform_y = trsl.y;
                foregroundCanvas.style.transform = `translate(${trsl.x}px, ${trsl.y}px)`
            }

            if (data.foregroundBase64)
                data.map = await dataAccess.writeTempFile(`${getTempName("forground", settings.currentMap)}${pathModule.extname(data.extensions.foreground)}`, Buffer.from(data.foregroundBase64, "base64"));
            settings.currentMap = data.map;

            $('#foreground').css('background-image', 'url("' + data.map + cacheBreaker + '")');

            if (data.map_edge || data.mapEdgeBase64) {
                if (data.mapEdgeBase64)
                    data.map_edge = await dataAccess.writeTempFile(`${getTempName("edge", settings.map_edge_style)}${pathModule.extname(data.extensions.mapEdge)}`, Buffer.from(data.mapEdgeBase64, "base64"));
                document.querySelector(".maptool_body").style.backgroundImage = "url('" + data.map_edge + cacheBreaker + "')";
                settings.map_edge_style = data.map_edge;
            }

            fovLighting.drawSegments();


            if (data.backgroundBase64)
                data.layer2Map = await dataAccess.writeTempFile(`${getTempName("background", settings.currentBackground)}${pathModule.extname(data.extensions.background)}`, Buffer.from(data.backgroundBase64, "base64"));

            if (data.mapOverlayBase64)
                data.overlayMap = await dataAccess.writeTempFile(`${getTempName("overlay", settings.currentOverlay)}${pathModule.extname(data.extensions.overlay)}`, Buffer.from(data.mapOverlayBase64, "base64"));
            settings.currentBackground = data.layer2Map;
            backgroundCanvas.heightToWidthRatio = data.layer2_height_width_ratio || backgroundCanvas.heightToWidthRatio;
            setMapBackground(data.layer2Map + cacheBreaker, data.layer2_width);
            setMapOverlay(data.overlayMap + cacheBreaker, data.mapOverlaySize);

            //Map slide
            backgroundLoop.loadSlideState(data);

            saveSettings();

            function getTempName(name, current) {
                var prefix = "temp_";
                console.log(prefix + name, current)
                if (prefix + name == current) {
                    return prefix + name + "1";
                }
                return prefix + name;


            }
        })

    }

    async exportPawn(pawn) {
        var element = pawn[0];
        var img = element.querySelector(".token_photo");
        var images = JSON.parse(img.getAttribute("data-token_facets"));

        var currentIndex = parseInt(img.getAttribute("data-token_current_facet")) || 0;

        var base64 = await util.toBase64(images[currentIndex]);
        pathModule.basename(images[currentIndex]);

        return {
            name: pawn[1],
            id: element.id,
            isPlayer: isPlayerPawn(pawn[0]),
            dead: element.dead,
            deg: element.deg,
            hexes: element.dnd_hexes,
            color: element.style.backgroundColor,
            size: element.dnd_size,
            flying_height: element.flying_height,
            index_in_main_window: element.index_in_main_window,
            sight_mode: element.sight_mode,
            sight_radius_bright_light: element.sight_radius_bright_light,
            sight_radius_dim_light: element.sight_radius_dim_light,
            bgPhotoBase64:base64,
            pos: map.gridCoords(element)
            //attached_objects : element.attached_objects
        }
    }

    restoreEffect(effect) {
        console.log("restoring ", effect)
        var newEffect = document.createElement("div");
        newEffect.style = effect.data_style;
        effect.data_classList.forEach((className) => newEffect.classList.add(className));
        newEffect.style.top = effect.data_y;
        newEffect.style.left = effect.data_x;
        if (effect.bg)
            newEffect.style.backgroundImage = effect.bg;
        newEffect.dnd_height = effect.dnd_height;
        newEffect.dnd_width = effect.dnd_width;
        newEffect.flying_height = effect.flying_height;
        newEffect.sight_radius_bright_light = effect.sight_radius_bright_light;
        newEffect.sight_radius_dim_light = effect.sight_radius_dim_light;
        newEffect.id = `effect_${effectId++}`;
        if (effect.sound) {
            newEffect.sound = effect.sound;
            soundManager.addEffect(effect.sound, newEffect.id);
        }
        tokenLayer.appendChild(newEffect);
        effects.push(newEffect);
        if (newEffect.classList.contains("light_effect")) {
            pawns.lightSources.push(newEffect)
        }

    }
}

module.exports = new SaveManager();