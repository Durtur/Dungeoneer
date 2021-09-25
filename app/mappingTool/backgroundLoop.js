

var backgroundLoop = function () {
    var background_slide_animation_frame;
    var background_slide_speed = 1, direction;
    var styleClasses = ["background_repeat_x", "background_repeat_y"]
    var slideCanvas = document.querySelector("#background");
    var currentAnimation;
    function toggleBackgroundSlide(button) {
        setBackgroundSlide(button.getAttribute("data-slide"));
    }
    function setBackgroundSlide(animation) {

        styleClasses.forEach(cls => slideCanvas.classList.remove(cls));
        var cls;
        var currentAnimation = animation;
        if (background_slide_animation_frame) {
            window.cancelAnimationFrame(background_slide_animation_frame);
            background_slide_animation_frame = null;
        }
        if (!slideCanvas.style.backgroundPositionX)
            slideCanvas.style.backgroundPositionX = "0";
        if (!slideCanvas.style.backgroundPositionY)
            slideCanvas.style.backgroundPositionY = "0";
        var loop;

        switch (currentAnimation) {
            case "slideXReverse": {
                loop = slideLoopX;
                direction = -1;
                cls = styleClasses[0];
                break;
            }
            case "slideX": {
                loop = slideLoopX;
                direction = 1;
                cls = styleClasses[0];
                break;
            }
            case "slideYReverse": {
                loop = slideLoopY;
                direction = -1;
                cls = styleClasses[1];
                break;
            }
            case "slideY": {
                loop = slideLoopY;
                direction = 1;
                cls = styleClasses[1];
                break;
            }
            default: {
                return;
            }

        }
        if (!slideCanvas.classList.contains("background_repeat"))
            slideCanvas.classList.add(cls);
        background_slide_animation_frame = window.requestAnimationFrame(loop);
        function slideLoopX() {
            var curr = parseFloat(slideCanvas.style.backgroundPositionX);
            slideCanvas.style.backgroundPositionX = (curr + (background_slide_speed * direction)) + "px";
            background_slide_animation_frame = window.requestAnimationFrame(slideLoopX);
        }
        function slideLoopY() {
            var curr = parseFloat(slideCanvas.style.backgroundPositionY);
            slideCanvas.style.backgroundPositionY = (curr + (background_slide_speed * direction)) + "px";
            background_slide_animation_frame = window.requestAnimationFrame(slideLoopY);
        }
    }

    var bobStep = 0.01;
    var bobCountX = 0.5;
    var bobCountY = 0;
    var bobMultiplier = 1;
    var dirX = 1, dirY = -1;
    var bobAnimation, bobAnimationFrame;

    function updateBobAmount() {
        bobMultiplier = parseFloat(document.getElementById("bob_amount_input").value);
    }

    function toggleBobAnimation() {
        bobAnimation = !bobAnimation;
        if (bobAnimation) {
            slideCanvas.classList.add("background_repeat")
            bobAnimationFrame = window.requestAnimationFrame(bobAnimate);
        } else {
            window.cancelAnimationFrame(bobAnimationFrame);
            slideCanvas.classList.remove("background_repeat")
        }

    }

    function bobAnimate() {
        bobCountX += bobStep;
        bobCountY += bobStep;
        var valX = 1 - easinOut(bobCountX);
        valX *= bobMultiplier;

        var valY = easinOut(bobCountY)
        valY *= bobMultiplier;
        var currX = parseFloat(slideCanvas.style.backgroundPositionX) || 0;
        slideCanvas.style.backgroundPositionX = (currX + valX * dirX) + "px";

        var currY = parseFloat(slideCanvas.style.backgroundPositionY) || 0;
        slideCanvas.style.backgroundPositionY = (currY + valY * dirY) + "px";
        console.log(bobCountY)
        if (bobCountY >= 1) {
            bobCountY = 0;
            dirY *= -1;

        }

        if (bobCountX >= 1) {
            bobCountX = 0;
            dirX *= -1;

        }
        bobAnimationFrame = window.requestAnimationFrame(bobAnimate);
    }

    function easinOut(k) {

        return Math.pow(k, 1.675);
        // .5 * (Math.sin((k - .5) * Math.PI) + 1);
        //    return Math.sin(k);
    }

    function updateSlideSpeed() {
        background_slide_speed = document.getElementById("slide_speed_input").value;
    }

    function saveSlideState(saveObject) {
        var toggledSlideButton = [...document.querySelectorAll(".background_slide_button")].find(x => x.getAttribute("toggled") == "true");
        saveObject.bg_slide_speed = document.getElementById("slide_speed_input").value;
        if (toggledSlideButton) {
            saveObject.bg_slide_type = toggledSlideButton.getAttribute("data-slide");
        }
        if (bobAnimation) {
            saveObject.bobMultiplier = parseFloat(document.getElementById("bob_amount_input").value);
            saveObject.bobAnimate = true;
        }
    }

    function loadSlideState(data) {

        if (data.bg_slide_type) {
            if (data.bg_slide_speed) document.getElementById("slide_speed_input").value = data.bg_slide_speed;
            var button = [...document.querySelectorAll(".background_slide_button")].find(x => x.getAttribute("data-slide") == data.bg_slide_type);
            button.click();
        }
        if (data.bobAnimate) {
            if (data.bobMultiplier) {
                document.getElementById("bob_amount_input").value = data.bobMultiplier;
                updateBobAmount();
            }
            if (!bobAnimation)
                document.getElementById("toggle_bob_animation_button").click();
        }
    }

    return {
        updateBobAmount: updateBobAmount,
        saveSlideState: saveSlideState,
        loadSlideState: loadSlideState,
        toggleBackgroundSlide: toggleBackgroundSlide,
        setBackgroundSlide: setBackgroundSlide,
        updateSlideSpeed: updateSlideSpeed,
        toggleBobAnimation: toggleBobAnimation
    }
}();

module.exports = backgroundLoop;