
var Util = function () {
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

    function cssify(path) {
        return "url('" + path.replace(/\\/g, "/") + "')";
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
    return {
        hexToRGBA: hexToRGBA,
        hexToHSL:hexToHSL,
        showDisappearingTitleAndSubtitle:showDisappearingTitleAndSubtitle,
        cssify:cssify,
        wrapper:wrapper,
        ele:ele
    }
}();