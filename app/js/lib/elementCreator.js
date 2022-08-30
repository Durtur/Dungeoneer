
class ElementCreator {
    static generateHTMLTable(jsonObj) {

        var jsonKeys = Object.keys(jsonObj);
        jsonKeys.forEach(key => {
            var isEmpty = jsonObj[key].filter(x => x != undefined && x != "").length == 0;
            if (isEmpty)
                delete jsonObj[key];
        });

        var jsonObjValues = Object.values(jsonObj);

        var expectedLength = jsonObjValues[0].length;
        for (var i = 1; i < jsonObjValues.length; i++) {
            if (jsonObjValues[i].length != expectedLength) {
                console.log("Cannot create table from arrays of unequal length.");
                return;
            }
        }
        var newTable = document.createElement("table");
        var newNode;
        var currentHeader = document.createElement("thead");
        var currentRow = document.createElement("tr");
        var columnCount = 0;
        currentHeader.appendChild(currentRow);
        newTable.appendChild(currentHeader);
        for (var arr in jsonObj) {
            columnCount++;
            newNode = document.createElement("th");
            newNode.innerHTML = marked.parse(arr.deserialize().toProperCase());
            currentRow.appendChild(newNode);
        }
        currentHeader = document.createElement("tbody");
        for (var i = 0; i < expectedLength; i++) {
            currentRow = document.createElement("tr");
            currentHeader.appendChild(currentRow);
            for (var j = 0; j < columnCount; j++) {
                newNode = document.createElement("td");
                newNode.innerHTML = marked.parse("" + jsonObjValues[j][i]);
                currentRow.appendChild(newNode);

            }
        }
        newTable.appendChild(currentHeader);
        return newTable;
    }
    static createDeletableParagraph(text) {
        var para = document.createElement("para");
        para.innerHTML = text;
        para.addEventListener("click", function (e) {
            e.target.parentNode.removeChild(e.target);
        });
        para.classList = "deletable_paragraph";
        return para;
    }

    static makeDraggable(elmnt, targetElement) {
        var dragElement = targetElement ? targetElement : elmnt;
        var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        console.log(targetElement)

        dragElement.onmousedown = dragMouseDown;
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
        }
    }

    static createTextOverlayImage(imgSrc, text) {
        var cont = this.ele("div", "text_overlay_img_container");
        var img = this.ele("img", "tile_image");
        img.src = imgSrc;
        var text = this.ele("p", "center overlay_text", text);
        cont.appendChild(img);
        cont.appendChild(text);
        return cont;
    }

    static ele(tag, classList, innerHTML) {
        var ele = document.createElement(tag);
        ele.classList = classList;
        if (innerHTML)
            ele.innerHTML = innerHTML;
        return ele;
    }

    static createTokenElement(path) {
        if (!path) path = "./mappingTool/tokens/default.png";
        var tokenEle = document.createElement("img");
        tokenEle.classList = "statblock_token";
        tokenEle.src = path;
        return tokenEle;
    }

    static checkBox(labelText, checked, onchange) {
        var label = document.createElement("label");
        label.innerHTML = labelText;

        var cont = document.createElement("label");
        cont.classList = "container_for_checkbox";
        var inp = document.createElement("input");
        inp.setAttribute("type", "checkbox");
        inp.title = labelText;
        inp.checked = checked;
        var span = document.createElement("span");
        span.classList = "checkmark";
        cont.appendChild(inp);
        cont.appendChild(span);
        var parent = document.createElement("div");
        parent.classList = "row space_between";
        parent.appendChild(label);
        parent.appendChild(cont);
        if (onchange) {
            inp.onchange = onchange;
        }
        return parent;

    }

    static browserLink(linkUrl, text) {
        var link = document.createElement("button");
        link.setAttribute("href", linkUrl);
        link.classList = "hyperlink_like";
        link.onclick = (e) => {
            e.preventDefault();

            window.api.openBrowser(link.getAttribute("href"))
        }
        link.innerHTML = text;
        return link;

    }

}

module.exports = ElementCreator;