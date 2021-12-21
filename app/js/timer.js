


const Util = require("./util");

class Timer {
    constructor(intervalSeconds = 60) {

        this.interval = intervalSeconds;
    }

    render() {
        var lbl = Util.ele("div", "timer_label");
        var hrGlass = Util.ele("div", "hourglass ");
        this.hourGlass = hrGlass;
        var cont = Util.wrapper("div", "row timer_container hidden", hrGlass);
        cont.appendChild(lbl);
        this.timeLabel = lbl;
        document.body.appendChild(cont);
        this.container = cont;
        return cont;
    }
    stop() {
        this.container.classList.add("hidden");
        this.hourGlass.classList.remove("hourglass_animate")
        window.clearInterval(this.countDown);
    }
    start() {
        this.container.classList.remove("hidden");
        this.hourGlass.classList.remove("hourglass_animate")
        this.hourGlass.classList.add("hourglass_animate")
        this.reset();
        this.timeLabel.innerText = this.describeSpan();
        var cls = this;
        this.countDown = window.setInterval(() => {

            cls.elapsed++;
            cls.timeLabel.innerText = cls.describeSpan();
        }, 1000);
    }

    reset() {
        this.elapsed = 0;
        this.container.classList.remove("red");
    }

    destroy() {
        this.stop();
        if (this.container.parentNode)
            this.container.parentNode.removeChild(this.container);
    }

    describeSpan() {
        var remaining = this.interval - this.elapsed;
        var signStr = "";
        if (remaining < 10) {
            this.container.classList.add("red");
        }
        if (remaining < 0) {
            signStr = "-";
            remaining = Math.abs(remaining);

        }
        var minutes = Math.floor(remaining / 60);
        var seconds = remaining - minutes * 60;
        return `${signStr}${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }

}

module.exports = Timer;