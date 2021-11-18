

class SlideCanvas {
    constructor(canvas) {
        this.slideCanvas = canvas;
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

    }
    toggleBackgroundSlide(button) {
        this.setBackgroundSlide(button.getAttribute("data-slide"));
    }
    setBackgroundSlide(animation) {
        var _this = this;
        this.styleClasses.forEach(cls => _this.slideCanvas.classList.remove(cls));
        var cls;
        var currentAnimation = animation;
        if (this.background_slide_animation_frame) {
            window.cancelAnimationFrame(this.background_slide_animation_frame);
            this.background_slide_animation_frame = null;
        }
        if (!this.slideCanvas.style.backgroundPositionX)
            this.slideCanvas.style.backgroundPositionX = "0";
        if (!this.slideCanvas.style.backgroundPositionY)
            this.slideCanvas.style.backgroundPositionY = "0";
        var loop;

        switch (currentAnimation) {
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
        this.bobMultiplier = parseFloat(document.getElementById("bob_amount_input").value);
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
        }

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
        // .5 * (Math.sin((k - .5) * Math.PI) + 1);
        //    return Math.sin(k);
    }
    updateSlideSpeed() {
        this.background_slide_speed = document.getElementById("slide_speed_input").value;
    }
    saveSlideState(saveObject) {
        var toggledSlideButton = [...document.querySelectorAll(".background_slide_button")].find(x => x.getAttribute("toggled") == "true");
        saveObject.bg_slide_speed = document.getElementById("slide_speed_input").value;
        if (toggledSlideButton) {
            saveObject.bg_slide_type = toggledSlideButton.getAttribute("data-slide");
        }
        if (this.bobAnimation) {
            saveObject.bobMultiplier = parseFloat(document.getElementById("bob_amount_input").value);
            saveObject.bobAnimate = true;
        }
    }
    loadSlideState(data) {

        if (data.bg_slide_type) {
            if (data.bg_slide_speed) document.getElementById("slide_speed_input").value = data.bg_slide_speed;
            var button = [...document.querySelectorAll(".background_slide_button")].find(x => x.getAttribute("data-slide") == data.bg_slide_type);
            button.click();
        }
        if (data.bobAnimate) {
            if (data.bobMultiplier) {
                document.getElementById("bob_amount_input").value = data.bobMultiplier;
                this.updateBobAmount();
            }
            if (!this.bobAnimation)
                document.getElementById("toggle_bob_animation_button").click();
        }
    }
}


module.exports = SlideCanvas;