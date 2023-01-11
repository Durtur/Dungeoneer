const pawnManager = (function () {
    const DEAD_ATTRIBUTE = "data-token-dead";
    function isDead(pawn) {
        if (!pawn) return false;
        return pawn.getAttribute(DEAD_ATTRIBUTE) == "true";
    }

    function kill(pawn) {
        if (isDead(pawn)) return;
        pawn.setAttribute(DEAD_ATTRIBUTE, "true");
    }

    function revive(pawn) {
        if (!isDead(pawn)) return;
        pawn.setAttribute(DEAD_ATTRIBUTE, "false");
    }
    function rotatePawn(pawn, degrees) {
        if (pawn.deg == null) {
            pawn.deg = degrees;
        } else {
            pawn.deg += degrees;
        }
        setPawnRotation(pawn, pawn.deg);
    }

    function setPawnRotation(pawn, degrees) {
        var isMob = pawn.getAttribute("data-mob_size") != null;
        var element = isMob ? pawn.querySelector(".mob_token_container") : pawn.querySelector(".token_photo");
        if (isNaN(degrees)) degrees = 0;
        element.style.setProperty("--pawn-rotate", (degrees || 0) + "deg");
        if (serverNotifier.isServer()) {
            serverNotifier.notifyServer("token-rotate-set", {
                id: pawn.id,
                deg: pawn.deg,
            });
        }
    }

    function setScale(pawn, scale) {
        if (!scale) return;
        var image = pawn.querySelector(".token_photo");
        if (!image) return;
        image.style.setProperty("--pawn-image-scale", scale);
        console.log(`Set scale  ${scale}`);
        serverNotifier.notifyServer("token-scale", {
            id: pawn.id,
            scale: scale,
        });
        var facetArray = image.getAttribute("data-token_facets");
        if (!facetArray) return;
        var facets = JSON.parse(facetArray);
        var current = parseInt(image.getAttribute("data-token_current_facet") || 0);
        var path = facets[current];
        if (scale != 1) {
            localStorage.setItem(`token_scale${path}`, scale);
        } else {
            localStorage.removeItem(`token_scale${path}`);
        }
    }
    function getScale(pawn) {
        var image = pawn.querySelector(".token_photo");
        if (!image) return 1;
        return image.style.getPropertyValue("--pawn-image-scale");
    }

    /**
     *
     * @param {object} options elementId and text properties required
     * @returns void
     */
    function talkBubble(options) {
        var pawn = map.getPawnById(options.elementId);
        if (!pawn) return;
        var bubble = pawn.querySelector(".token_talkbubble");
        if (!bubble) {
            bubble = Util.ele("div", "token_talkbubble", options.text);
            bubble.onclick = (e) => Util.fadeOut(bubble, 600);
            pawn.appendChild(bubble);
        } else {
            bubble.innerHTML = options.text;
        }
        window.setTimeout(() => Util.fadeOut(bubble, 600), 14000);
    }

    function setNextFacet(pawn, direction = 1) {
        var pawnPhoto = pawn.getElementsByClassName("token_photo")[0];
        var images = JSON.parse(pawnPhoto.getAttribute("data-token_facets"));
        if (images == null || images.length == 0) return;
        var currentIndex = parseInt(pawnPhoto.getAttribute("data-token_current_facet")) || 0;

        var oldIndex = currentIndex;
        currentIndex += direction;
        if (currentIndex >= images.length) currentIndex = 0;
        if (currentIndex < 0) currentIndex = images.length - 1;
        if (oldIndex == currentIndex) return;
        pawnPhoto.setAttribute("data-token_current_facet", currentIndex);
        setPawnToken(pawn, Util.cssify(images[currentIndex]));
    }

    return {
        isDead,
        kill,
        revive,
        rotatePawn,
        setPawnRotation,
        setScale,
        getScale,
        talkBubble,
        setNextFacet,
    };
})();
