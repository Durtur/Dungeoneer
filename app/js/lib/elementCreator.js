

class ElementCreator {

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


}

module.exports = ElementCreator;