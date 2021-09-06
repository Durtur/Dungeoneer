const { extname } = require("path");

module.exports = function () {
    function IsVowel(letter) {
        return ["a", "e", "i", "o", "u", "y"].includes(letter.toLowerCase());
    }

    function showInfo(title, text) {
        var newEle = document.createElement("div");
        var para = document.createElement("p");
        para.innerHTML = text;
        var heading = document.createElement("h2");
        heading.innerHTML = title;
        newEle.classList = "info_popup";
        newEle.appendChild(heading);
        newEle.appendChild(para);
        newEle.style.top = window.innerHeight / 2 - newEle.clientHeight / 2 + "px";
        newEle.style.left = window.innerWidth / 2 - newEle.clientWidth / 2 + "px";
        document.body.appendChild(newEle);
        window.setTimeout(function (evt) {
            newEle.classList.add("fade_out");
            if (newEle.parentNode) newEle.parentNode.removeChild(newEle);
        }, 6000);
    }

    function showBubblyText(text, point, smallfont, multiple) {
        var newEle = document.createElement("div");

        newEle.innerHTML = text;
        newEle.classList.add("roll_result_effect");
        if (!multiple)
            [...document.getElementsByClassName("roll_result_effect")].forEach(ele => ele.parentNode.removeChild(ele));
        document.body.appendChild(newEle);
        if (smallfont)
            newEle.style.fontSize = "18px";
        newEle.style.top = point.y - newEle.clientHeight / 2 + "px";
        newEle.style.left = point.x - newEle.clientWidth / 2 + "px";

        window.setTimeout(function (evt) {
            newEle.classList.add("fade_out");
            if (newEle.parentNode) newEle.parentNode.removeChild(newEle);
        }, 3000);
    }

    function showSuccessMessage(text) {
        showMessage(text, "success");
    }

    function showFailedMessage(text) {
        showMessage(text, "failed");
    }

    function showMessage(text, messageType) {
        var newEle = document.createElement("p");
        newEle.innerHTML = text;
        newEle.classList.add("popup_message");
        newEle.classList.add(messageType + "_message");
        document.body.appendChild(newEle);

        window.setTimeout(function (evt) {
            newEle.classList.add("fade_out");
            newEle.parentNode.removeChild(newEle);
        }, 3000);
    }

    function balanceCheckBoxGroup() {
        var group = this.getAttribute("group");
        var checkBoxes = document.querySelectorAll("input[type=checkbox]");
        var thisCheckbox = this;
        checkBoxes.forEach(function (checkbox) {
            if (!checkbox.isEqualNode(thisCheckbox) && checkbox.getAttribute("group") === group) {
                checkbox.checked = false;
            }
        });
    }

    function getAbilityScoreModifier(abilityScore) {
        abilityScore = parseInt(abilityScore);
        return Math.floor((abilityScore - 10) / 2);
    }

    function showOrHide(elementId, hideOrShowInt, callBack) {
        if (hideOrShowInt > 0) {
            document.getElementById(elementId).classList.remove("hidden");
        } else {
            document.getElementById(elementId).classList.add("hidden");
        }
        if (callBack) callBack();
    }

    function makeUIElementDraggable(elmnt, callback) {
        var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        elmnt.onmousedown = dragMouseDown;

        function dragMouseDown(e) {
            e = e || window.event;
            e.preventDefault();
            // get the mouse cursor position at startup:
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            // call a function whenever the cursor moves:
            document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();
            // calculate the new cursor position:
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            // set the element's new position:
            elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
            elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
        }

        function closeDragElement() {
            // stop moving when mouse button is released:
            document.onmouseup = null;
            document.onmousemove = null;
            if (callback) callback();
        }

    }

    function hexToHSL(H, minL) {
        // Convert hex to RGB first
        let r = 0, g = 0, b = 0;
        if (H.length == 4) {
            r = "0x" + H[1] + H[1];
            g = "0x" + H[2] + H[2];
            b = "0x" + H[3] + H[3];
        } else if (H.length == 7) {
            r = "0x" + H[1] + H[2];
            g = "0x" + H[3] + H[4];
            b = "0x" + H[5] + H[6];
        }
        // Then to HSL
        r /= 255;
        g /= 255;
        b /= 255;
        let cmin = Math.min(r, g, b),
            cmax = Math.max(r, g, b),
            delta = cmax - cmin,
            h = 0,
            s = 0,
            l = 0;

        if (delta == 0)
            h = 0;
        else if (cmax == r)
            h = ((g - b) / delta) % 6;
        else if (cmax == g)
            h = (b - r) / delta + 2;
        else
            h = (r - g) / delta + 4;

        h = Math.round(h * 60);

        if (h < 0)
            h += 360;

        l = (cmax + cmin) / 2;
        s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
        s = +(s * 100).toFixed(1);
        l = +(l * 100).toFixed(1);
        if (minL && l < minL)
            l = minL;

        return "hsl(" + h + "," + s + "%," + l + "%)";
    }
    function hexToRGBA(hex, opacity) {
        return 'rgba(' + (hex = hex.replace('#', '')).match(new RegExp('(.{' + hex.length / 3 + '})', 'g')).map(function (l) { return parseInt(hex.length % 2 ? l + l : l, 16) }).concat(opacity || 1).join(',') + ')';
    }

    function isImage(path) {
        var imgFilters = constants.imgFilters.map(x => "." + x);
        return imgFilters.includes(extname(path));
    }

    function ele(tag, classList, innerHTML) {
        var ele = document.createElement(tag);
        ele.classList = classList;
        if (innerHTML)
        ele.innerHTML = innerHTML;
        return ele;
    }

    function cssify(path){
        return "url('" + path.replace(/\\/g, "/") + "')";
    }
    return {
        showSuccessMessage: showSuccessMessage,
        showFailedMessage: showFailedMessage,
        showBubblyText: showBubblyText,
        showOrHide: showOrHide,
        balanceCheckBoxGroup: balanceCheckBoxGroup,
        makeUIElementDraggable: makeUIElementDraggable,
        hexToHSL: hexToHSL,
        hexToRGBA: hexToRGBA,
        IsVowel: IsVowel,
        ele:ele,
        isImage: isImage,
        getAbilityScoreModifier: getAbilityScoreModifier,
        cssify: cssify,
        showInfo: showInfo
    }
}();


