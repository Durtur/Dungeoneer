
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
                console.log(charData)
                var node = cls.element;
                node.querySelector("p").innerText = (charData.name);
                node.querySelector(".acnode").value = (charData.ac);
                node.querySelector(".pcnode__passiveperception>p").innerText = (parseInt(charData.perception) + 10);
                if (charData.darkvision) {
                    node.querySelector(".pcnode__darkvision").classList.remove("hidden");
                    node.querySelector(".pcnode__darkvision>p").innerText = (charData.darkvision + " ft");
                }
            });
        }
    }



    destroy() {
        window.clearInterval(this.syncFunction);
    }


}

module.exports = CharacterSyncer;