class InfoTooltip {
    initialize(container) {
        this.container = container;
    }

    set(title, subtitle) {
        this.container.querySelector("popup_title").innerText = title;
        this.container.querySelector("popup_subtitle").innerText = subtitle;
        this.container.classList.remove("hidden");
    }

    clear() {
        this.container.classList.add("hidden");
    }
}

module.exports = InfoTooltip;