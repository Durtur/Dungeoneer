const diceRollerBar = (function () {
    var AWAITNG_RESULT = false;
    var diceFormulaContainer = null;
    var diceFormulasVisibile = false;
    var toolbarButton = null;
    function render(container) {
        while (container.firstChild) container.removeChild(container.firstChild);
        if (diceFormulaContainer) diceFormulaContainer.parentNode.removeChild(diceFormulaContainer);
        toolbarButton = Util.ele("button", "button_style dice-bar-button toggle_button ");
        container.appendChild(toolbarButton);
        toolbarButton.onclick = function (evt) {
            if (diceFormulasVisibile) {
                diceFormulasVisibile = false;
                toolbarButton.setAttribute("toggled", "false");
                return emptyFormulas();
            }

            var diceFormulas = getFormulas();
            if (diceFormulas.length > 0) {
                showBar(diceFormulas);
            } else {
                createFormula(evt);
            }
        };

        diceFormulaContainer = Util.ele("div", "column dice_formula_container");
        document.body.appendChild(diceFormulaContainer);
    }

    function getFormulas() {
        var diceFormulas = localStorage.getItem("dice-formulas");
        if (diceFormulas) {
            try {
                diceFormulas = JSON.parse(diceFormulas);
                return diceFormulas;
            } catch (e) {
                console.error(e);
            }
        }
        return [];
    }

    function emptyFormulas() {
        while (diceFormulaContainer.firstChild) diceFormulaContainer.removeChild(diceFormulaContainer.firstChild);
    }

    function showBar(formulas) {
        emptyFormulas();
        if (formulas.length == 0) return;
        diceFormulasVisibile = true;
        toolbarButton.setAttribute("toggled", "true");

        diceFormulaContainer.appendChild(createAddButton());
        formulas.forEach((diceString) => {
            diceFormulaContainer.appendChild(createFormulaButton(diceString));
        });
    }

    function createFormulaButton(diceString) {
        var btn = Util.ele("button", "button_style dice_formula_button", diceString);
        btn.onclick = () => roll(diceString);
        btn.addEventListener("contextmenu", (event) => {
            deleteFormula(btn);
            event.preventDefault();
        });

        var hammertime = new Hammer(btn, null);

        hammertime.on("swipe", function (ev) {
            deleteFormula(btn);
        });
        return btn;
    }

    function deleteFormula(element) {
        var form = element.innerHTML;
        var formulas = getFormulas();
        console.log(formulas);
        console.log(form);
        formulas = formulas.filter((x) => x != form);
        localStorage.setItem("dice-formulas", JSON.stringify(formulas));
        showBar(formulas);
    }

    function result(data) {
        AWAITNG_RESULT = false;
        Util.showDisappearingTitleAndSubtitle(data.result, `Rolled ${data.diceString}`);
    }

    function createAddButton() {
        var btn = Util.ele("button", "button_style dice_action_add", "+");
        btn.onclick = createFormula;
        return btn;
    }

    function createFormula(evt) {
        var saveFormula = localStorage.getItem("checkbox-save-formula") == "true" ? true : false;
        var saveFormulaInput = Util.checkBox("Add to quick dice", saveFormula, (e) => {
            saveFormula = e.target.checked;
        });
        saveFormulaInput.style.flex = "1";
        var prompt = ClientModals.prompt(
            "Roll dice",
            null,
            (value) => {
                if (!value) return;
                roll(value);
                if (saveFormula) {
                    localStorage.setItem("checkbox-save-formula", "true");
                    saveDiceFormula(value);
                }
            },
            { placeholder: "Dice to roll (Ex. 2d6+3)" }
        );
        var okRow = prompt.querySelector(".modal_ok_row");
        okRow.prepend(saveFormulaInput);
    }

    function saveDiceFormula(diceString) {
        var diceFormulas = getFormulas();
        diceString = diceString.trim().toLowerCase();
        if (diceFormulas.find((x) => x == diceString)) return;
        diceFormulas.push(diceString);
        localStorage.setItem("dice-formulas", JSON.stringify(diceFormulas));
        showBar(diceFormulas);
    }
    function roll(string) {
        if (hostConnection) {
            send({ event: "roll-dice", diceString: string });
            AWAITNG_RESULT = true;
        }
    }

    return {
        render: render,
        result: result,
    };
})();
