const ElementCreator = require("./lib/elementCreator");



class CharacterSyncer {
    SYNC_SECONDS = 20;
    constructor(url, plaqueEle, importer) {
        this.element = plaqueEle;
        this.url = url;
        this.importer = importer;
        var cls = this;
        window.setInterval(refresh, this.SYNC_SECONDS * 1000);
        refresh();

        function refresh() {
            console.log("Fetch...");
            cls.importer.getCharacter(cls.url, charData => {
                console.log(charData, cls.url)
                var node = cls.element;
                node.querySelector("p").innerText = (charData.character_name);
                node.querySelector(".acnode").value = (charData.ac);
                node.querySelector(".pcnode__passiveperception>p").innerText = (parseInt(charData.perception || 0) + 10);
                if (charData.darkvision) {
                    node.querySelector(".pcnode__darkvision").classList.remove("hidden_takes_space");
                    node.querySelector(".pcnode__darkvision>p").innerText = (charData.darkvision + " ft");
                } else {
                    node.querySelector(".pcnode__darkvision").classList.add("hidden_takes_space");
                    node.querySelector(".pcnode__darkvision>p").innerText = "0";
                }

                var notesContainer = node.querySelector(".pcnode_notes");
                var syncerContainer = notesContainer.querySelector(".pc_node_notes_sync_container");
                if (syncerContainer)
                    syncerContainer.parentNode.removeChild(syncerContainer);
                syncerContainer = Util.ele("div", "pc_node_notes_sync_container column");
                if (charData.currentHp) {

                    syncerContainer.appendChild(cls.createLabeledNote("Hit points: ", charData.maxHp ? `${charData.currentHp}/${charData.maxHp}` : charData.currentHp));
                }
                if (charData.insight)
                    syncerContainer.appendChild(cls.createLabeledNote("Insight: ", charData.insight));
                if (charData.readOnlyUrl) {
                    syncerContainer.appendChild(ElementCreator.browserLink(charData.readOnlyUrl, "Open in browser"));
                }
                notesContainer.appendChild(syncerContainer);
            });
        }


    }

    createLabeledNote(labelText, text) {
        var row = Util.ele("div", "row");
        var label = Util.ele("p", "label", labelText);
        row.appendChild(label);
        var txt = Util.ele("p", "", text);
        row.appendChild(txt);
        return row;
    }

    destroy() {
        window.clearInterval(this.syncFunction);
    }


}

module.exports = CharacterSyncer;