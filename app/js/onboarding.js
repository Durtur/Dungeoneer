const util = require("./util");
const Modals = require("./modals");
var semver = require('semver');

class Onboarding {

    constructor() {
        this.versions =
        {
            "1.2.0": () => this.version121()
        }
    }
    versionHigherThan(a, b) {
        console.log(semver.gte(a, b), a, b)
        return semver.gte(a, b);
    }

    init() {
        var version = window.api.getAppVersion();
        var thisVersion = this.versions[version];

        dataAccess.getSettings(settings => {
            if (settings.onboardingLast && this.versionHigherThan(settings.onboardingLast, version))
                return;
            if (thisVersion) {
                this.display(thisVersion());
            }
        });

    }

    baseCreate(modalContents) {
        var cont = util.ele("div", "column");
        var pCont = util.ele("div", "column");
        modalContents.paragraphs.forEach(x => {
            if (typeof (x) == "string")
                return pCont.appendChild(util.ele("p", "text_left", x));
            if (x.type == "img") {
                var ele = util.ele("img", "banner_img");
                ele.setAttribute("src", x.path);
                return pCont.appendChild(ele)
            }

        });
        cont.appendChild(pCont);

        return cont;
    }
    /***
     * modalcontents: {title, paragraphs}
     */
    display(modalContents) {
        var cont = this.baseCreate(modalContents);
        var modal = Modals.createModal(modalContents.title, () => {
            dataAccess.getSettings(settings => {
                var version = window.api.getAppVersion();
                settings.onboardingLast = version;
                dataAccess.saveSettings(settings);
            })
        });
        if (modalContents.width)
            modal.modal.style.maxWidth = modalContents.width;
        modal.modal.appendChild(cont);
        document.body.appendChild(modal.parent);

    }

    version121() {
        return {
            title: "1.2.1 - the multiplayer update",
            width: "34em",
            paragraphs: [
                "Welcome to the Dungeoneer multiplayer update. This update allows you to invite players to view your current battlemap online. Open the server window from the map tool and start your server. Your players will be able to join you through the <a data-href='https://www.ogreforge.me/Dungeoneer/client' onclick ='externalLink(event)'>Dungeoneer online client.</a>",
                { type: "img", path: "./screenshots/server.JPG" },
                "Please note that this is beta functionality. Bugs and questions can be posted <a data-href='https://github.com/Durtur/Dungeoneer/issues' onclick ='externalLink(event)'> here</a>.",
                "<a data-href='https://github.com/Durtur/Dungeoneer/releases/tag/v1.2.0' onclick ='externalLink(event)'>Release notes</a>"
            ]
        }
    }
}
module.exports = Onboarding;