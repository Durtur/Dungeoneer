
class SaveManager {

    saveCurrentMap() {
        var path = dialog.showSaveDialogSync(
            remote.getCurrentWindow(),
            {
                filters: [{ name: 'Map', extensions: ['dungeoneer_map'] }],
                title: "Save",
                defaultPath: "map"
            });

        if (path == null) return;
        resetEverything();
        var mapX = mapContainer.data_transform_x;
        var mapY = mapContainer.data_transform_y;
        nudgePawns(-1 * mapX, -1 * mapY);
        fovLighting.nudgeSegments(-1 * mapX, -1 * mapY);
        moveMap(0, 0);
        var data = {};
        /*
                var pawnsToSave = [...pawns.all].filter(paw => !isPlayerPawn(paw));
                data.pawns = [];
            
                pawnsToSave.forEach(p => {
                    data.pawns.push({
                        html: p.outerHTML,
                        lightEffect: isLightEffect(p),
                        sightRadius: { b: p.sight_radius_bright_light, d: p.sight_radius_dim_light },
                        dnd_hexes : p.dnd_hexes,
                        dnd_size : p.dnd_size,
                        sight_mode : p.sight_mode,
                        "data-dnd_conditions": p["data-dnd_conditions"],
                        flying_height: p.flying_height
    
                    })
                })
                */
        //data.pawns = pawnsToSave;
        data.moveOffsetX = gridMoveOffsetX;
        data.moveOffsetY = gridMoveOffsetY;
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
        data.effects = effectsToAdd;
        data.map = settings.currentMap;
        data.mapX = mapContainer.data_transform_x;
        data.mapY = mapContainer.data_transform_y;
        data.bg_scale = mapContainer.data_bg_scale;
        data.foregroundTranslate = { x: foregroundCanvas.data_transform_x, y: foregroundCanvas.data_transform_y }

        data.segments = fovLighting.getSegments();

        data.bg_height_width_ratio = foregroundCanvas.heightToWidthRatio;
        data.bg_width = parseFloat(foregroundCanvas.style.width);
        data.map_edge = settings.map_edge_style;
        data.layer2Map = settings.currentBackground;
        data.layer2_height_width_ratio = backgroundCanvas.heightToWidthRatio;
        data.layer2_width = parseFloat(backgroundCanvas.style.width);
        fs.writeFile(path, JSON.stringify(data), (err) => {
            if (err) return console.log(err)
        });

    }
    supportedMapTypes() { return ['dungeoneer_map', "dd2vtt"] }

    loadMapDialog() {
        var extensions = this.supportedMapTypes();
        var path = dialog.showOpenDialogSync(

            remote.getCurrentWindow(),
            {
                properties: ['openFile'],
                message: "Choose map",
                filters: [{ name: 'Map', extensions: extensions }]
            })[0];
        if (path == null) return;

        this.loadMapFromPath(path);

    }

    loadMapFromPath(path) {
        if (path.substring(path.lastIndexOf(".") + 1) == "dd2vtt") {
            fovLighting.importDungeondraftVttMap(path);
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

    loadMap(data) {
        var cls = this;
        zoomIntoMap({ x: 1, y: 1 }, -10);
        window.setTimeout(() => {
            //  pawns = data.pawns;
            // gridMoveOffsetX = data.moveOffsetX;
            // gridMoveOffsetY = data.moveOffsetY;
            gridMoveOffsetX = 0;
            gridMoveOffsetY =0;

            foregroundCanvas.heightToWidthRatio = data.bg_height_width_ratio
            data.effects.forEach((effect) => cls.restoreEffect(effect));
            fovLighting.setSegments(data.segments);
            resizeForeground(data.bg_width);
            mapContainer.data_transform_x = data.mapX;
            mapContainer.data_transform_y = data.mapY;
            mapContainer.data_bg_scale = data.bg_scale;
            moveMap(data.mapX, data.mapY);

            if (data.foregroundTranslate) {
                var trsl = data.foregroundTranslate;
                foregroundCanvas.data_transform_x = trsl.x;
                foregroundCanvas.data_transform_y = trsl.y;
                foregroundCanvas.style.transform = `translate(${trsl.x}px, ${trsl.y}px)`

            }

            settings.currentMap = data.map;

            $('#foreground').css('background-image', 'url("' + data.map + '")');

            if (data.map_edge) {
                document.querySelector(".maptool_body").style.backgroundImage = "url('" + data.map_edge + "')";
                settings.map_edge_style = data.map_edge;
            }

            fovLighting.drawSegments();
            settings.currentBackground = data.layer2Map;
            backgroundCanvas.heightToWidthRatio = data.layer2_height_width_ratio || backgroundCanvas.heightToWidthRatio;
            setMapBackground(data.layer2Map, data.layer2_width);
            //Light effects
            // var oldEffects = [...tokenLayer.getElementsByClassName("light_effect")];
            // while (oldEffects.length > 0) {
            //     var oldEffect = oldEffects.pop();
            //     pawns.lightSources = pawns.lightSources.filter(item => item !== oldEffect)

            //     tokenLayer.removeChild(oldEffect);
            // }

            // //Standard effects
            // oldEffects = [...tokenLayer.getElementsByClassName("sfx_effect")];
            // while (oldEffects.length > 0) {
            //     var oldEffect = oldEffects.pop();
            //     pawns.lightSources = pawns.lightSources.filter(item => item !== oldEffect)

            //     tokenLayer.removeChild(oldEffect);
            // }
            // if (data.pawns) {
            //     data.pawns.forEach((p) => {
            //         var newP = document.createElement("div");


            //         if (p.lightEffect)
            //             pawns.lightEffects.push(newP);
            //         newP.sight_radius_bright_light = p.sightRadius.b;
            //         newP.sight_radius_dim_light = p.sightRadius.d;
            //         newP.dnd_hexes = p.dnd_hexes;

            //         newP.dnd_size = p.dnd_size;
            //         newP.sight_mode = p.sight_mode;
            //         newP["data-dnd_conditions"] = p["data-dnd_conditions"];
            //         newP.flying_height = p.flying_height;
            //         tokenLayer.appendChild(newP);
            //         newP.outerHTML = p.html;
            //     })
            //     refreshPawns();
            //     resizePawns();
            //     addPawnListeners();
            //     nudgePawns();
            // }
            zoomIntoMap({ x: 1, y: 1 }, -10);
            saveSettings();

        }, 300)

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