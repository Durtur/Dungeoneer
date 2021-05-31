
const Modals = function () {

    function modalBase(titleText, callback) {
        var title = document.createElement("h1");
        title.innerHTML = titleText;

        var modal = document.createElement("div");
        modal.appendChild(title);
        modal.classList = "modal";
        var closeBtn = document.createElement("button");
        closeBtn.classList = "close_x_button";
        closeBtn.onclick = function (e) {
            modal.parentNode?.removeChild(modal);
            callback(null);
        };

        document.addEventListener("keydown",closeOnKeyDown);
        function closeOnKeyDown(e){
            if(e.key != "Escape")return;
            modal.parentNode?.removeChild(modal);
            callback(null);
            document.removeEventListener("keydown",closeOnKeyDown, false);
        }
        modal.appendChild(closeBtn);
        modal.close = ()=>{
            modal.parentNode?.removeChild(modal);
            document.removeEventListener("keydown",closeOnKeyDown, false);
        }
        return modal;
    }

    return {
        createModal:modalBase
    }

}();

module.exports = Modals;