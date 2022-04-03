
document.addEventListener("DOMContentLoaded", function () {

  
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

