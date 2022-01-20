
var npcGenerator;
var resultContainer; 

document.addEventListener("DOMContentLoaded", (e) => {

    npcGenerator = new NpcGenerator();
    resultContainer =  document.querySelector("#npc_section .generator_result");
    npcGenerator.initialize(generatorData, document.querySelector("#npc_section .genchooser_smaller"), resultContainer);
    generate("anglo", "humanoid", "any")
    //initialize(generatorData, container, resultContainer)
});

function generate(nameset, creatureType) {
    npcGenerator.generate(nameset, creatureType, "any");
    resultContainer.classList.remove("fade_in");
    void resultContainer.offsetWidth;
    // -> and re-adding the class
    resultContainer.classList.add("fade_in");
}

Array.prototype.pickOne = function () {
    return this.pickX(1)[0];
}

Array.prototype.pickX = function (num) {
    if (this.length <= num) return this;
    var picked = [];
    var results = [];
    var randomIndex;
    for (var i = 0; i < num; i++) {
        randomIndex = Math.floor(Math.random() * this.length);
        while (picked.includes(randomIndex)) {
            randomIndex = Math.floor(Math.random() * this.length);
        }
        results.push(this[randomIndex]);
        picked.push(randomIndex);
    }

    return results;
}


String.prototype.capitalizeAndDot = function () {
    return this.substring(0, 1).toUpperCase() + this.substring(1) + ".";;
}
String.prototype.serialize = function () {
    return this.replace(/ /g, "_").toLowerCase();
};

String.prototype.deserialize = function () {
    return this.replace(/_/g, " ").toProperCase();;
};

String.prototype.toProperCase = function () {
    return this.replace(/\w\S*/g, function (txt) { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); });
};