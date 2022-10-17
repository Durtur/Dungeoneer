const Util = require("./util");
const elementCreator = require("./lib/elementCreator");
const Modals = (function () {
    var minifiedPrompts = {};
    function modalBase(titleText, callback) {
        var title = document.createElement("h1");
        title.innerHTML = titleText;

        var modal = document.createElement("div");
        if (titleText) modal.appendChild(title);
        modal.classList = "modal";
        var closeBtn = document.createElement("button");
        closeBtn.classList = "close_x_button";
        closeBtn.onclick = function (e) {
            modal.close();
        };

        document.addEventListener("keydown", closeOnKeyDown);
        function closeOnKeyDown(e) {
            if (e.key != "Escape") return;
            modal.close();
        }
        modal.appendChild(closeBtn);
        var parent = Util.ele("div", "modal_container");
        modal.close = (callbackHandled) => {
            modal.parentNode?.removeChild(modal);
            parent?.parentNode?.removeChild(parent);
            document.removeEventListener("keydown", closeOnKeyDown, false);
            if (!callbackHandled) callback(null);
        };

        parent.appendChild(modal);
        return { modal: modal, parent: parent };
    }

    function multiInputPrompt(title, inputs, callback) {
        var modalCreate = modalBase(title, () => {
            callback(null);
        });
        var modal = modalCreate.modal;
        modal.classList.add("modal_prompt");
        modal.canConfirm = () => {
            var inputDom = modal.querySelectorAll(".modal_input");
            for (var i = 0; i < inputDom.length; i++) {
                var inp = inputDom[i];
                if (inp.getAttribute("data-required") == "true" && !inp.value) {
                    return false;
                }
            }
            return true;
        };
        var col = Util.ele("div", "column");
        inputs.forEach((inputType) => {
            var inputRow = createPromptInput(
                inputType.label,
                modal,
                confirm,
                "row",
                inputType.required,
                inputType.id
            );
            col.appendChild(inputRow);
        });
        modal.appendChild(col);
        var btn = Util.ele("button", "button_wide button_style", "Ok");
        var btnRow = Util.ele("div", "row flex_end base_margin");
        btnRow.appendChild(btn);
        btn.onclick = (e) => {
            if (!modal.canConfirm()) return;
            confirm();
        };
        modal.appendChild(btnRow);
        document.body.appendChild(modalCreate.parent);
        modal.querySelector("input").focus();

        function confirm() {
            var inputDom = [...modal.querySelectorAll(".modal_input")];
            var returnValue = inputDom.map((x) => {
                return {
                    label: x.getAttribute("data-property"),
                    id: x.getAttribute("data-id"),
                    value: x.value,
                };
            });
            modal.close(true);
            callback(returnValue);
        }
    }

    function prompt(title, label, callback) {
        var modalCreate = modalBase(title, () => {
            callback(null);
        });
        var modal = modalCreate.modal;
        var row = createPromptInput(label, modal, callback);
        modal.classList.add("modal_prompt");
        modal.appendChild(row);
        var btn = Util.ele("button", "button_wide button_style", "Ok");
        var btnRow = Util.ele("div", "row flex_end base_margin");
        btnRow.appendChild(btn);
        btn.onclick = (e) => {
            callback(modal.querySelector(".modal_input").value);
            modal.close();
        };
        modal.appendChild(btnRow);
        document.body.appendChild(modalCreate.parent);
        modal.querySelector("input").focus();
    }

    function createPromptInput(
        label,
        modal,
        callback,
        rowClass = "column",
        required = false,
        id = null
    ) {
        var input = Util.ele("input", "modal_input");
        if (required) input.setAttribute("data-required", true);
        input.setAttribute("data-property", label);
        if (id) {
            input.setAttribute("data-id", id);
        }
        var row = Util.ele("div", rowClass);
        if (label) row.appendChild(Util.ele("label", "", label));
        row.appendChild(input);
        input.addEventListener("keydown", (e) => {
            if (e.key.toLowerCase() == "enter") {
                if (modal.canConfirm && !modal.canConfirm()) return;
                callback(e.target.value);
                modal.close(true);
            }
        });
        return row;
    }

    function minifiedPrompt(evt, options, callback) {
        var prev = minifiedPrompts[options.id];
        if (prev) {
            prev.close();
        }
        var title = options.title;

        var modalCreate = modalBase(title, () => {
            callback(null);
            minifiedPrompts[options.id] = null;
        });
        var modal = modalCreate.modal;

        modal.classList.remove("modal");
        modal.classList.add("modal_minified");
        var offset = 100;
        modal.style.top = evt.clientY + offset + "px";
        modal.style.right = evt.clientX + offset + "px";
        console.log(evt.clientX);
        var input = Util.ele("input", "modal_input");
        input.setAttribute("type", options.type || "text");

        modal.appendChild(input);
        input.addEventListener("keydown", (e) => {
            if (e.key.toLowerCase() == "enter") {
                callback(e.target.value);
                modal.close(true);
            }
            if (options.callbackOnUpdate) {
                callback(input.value);
            }
        });
        document.body.appendChild(modalCreate.modal);
        input.value = options.initialValue || "";

        minifiedPrompts[options.id] = modal;
        elementCreator.makeDraggable(
            modal,
            modal.querySelector("h1:first-of-type")
        );
        window.setTimeout(() => modal.querySelector("input").focus(), 500);
    }

    return {
        createModal: modalBase,
        prompt: prompt,
        minifiedPrompt: minifiedPrompt,
        multiInputPrompt: multiInputPrompt,
    };
})();

module.exports = Modals;
