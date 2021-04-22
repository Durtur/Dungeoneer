var Util = require("./js/util");
var GLOBAL_MOUSE_DOWN = false;
document.addEventListener("DOMContentLoaded", function () {
    const remote = require('electron').remote;
    var selectOnFocus = document.querySelectorAll(".select_text_on_focus");
    document.addEventListener("mousedown",function(evt){
        GLOBAL_MOUSE_DOWN = true;
    });
    document.addEventListener("mouseup",function(evt){
        GLOBAL_MOUSE_DOWN = false;
    });
    [... selectOnFocus].forEach(x=> x.addEventListener('focus', (event) => {
        event.target.select();
      }));
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
            console.log(rect)
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



function closePopupGeneric(evt){
    var popup = evt.target.closest(".popup_menu");
    popup.classList.add("hidden");
}
