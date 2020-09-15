

document.addEventListener("DOMContentLoaded", function () {
    const remote = require('electron').remote;

    var checkBoxes = document.querySelectorAll("input[type=checkbox]");
    var closeAppButton, closeWindowButton;
    closeAppButton = document.getElementById("close_app_button");
    closeWindowButton = document.getElementById("close_window_button");
    if (closeAppButton) closeAppButton.onclick = function (evt) {
        remote.app.quit()
    };
    if (closeWindowButton) closeWindowButton.onclick = function (evt) {
        window.close();
    };
    document.getElementById("minimize_app_button").onclick = function (evt) {
        remote.getCurrentWindow().minimize()
    };
    if (document.getElementById("settings_window_button"))
        document.getElementById("settings_window_button").onclick = function (evt) {
            ipcRenderer.send("open-settings-window");
        };
    if (document.getElementById("about_window_button"))
        document.getElementById("about_window_button").onclick = function (evt) {
            ipcRenderer.send("open-about-window");
        };

    document.getElementById('min_max_button').addEventListener('click', () => {
        const currentWindow = remote.getCurrentWindow()
        if (currentWindow.isMaximized()) {
            currentWindow.unmaximize()
        } else {
            currentWindow.maximize()
        }
    })

    var contextMenus = [...document.querySelectorAll(".context_menu_button")];
    contextMenus.forEach((menu) => {
        menu.addEventListener("mouseenter", (e) => {
            var menuToShowId = e.target.getAttribute("data-menu_item")
            var menuToShow = document.getElementById(menuToShowId);
            if (menuToShow == null) return;
            var placedNode = e.target.parentNode;

            var rect = e.target.getBoundingClientRect();

            menuToShow.style.left = rect.left + e.target.clientWidth + "px";
            menuToShow.style.top = rect.top + "px";

            menuToShow.classList.remove("hidden");
            if (menuToShow.hideTimer) window.clearTimeout(menuToShow.hideTimer);
        });

        menu.addEventListener("mouseleave", (e) => {
            var menuToShowId = e.target.getAttribute("data-menu_item")
            var menuToShow = document.getElementById(menuToShowId);
            if (menuToShow.getAttribute("data-mouse_over") == "false") {
                menuToShow.hideTimer = window.setTimeout(() => {
                    menuToShow.classList.add("hidden");

                }, 600)
            }
        });
    })

    contextMenus = [...document.querySelectorAll(".context_menu")];
    contextMenus.forEach((menu) => {
        menu.setAttribute("data-mouse_over", "false");
        menu.addEventListener("mouseenter", (e) => {
            e.target.setAttribute("data-mouse_over", "true");
            e.target.classList.remove("hidden");
            if (e.target.hideTimer) window.clearTimeout(e.target.hideTimer);
        });

        menu.addEventListener("mouseleave", (e) => {
            e.target.setAttribute("data-mouse_over", "false");
            e.target.hideTimer = window.setTimeout(() => {
                e.target.classList.add("hidden");

            }, 600)
        });
    });

    checkBoxes.forEach(function (checkbox) {
        if (checkbox.getAttribute("group") != null) {
            checkbox.addEventListener("click", Util.balanceCheckBoxGroup);
        }
    });
    var toggleButtons = document.querySelectorAll(".toggle_button");
    toggleButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            if (this.getAttribute("toggled") === "false") {
                if (this.getAttribute("toggleGroup") != null) {

                    var allButtons = document.querySelectorAll(".toggle_button");
                    var toggleGroup = this.getAttribute("toggleGroup");
                    for (var i = 0; i < allButtons.length; i++) {
                        if (allButtons[i].getAttribute("toggleGroup") == toggleGroup) {
                            allButtons[i].setAttribute("toggled", "false");


                        }
                    }
                }
                this.setAttribute("toggled", "true");



            } else {
                this.setAttribute("toggled", "false");
                this.classList.remove("toggle_button_toggled");
                this.classList.add("button_style");
            }
        })
    });



});

var Util = function () {

    function showBubblyText(text, point, smallfont) {
        var newEle = document.createElement("div");

        newEle.innerHTML = text;
        newEle.classList.add("roll_result_effect");
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

    function showMessage(text, messageType){
        var newEle = document.createElement("p");
        newEle.innerHTML = text;
        newEle.classList.add("popup_message");
        newEle.classList.add(messageType+"_message");
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
    return{
        showSuccessMessage:showSuccessMessage,
        showFailedMessage:showFailedMessage,
        showBubblyText : showBubblyText,
        showOrHide:showOrHide,
        balanceCheckBoxGroup:balanceCheckBoxGroup,
        makeUIElementDraggable:makeUIElementDraggable
    }
}();



