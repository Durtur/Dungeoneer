
const sidebarManager = function () {
    var onClosedFn;
    function showInSideBar(element, onclosedFn) {
        onClosedFn = onclosedFn;
        var sidebar = document.getElementById("side_toolbar");
        sidebar.setAttribute("toggled", "true");
        while (sidebar.firstChild) {
            sidebar.removeChild(sidebar.firstChild);
        }
        if (element.parentNode)
            element.parentNode.removeChild(element);
        sidebar.appendChild(element);
    }
    function close() {
        var sidebar = document.getElementById("side_toolbar");
        sidebar.setAttribute("toggled", "false");
        if (onClosedFn) onClosedFn();
    }
    return {
        close: close,
        showInSideBar: showInSideBar
    }
}();

module.exports = sidebarManager;