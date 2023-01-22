class Timer {
    constructor(intervalSeconds = 60, onUpdated) {
        this.onUpdated = onUpdated || (() => {});
        this.interval = intervalSeconds;
        this.stopped = true;
    }

    onclicked(handler) {
        this.clickHandler = handler;
        this.container.onclick = handler;
    }

    render() {
        console.log("Render timer");
        var lbl = Util.ele("div", "timer_label");
        var hrGlass = Util.ele("div", "hourglass ");
        this.hourGlass = hrGlass;
        var cont = Util.wrapper("div", "row timer_container hidden", hrGlass);
        cont.appendChild(lbl);
        this.timeLabel = lbl;
        document.body.appendChild(cont);
        this.container = cont;
        if (this.clickHandler) this.container.onclick = this.clickHandler;
        this.rendered = true;
        return cont;
    }
    stop() {
        this.container.classList.add("hidden");
        this.hourGlass.classList.remove("hourglass_animate");
        this.stopped = true;
        window.clearInterval(this.countDown);
        this.onUpdated();
    }
    start() {
        if (!this.rendered) this.render();
        this.container.classList.remove("hidden");
        this.hourGlass.classList.remove("hourglass_animate");
        this.hourGlass.classList.add("hourglass_animate");
        this.reset();
        this.timeLabel.innerText = this.describeSpan();
        var cls = this;
        this.stopped = false;
        this.onUpdated();
        this.countDown = window.setInterval(() => {
            cls.elapsed++;
            cls.timeLabel.innerText = cls.describeSpan();
        }, 1000);
    }

    getState() {
        return {
            elapsed: this.elapsed,
            stopped: this.stopped,
            interval: this.interval,
            rendered: this.rendered,
            destroyed: !this.rendered,
        };
    }

    setState(state) {
        if (!state) return this.destroy();
        if (state.interval) this.interval = state.interval;
        if (!this.rendered && state.rendered) this.render();
        if (state.destroyed) return this.destroy();
        if (state.stopped && !this.stopped) {
            this.stop();
        } else if (!state.stopped && this.stopped) {
            this.start();
        }
        this.elapsed = state.elapsed;
    }

    reset() {
        this.elapsed = 0;
        this.container.classList.remove("red");
        this.onUpdated();
    }

    destroy() {
        console.log("Roundtimer destroy");
        if (!this.container) return;
        this.stop();
        this.onUpdated();
        if (this.container.parentNode) this.container.parentNode.removeChild(this.container);
        this.rendered = false;
    }

    describeSpan() {
        var remaining = this.interval - this.elapsed;
        var signStr = "";
        if (remaining < 10) {
            this.container.classList.add("red");
        } else {
            this.container.classList.remove("red");
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
