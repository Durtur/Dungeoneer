const { extname } = require("path");
const sharp = process.platform != "linux" ? require("sharp") : null;
module.exports = function () {
    function IsVowel(letter) {
        return ["a", "e", "i", "o", "u", "y"].includes(letter.toLowerCase());
    }

    function showInfo(title, text) {

        var para = document.createElement("p");
        para.innerHTML = text;
        var heading = document.createElement("h2");
        heading.innerHTML = title;
        var newEle = ele("div", "column");
        newEle.appendChild(heading);
        newEle.appendChild(para);
        fadeOutInfoBox(newEle);
    }

    function fadeOutInfoBox(innerElement, pos, onFadeOut) {
        var newEle = document.createElement("div");
        newEle.classList = "info_popup";
        newEle.style.top = (pos ? pos.y : window.innerHeight / 2 - newEle.clientHeight / 2) + "px";
        newEle.style.left = (pos ? pos.x : window.innerWidth / 2 - newEle.clientWidth / 2) + "px";
        document.body.appendChild(newEle);
        newEle.appendChild(innerElement);
        console.log(pos)
        window.setTimeout(function (evt) {
            newEle.classList.add("fade_out");
            if (newEle.parentNode) newEle.parentNode.removeChild(newEle);
            if (onFadeOut) onFadeOut();
        }, 6000);
        return newEle;
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

    function showDisappearingTitleAndSubtitle(title, subtitle, titleColor) {
        [...document.querySelectorAll(".disappearing_title_container")].forEach(x => {
            if (x.parentNode)
                x.parentNode.removeChild(x);
        });
        var newEle = ele("div", "center_absolute disappearing_title_container");
        var title = ele("h1", "disappearing_title", title);
        if (titleColor)
            title.style.color = titleColor;
        var p = ele("h2", "disappearing_ele", subtitle);
        newEle.appendChild(title);
        newEle.appendChild(p);

        document.body.appendChild(newEle);


        window.setTimeout(function (evt) {
            newEle.classList.add("fade_out");
            window.setTimeout(() => {
                if (newEle.parentNode) newEle.parentNode.removeChild(newEle);
            }, 2000)

        }, 3000);
    }

    function showSuccessMessage(text) {
        showMessageHelper(text, "success");
    }

    function showFailedMessage(text) {
        showMessageHelper(text, "failed");
    }

    function showMessage(text){
        showMessageHelper(text, "neutral");
    }

    function showMessageHelper(text, messageType) {
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
    function wrapper(tag, classList, childNode) {
        var par = ele(tag, classList);
        par.appendChild(childNode);
  
        return par;
    }


    async function toBase64(path, shrink) {
        if (!sharp || !path)
            return null;

        if(path.includes("?"))
            path = path.substring(0, path.lastIndexOf("?"));
        path = path.replaceAll("\"", "")
        try {
            console.log(`Converting ${path}, shrink ${shrink}`)
            var shrp = sharp(path)
            if (shrink)
                shrp = await shrp.resize(1200);
            var buffer = await shrp.toFormat("webp").toBuffer();

            return buffer.toString('base64');
        } catch (err) {
            console.error(err);
            return null;
        }

    }

    function cssify(path) {
        return "url('" + path.replace(/\\/g, "/") + "')";
    }
    function decssify(path) {
        if(!path)return path;
        console.log(path.substring(4, path.length -1) )
        return  path.substring(4, path.length -1) ;
    }

    function createLoadingEle(title, text) {
        var imgDiv = ele("div", "center loading_ele");
        var cont = ele("div", "loading_ele_cont ");
        var img = ele("img", "");
        img.src = "css/img/loading.gif"
     
        imgDiv.appendChild(img);
        var title = ele("h2", "loading_title", title);
        var text = ele("p", "loading_text", text);
        cont.appendChild(imgDiv);
        var column = ele("div", "column");
        column.appendChild(title);
        column.appendChild(text);
        cont.appendChild(column);
        cont.updateText = function (newTitle, newText) {
            if (newTitle)
                title.innerHTML = newTitle;

            if (newText)
                text.innerHTML = newText;
        }
        return cont;

    }
    return {
        showSuccessMessage: showSuccessMessage,
        showFailedMessage: showFailedMessage,
        showMessage:showMessage,
        showBubblyText: showBubblyText,
        showDisappearingTitleAndSubtitle: showDisappearingTitleAndSubtitle,
        showOrHide: showOrHide,
        balanceCheckBoxGroup: balanceCheckBoxGroup,
        makeUIElementDraggable: makeUIElementDraggable,
        hexToHSL: hexToHSL,
        toBase64: toBase64,
        hexToRGBA: hexToRGBA,
        createLoadingEle: createLoadingEle,
        IsVowel: IsVowel,
        ele: ele,
        wrapper:wrapper,
        isImage: isImage,
        getAbilityScoreModifier: getAbilityScoreModifier,
        cssify: cssify,
        decssify:decssify,
        showInfo: showInfo,
        fadeOutInfoBox: fadeOutInfoBox
    }
}();


