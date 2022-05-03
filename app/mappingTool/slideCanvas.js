

class SlideCanvas {
    constructor(canvas, menuId, onSlideChanged) {
        this.slideCanvas = canvas;
        this.menu = document.getElementById(menuId);
        this.background_slide_speed = 1;
        this.background_slide_animation_frame = null;
        this.direction = 1;
        this.styleClasses = ["background_repeat_x", "background_repeat_y"];
        this.bobStep = 0.01;
        this.bobCountX = 0.5;
        this.bobCountY = 0;
        this.bobMultiplier = 1;
        this.dirX = 1;
        this.dirY = -1;
        this.bobAnimation = null;
        this.bobAnimationFrame = null;
        this.onSlideChanged = onSlideChanged;

    }

    saveSlideState(saveObject) {
        saveObject.bg_slide_speed = this.background_slide_speed;
        saveObject.bg_slide_type = this.currentAnimation;
        if (this.bobAnimation) {
            saveObject.bobMultiplier = this.bobMultiplier;
            saveObject.bobAnimate = true;
        }
    }

    toggleBackgroundSlide(button) {

        if (button.getAttribute("toggled") == "true") {
            this.setBackgroundSlide(null);
        } else {
            this.setBackgroundSlide(button.getAttribute("data-slide"));
        }
    }

    notifyChanges() {
        if (this.onSlideChanged) {
            var obj = {};
            this.saveSlideState(obj);
            this.onSlideChanged(obj);
        }

    }
    setBackgroundSlide(animation) {

        var _this = this;
        this.styleClasses.forEach(cls => _this.slideCanvas.classList.remove(cls));
        var cls;
        this.currentAnimation = animation;
        this.notifyChanges();
        if (this.background_slide_animation_frame) {
            window.cancelAnimationFrame(this.background_slide_animation_frame);
            this.background_slide_animation_frame = null;
            if (animation == null) {
                this.slideCanvas.style.backgroundPositionX = "0";
                this.slideCanvas.style.backgroundPositionY = "0";

                return;
            }
        }
        if (!this.slideCanvas.style.backgroundPositionX)
            this.slideCanvas.style.backgroundPositionX = "0";
        if (!this.slideCanvas.style.backgroundPositionY)
            this.slideCanvas.style.backgroundPositionY = "0";
        var loop;

        switch (this.currentAnimation) {
            case "slideXReverse": {
                loop = slideLoopX;
                this.direction = -1;
                cls = this.styleClasses[0];
                break;
            }
            case "slideX": {
                loop = slideLoopX;
                this.direction = 1;
                cls = this.styleClasses[0];
                break;
            }
            case "slideYReverse": {
                loop = slideLoopY;
                this.direction = -1;
                cls = this.styleClasses[1];
                break;
            }
            case "slideY": {
                loop = slideLoopY;
                this.direction = 1;
                cls = this.styleClasses[1];
                break;
            }
            default: {
                return;
            }

        }
        if (!this.slideCanvas.classList.contains("background_repeat"))
            this.slideCanvas.classList.add(cls);
        this.background_slide_animation_frame = window.requestAnimationFrame(loop);
        function slideLoopX() {
            var curr = parseFloat(_this.slideCanvas.style.backgroundPositionX);
            _this.slideCanvas.style.backgroundPositionX = (curr + (_this.background_slide_speed * _this.direction)) + "px";
            _this.background_slide_animation_frame = window.requestAnimationFrame(slideLoopX);
        }
        function slideLoopY() {
            var curr = parseFloat(_this.slideCanvas.style.backgroundPositionY);
            _this.slideCanvas.style.backgroundPositionY = (curr + (_this.background_slide_speed * _this.direction)) + "px";
            _this.background_slide_animation_frame = window.requestAnimationFrame(slideLoopY);
        }

    }


    updateBobAmount() {
        this.bobMultiplier = parseFloat(this.menu.querySelector(".bob_amount_input").value);
        this.notifyChanges();
    }

    toggleBobAnimation() {
        var cls = this;
        this.bobAnimation = !this.bobAnimation;
        if (this.bobAnimation) {
            this.slideCanvas.classList.add("background_repeat")
            this.bobAnimationFrame = window.requestAnimationFrame(bobAnimate)
        } else {
            window.cancelAnimationFrame(this.bobAnimationFrame);
            this.slideCanvas.classList.remove("background_repeat")
            this.slideCanvas.style.backgroundPositionX = "0";
            this.slideCanvas.style.backgroundPositionY = "0";
        }
        this.notifyChanges();

        function bobAnimate() {

            cls.bobCountX += cls.bobStep;
            cls.bobCountY += cls.bobStep;
            var valX = 1 - cls.easinOut(cls.bobCountX);
            valX *= cls.bobMultiplier;

            var valY = cls.easinOut(cls.bobCountY)
            valY *= cls.bobMultiplier;
            var currX = parseFloat(cls.slideCanvas.style.backgroundPositionX) || 0;
            cls.slideCanvas.style.backgroundPositionX = (currX + valX * cls.dirX) + "px";

            var currY = parseFloat(cls.slideCanvas.style.backgroundPositionY) || 0;
            cls.slideCanvas.style.backgroundPositionY = (currY + valY * cls.dirY) + "px";

            if (cls.bobCountY >= 1) {
                cls.bobCountY = 0;
                cls.dirY *= -1;

            }

            if (cls.bobCountX >= 1) {
                cls.bobCountX = 0;
                cls.dirX *= -1;

            }
            cls.bobAnimationFrame = window.requestAnimationFrame(bobAnimate);
        }

    }

    easinOut(k) {

        return Math.pow(k, 1.675);

    }
    updateSlideSpeed() {
        this.background_slide_speed = this.menu.querySelector(".slide_speed_input").value;
        this.notifyChanges();
    }

    loadSlideState(data) {
        if(!data){
            data = {};
        }
        if (data.bg_slide_type) {
            if (data.bg_slide_speed) {
                this.background_slide_speed = data.bg_slide_speed;
                if (this.menu)
                    this.menu.querySelector(".slide_speed_input").value = data.bg_slide_speed;
            }
            if (this.menu) {
          
                var button = [...this.menu.querySelectorAll(".background_slide_button")].find(x => x.getAttribute("data-slide") == data.bg_slide_type);
                console.log( [...this.menu.querySelectorAll(".background_slide_button")])
                if (button)
                    button.click();
            } else {
                this.setBackgroundSlide(data.bg_slide_type);
            }

        } else {
            this.setBackgroundSlide(null);
        }
        if (data.bobAnimate) {
            if (data.bobMultiplier) {
                if (this.menu) {
                    this.menu.querySelector(".bob_amount_input").value = data.bobMultiplier;
                    this.updateBobAmount();
                } else {
                    this.bobMultiplier = data.bobMultiplier;
                }
            }
            if (!this.bobAnimation) {
                if (this.menu) {
                    this.menu.querySelector(".toggle_bob_animation_button").click();
                } else {
                    this.toggleBobAnimation()
                }
            }
        } else {
            if (this.bobAnimation) {
                if (this.menu) {
                    this.menu.querySelector(".toggle_bob_animation_button").click();
                } else {
                    this.toggleBobAnimation()
                }
            }
        }

    }
}


module.exports = SlideCanvas;