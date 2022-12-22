var menu = (function () {
    function initialize() {
       
        var toolbarState = localStorage.getItem("toolbar-toggle-state");
        if (!toolbarState) return;
        var collapsed = document.querySelector(".toolbar").classList.contains("toolbar_collapsed");
        if (toolbarState == "0" && !collapsed) {
            toggleToolbar();
        } else if (toolbarState == "1" && collapsed) {
            toggleToolbar();
        }
    }
    function toggleToolbar() {
        var bar = document.querySelector(".toolbar");
        if (bar.classList.contains("toolbar_collapsed")) {
            bar.classList.remove("toolbar_collapsed");
            localStorage.setItem("toolbar-toggle-state", "1");
        } else {
            bar.classList.add("toolbar_collapsed");
            localStorage.setItem("toolbar-toggle-state", "0");
        }
    }
    return {
        toggleToolbar: toggleToolbar,
        initialize: initialize,
    };
})();
