

class SoundManager {

    SOUND_LIBRARY = [{
        path: "beach ocean.mp3",
        name: "beach ocean"
    },
    {
        path: "blizzard.mp3",
        name: "blizzard"
    },
    { name: 'bubbling cauldron', path: 'bubbling cauldron.mp3' },
    { name: 'bubbling mud', path: 'bubbling mud.mp3' },
    { name: 'dark cave drone', path: 'dark cave drone.mp3' },
    { name: 'fire ambience', path: 'fire ambience.mp3' },
    { name: 'gibbering whispers', path: 'gibbering whispers.mp3' },
    { name: 'mystical cavern ambience', path: 'mystical cavern ambience.mp3' },
    { name: 'ship at sea', path: 'ship at sea.mp3' },
    { name: 'slime', path: 'slime.wav' },
    { name: 'spirits', path: 'spirits.mp3' },
    { name: 'waterfall', path: 'waterfall.mp3' },
    { name: 'wildlife ambience day', path: 'wildlife ambience day.mp3' },
    { name: 'wind from inside', path: 'wind from inside.mp3' },
    { name: 'wind', path: 'wind.mp3' }
    ];

    soundProfiles = {

        "normal": 150,
        "short": 75,
        "far": 250,
        "everywhere": 5000,
    }
    getSoundProfiles() {
        return this.soundProfiles;
    }
    initialize() {
        var basePath = "./client/sounds/";
        this.SOUND_LIBRARY.map(x => x.path = basePath + x.path);
        this.sounds = [];
        this.globalListener = { x: 0, y: 0, z: 1 }
        this.muted = false;
        var cls = this;
        var musicButton = document.getElementById("music_button");
        if (musicButton)
            musicButton.onclick = () => cls.toggleMute();
    }

    effectZValue() {
        return 1;
    }
    adjustPlacement(elementId, x, y) {
        var found = this.sounds.find(x => x.elementId == elementId);
        var z = this.effectZValue() + Math.random();
        if (!found) return;
        found.howl.pos(x, y, z, found.soundId);
    }
    toggleMute() {
        var btn = document.getElementById("music_button");
        this.muted = !this.muted;
        if (btn)
            btn.setAttribute("toggled", this.muted ? "false" : "true");
        Howler.mute(this.muted);
    }
    updatePlayingStatus() {
        var btn = document.getElementById("music_button");
        if (!btn)
            return;

        if (this.sounds.find(x => x.howl.playing())) {
            btn.classList.add("sounds_playing");
        } else {
            btn.classList.remove("sounds_playing");
        }
    }

    removeSound(soundId) {
        var found = this.sounds.find(x => x.soundId == soundId);
        if (!found) return;
        found.howl.unload()
        this.sounds = this.sounds.filter(x => x.soundId != soundId);
        this.updatePlayingStatus();
    }
    removeEffect(effect) {
        var found = this.sounds.find(x => x.elementId == effect.id);
        if (found) {
            found.howl.unload()
        }

        this.sounds = this.sounds.filter(x => x.elementId != effect.id);
        this.updatePlayingStatus();
    }

    globalVolume(volume) {
        Howler.volume(volume);

    }

    addGlobalSound(src, volume) {
        var soundEffect = new Howl({
            src: [src],
            html5: true,
            loop: true,
            volume: 0.75
        });

        var soundId = soundEffect.play();
        var cls = this;
        soundEffect.once('play', function () {
            soundEffect.volume(volume || 1, soundId);
            cls.updatePlayingStatus();
        });
        this.sounds.push(
            { howl: soundEffect, soundId: soundId }
        );
        return soundId;
    }

    async addEffect(effect, elementId) {
        var info = await this.getSoundInfo(effect.src);

        if (!info) {
            console.log(`Sound ${effect.src} not found in library`);
            return;
        }
        console.log("add effect", info)
        var cls = this;
        var soundEffect = new Howl({
            src: [info.path],
            html5: true,
            loop: true,
            volume: 0.75,
            onload: () => {
                var soundId = soundEffect.play();
                // Set the position of the speaker in 3D space.
                soundEffect.pos(effect.x, effect.y, cls.effectZValue(), soundId);
                soundEffect.volume(effect.volume || 1, soundId);
                var refDist = cls.soundProfiles[effect.distance];
                soundEffect.pannerAttr({
                    panningModel: 'equalpower',
                    refDistance: refDist,
                    rolloffFactor: 3,
                    distanceModel: 'exponential'
                }, soundId);
                cls.updatePlayingStatus();

                if (!cls.sounds.find(x => x.soundId == soundId))
                    cls.sounds.push(
                        { howl: soundEffect, soundId: soundId, elementId: elementId }
                    );
            },
            onerror: (err) => { console.error(err) }
        });


    }
    multiplier() {
        return 15;
    }
    setListenerCords(x, y, z) {

        if (x)
            this.globalListener.x = x;
        if (y)
            this.globalListener.y = y;
        if (z)
            this.globalListener.z = z;

        if (this.LISTENER_POS_MARKER) {
            this.LISTENER_POS_MARKER.style.top = this.globalListener.y + "px";
            this.LISTENER_POS_MARKER.style.left = this.globalListener.x + "px";
        }
        Howler.pos(this.globalListener.x, this.globalListener.y, this.globalListener.z);


    }

    displayGlobalListenerPosition() {
        var ele = Util.ele("div", "global_listener_position_icon");
        this.LISTENER_POS_MARKER = Util.fadeOutInfoBox(ele, { x: this.globalListener.x, y: this.globalListener.y }, onFadeOut);
        var cls = this;
        function onFadeOut() {
            cls.LISTENER_POS_MARKER = null;
        }
    }
    async getSoundInfo(soundName) {
        var sounds = await this.getAvailableSounds();
        console.log(sounds)
        return sounds.find(x => {
            console.log(x)

            var basename = x.path.substring(x.path.lastIndexOf("/") + 1, x.path.lastIndexOf("."));
            console.log(basename)
            return soundName.toLowerCase() == basename.toLowerCase();
        });
    }

    async getAvailableSounds() {

        return this.SOUND_LIBRARY;

    }

}
