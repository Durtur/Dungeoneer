const util = require("../js/util");

class SaveManager {
    async saveCurrentMap() {
        var path = this.lastLoadedMapPath
            ? this.lastLoadedMapPath
            : window.dialog.showSaveDialogSync({
                  filters: [{ name: "Map", extensions: ["dungeoneer_map"] }],
                  title: "Save",
                  defaultPath: "map",
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
                dnd_width: effects[i].dnd_width,
            };
            effectsToAdd.push(newEff);
        }
        var mapContainer = mapContainers[0];
        data.effects = effectsToAdd;
        data.map = settings.currentMap ? pathModule.basename(settings.currentMap) : null;
        data.mapX = mapContainer.data_transform_x;
        data.mapY = mapContainer.data_transform_y;
        data.bg_scale = mapContainer.data_bg_scale;
        data.foregroundTranslate = { x: foregroundCanvas.data_transform_x, y: foregroundCanvas.data_transform_y };

        data.segments = fovLighting.getSegments();

        //Map slide
        backgroundLoop.saveSlideState(data);

        data.bg_height_width_ratio = foregroundCanvas.heightToWidthRatio;
        data.bg_width = parseFloat(foregroundCanvas.style.width);
        data.map_edge = settings.map_edge_style ? pathModule.basename(settings.map_edge_style) : null;
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
            data.mapEdgeBase64 = await Util.toBase64(settings.map_edge_style);
        }

        if (settings.currentOverlay) {
            data.mapOverlaySize = settings.gridSettings.mapOverlaySize;
            progressFunction("Creating save", `Packaging ${pathModule.basename(settings.currentOverlay)}`);
            data.mapOverlayBase64 = await Util.toBase64(settings.currentOverlay);
        }
        data.extensions = {
            mapEdge: data.mapEdgeBase64 ? pathModule.basename(settings.map_edge_style) + ".webp" : null,
            foreground: data.foregroundBase64 ? pathModule.basename(settings.currentMap) + ".webp" : null,
            background: data.backgroundBase64 ? pathModule.basename(settings.currentBackground) + ".webp" : null,
            overlay: data.mapOverlayBase64 ? pathModule.basename(settings.currentOverlay) + ".webp" : null,
        };
        data.backgroundSlide = {};
        data.overlaySlide = {};
        backgroundLoop.saveSlideState(data.backgroundSlide);
        overlayLoop.saveSlideState(data.overlaySlide);

        fs.writeFile(path, JSON.stringify(data), (err) => {
            if (err) return console.log(err);
        });
    }

    supportedMapTypes() {
        return dataAccess.supportedMapTypes();
    }

    loadMapDialog() {
        mapLibrary.open();
    }

    loadMapFileDialog(callback) {
        var extensions = this.supportedMapTypes().concat(constants.imgFilters);
        var path = window.dialog.showOpenDialogSync({
            properties: ["openFile"],
            message: "Choose map",
            filters: [{ name: "Map", extensions: extensions }],
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
            setMapOverlay(null);
            setMapBackground(null);
            fovLighting.setSegments([]);
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
        });
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
        effects.forEach((effect) => effectManager.removeEffect(effect));
    }
    loadMap(data) {
        var cls = this;
        var mapContainer = mapContainers[0];
        this.resetAllStates();
        zoomIntoMap({ x: 0, y: 0 }, data.bg_scale - mapContainer.data_bg_scale, async () => {
            //  pawns = data.pawns;
            cls.removeExistingEffects();
            var cacheBreaker = `? ${new Date().getTime()}`;

            fovLighting.setSegments(data.segments);
            foregroundCanvas.heightToWidthRatio = data.bg_height_width_ratio;
            var moveX = mapContainer.data_transform_x - data.mapX;
            var moveY = mapContainer.data_transform_y - data.mapY;
            nudgePawns(moveX, moveY);
            fovLighting.nudgeSegments(moveX, moveY);

            if (data.foregroundTranslate) {
                var trsl = data.foregroundTranslate;
                foregroundCanvas.data_transform_x = trsl.x;
                foregroundCanvas.data_transform_y = trsl.y;
                foregroundCanvas.style.transform = `translate(${trsl.x}px, ${trsl.y}px)`;
            }

            if (data.foregroundBase64)
                data.map = await dataAccess.writeTempFile(
                    `${getTempName("forground", settings.currentMap)}${pathModule.extname(data.extensions.foreground)}`,
                    Buffer.from(data.foregroundBase64, "base64")
                );
            settings.currentMap = data.map;

            setMapForeground(data.map + cacheBreaker, data.bg_width);

            if (data.map_edge || data.mapEdgeBase64) {
                if (data.mapEdgeBase64)
                    data.map_edge = await dataAccess.writeTempFile(
                        `${getTempName("edge", settings.map_edge_style)}${pathModule.extname(data.extensions.mapEdge)}`,
                        Buffer.from(data.mapEdgeBase64, "base64")
                    );
                document.querySelector(".maptool_body").style.backgroundImage = "url('" + data.map_edge + cacheBreaker + "')";
                settings.map_edge_style = data.map_edge;
            }

            fovLighting.drawSegments();

            if (data.backgroundBase64)
                data.layer2Map = await dataAccess.writeTempFile(
                    `${getTempName("background", settings.currentBackground)}${pathModule.extname(data.extensions.background)}`,
                    Buffer.from(data.backgroundBase64, "base64")
                );

            if (data.mapOverlayBase64)
                data.overlayMap = await dataAccess.writeTempFile(
                    `${getTempName("overlay", settings.currentOverlay)}${pathModule.extname(data.extensions.overlay)}`,
                    Buffer.from(data.mapOverlayBase64, "base64")
                );
            settings.currentBackground = data.layer2Map;
            backgroundCanvas.heightToWidthRatio = data.layer2_height_width_ratio || backgroundCanvas.heightToWidthRatio;
            setMapBackground(data.layer2Map ? data.layer2Map + cacheBreaker : null, data.layer2_width);
            setMapOverlay(data.overlayMap ? data.overlayMap + cacheBreaker : null, data.mapOverlaySize);

            //Map slide
            backgroundLoop.loadSlideState(data.backgroundSlide);
            overlayLoop.loadSlideState(data.overlaySlide);

            if (data.effects) {
                console.log(data.effects);
                data.effects.forEach((eff) => this.restoreEffect(eff));
            }
            saveSettings();

            function getTempName(name, current) {
                var prefix = "temp_";
                console.log(prefix + name, current);
                if (prefix + name == current) {
                    return prefix + name + "1";
                }
                return prefix + name;
            }
        });
    }
    async exportEffect(effect) {
        var obj = {
            angle: effect.getAttribute("data-deg"),
            classes: [],
            width: effect.dnd_width,
            height: effect.dnd_height,
            sound: effect.sound,
            id: effect.id,
            brightLightRadius: effect.sight_radius_bright_light,
            dimLightRadius: effect.sight_radius_dim_light,
            isLightEffect: effect.sight_radius_dim_light > 0 || effect.sight_radius_bright_light > 0,
            pos: map.objectGridCoords(effect),
            bgPhotoBase64: await util.toBase64(util.decssify(effect.style.backgroundImage)),
        };

        var classes = effect.getAttribute("data-effect-classes");
        if (classes) {
            try {
                obj.classes = JSON.parse(classes);
            } catch {
                obj.classes = [];
            }
        }
        return obj;
    }

    async exportMobTokens(pawn) {
        var allTokens = [...pawn.querySelectorAll(".mob_token")].filter((x) => !x.classList.contains("mob_token_dead"));
        var tokenPaths = allTokens.map((ele) => ele.getAttribute("data-token_path"));

        var distinctTokens = [...new Set(tokenPaths)];
        var imgMap = {};
        for (var i = 0; i < distinctTokens.length; i++) {
            var basename = pathModule.basename(distinctTokens[i]);
            imgMap[basename] = await Util.toBase64(distinctTokens[i]);
        }

        return {
            map: imgMap,
            tokens: tokenPaths.map((x) => pathModule.basename(x)),
            id: pawn.id,
            mobSize: parseInt(pawn.getAttribute("data-mob_size")),
        };
    }

    async exportPawn(pawn) {
        var element = pawn[0];
        var img = element.querySelector(".token_photo");

        var mobSizeAttr = element.getAttribute("data-mob_size");
        var deadCount = element.getAttribute("data-mob_dead_count");
        var mobSize = mobSizeAttr == null ? null : parseInt(mobSizeAttr) - parseInt(deadCount);
        var isMob = mobSize != null;
        if (img == null && !isMob) return null;

        var images = img ? JSON.parse(img.getAttribute("data-token_facets")) : null;
        var currentIndex = img ? parseInt(img.getAttribute("data-token_current_facet")) || 0 : null;
        var darkVisionRadius = element.sight_mode == "darkvision" ? element.sight_radius_bright_light : null;
        var currentPath = img ? images[currentIndex] || DEFAULT_TOKEN_PATH_JS_RELATIVE : null;
        var base64 = currentPath ? await util.toBase64(currentPath) : null;
        var scale = pawnManager.getScale(pawn[0]);
        console.log(pawnManager.isDead(pawn[0]));
        return {
            name: pawn[1],
            id: element.id,
            isPlayer: isPlayerPawn(pawn[0]),
            dead: pawnManager.isDead(element) + "",
            isMob: isMob,
            mobSize: mobSize,
            mobCountDead: 0,
            mobTokens: isMob ? await this.exportMobTokens(element) : null,
            deg: element.deg,
            hexes: element.dnd_hexes,
            color: element.style.backgroundColor,
            health_percentage: element.data_health_percentage || "100",
            scale: scale,
            size: element.dnd_size,
            flying_height: element.flying_height,
            index_in_main_window: element.index_in_main_window,
            sight_mode: element.sight_mode,
            sight_radius_bright_light: element.sight_radius_bright_light,
            sight_radius_dim_light: element.sight_radius_dim_light,
            bgPhotoBase64: base64,
            pos: map.objectGridCoords(element),
            darkVisionRadius: darkVisionRadius,
        };
    }

    restoreEffect(effect) {
        console.log("restoring ", effect);
        var newEffect = document.createElement("div");
        newEffect.style = effect.data_style;
        effect.data_classList.forEach((className) => newEffect.classList.add(className));
        newEffect.style.top = effect.data_y;
        newEffect.style.left = effect.data_x;
        if (effect.bg) newEffect.style.backgroundImage = effect.bg;
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
            pawns.lightSources.push(newEffect);
        }
    }
}

module.exports = new SaveManager();
