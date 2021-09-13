
// const { Howl, Howler} = require('howler');
class SoundManager {
    initialize() {
        this.sounds = [];
        this.globalListener = { x: 0, y: 0, z:1 }

    }

    effectZValue() {
        return 0;
    }
    adjustPlacement(elementId, x, y) {
        var found = this.sounds.find(x => x.elementId == elementId);

        found.howl.pos(x, y, this.effectZValue(), found.soundId);

    }

    removeEffect(effect) {
        console.log(effect)

        var found = this.sounds.find(x => x.elementId == effect.id);
        found.howl.unload()
        this.sounds = this.sounds.filter(x => x.elementId == effect.id);
    }
    addEffect(effect, elementId) {
        var soundEffect = new Howl({
            src: [effect.src],
            // html5: true,
            loop: true,
            volume: 0.75
        });

        var soundId = soundEffect.play();
        var cls = this;
        soundEffect.once('play', function () {
            // Set the position of the speaker in 3D space.
            soundEffect.pos(effect.x, effect.y, cls.effectZValue(), soundId);
            soundEffect.volume(1, soundId);
            var refDist = 400;
            soundEffect.pannerAttr({
                panningModel: 'HRTF',
                refDistance: refDist,
                rolloffFactor: 2.5,
                distanceModel: 'exponential'
            }, soundId);
        });
        this.sounds.push(
            { howl: soundEffect, soundId: soundId, elementId: elementId }
        );
    }
    multiplier() {
        return 100;
    }
    setListenerCords(x, y, z) {
        console.log(x,y)
        if (x)
            this.globalListener.x = x;
        if (y)
            this.globalListener.y = y;
        if (z)
            this.globalListener.y = z;
        Howler.pos(this.globalListener.x , this.globalListener.y, this.globalListener.z);


    }

}
module.exports = SoundManager;