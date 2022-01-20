
class NpcGenerator {
    initialize(generatorData, container, resultContainer) {
        this.generatorData = generatorData;
        this.container = container;
        this.resultContainer = resultContainer;
        this.replacementValues = generatorData.replacement_values;
        var cls = this;
        document.getElementById("regenerate_name_button").addEventListener("click", function (e) {
            cls.rerollNpc("name");
        });

        document.getElementById("regenerate_creature_button").addEventListener("click", function (e) {
            cls.rerollNpc("creature");
        });

        document.querySelector("#generate_npc_button").addEventListener("click", function () {
            document.querySelector("#regenerate_name_button").classList.remove("hidden");
            document.querySelector("#regenerate_creature_button").classList.remove("hidden");

            var dropDownGender = document.querySelector("#choose_gender");
            var dropDownType = document.querySelector("#choose_type_generated_creature");
            var type = dropDownType.options[dropDownType.selectedIndex].value;
            var gender = dropDownGender.options[dropDownGender.selectedIndex].value;
            var dropDownSet = document.querySelector("#choose_nameset");
            var set = dropDownSet.options[dropDownSet.selectedIndex].value;

            cls.generate(set, type, gender);



        });


    }
    generate(nameSet, creatureType, gender) {

        var data = this.generatorData;
        var foundNameSet = null;
        for (var i = 0; i < Object.keys(Object.values(data)[0]).length; i++) {
            if (nameSet === Object.keys(Object.values(data)[0])[i]) {
                foundNameSet = Object.values(Object.values(data)[0])[i];
            }
        }
        var generatedNameTextField = document.querySelector("#generated_npc_name");
        var values = this.generateNPC(data, gender, foundNameSet, creatureType)
        generatedNameTextField.innerText = values.firstname + " " + values.lastname;
        if (values.age)
            values.profession += ` (${values.age})`;

        document.querySelector("#generated_npc_profession").innerText = values.profession;
        document.querySelector("#generated_npc_description").innerText = values.description;
    }

    generateNPC(data, gender, foundNameSet, creatureType, descType = "generic") {

        var genderHeShe, subset, genderPosessive, genderAbout, genderManWoman;
        var npcValues = {};
        if (gender == "any") gender = ["male", "female"].pickOne()
        if (gender == "male") {
            subset = foundNameSet.male;

            genderHeShe = "he";

        } else {
            subset = foundNameSet.female;
            genderPosessive = "her";
            genderAbout = "her";
            genderHeShe = "she";
            genderManWoman = "woman";
        }


        npcValues.firstname = subset.pickOne();
        npcValues.lastname = foundNameSet.lastnames.pickOne()


        //profession
        var likely, midlikely, selectedProfessionSet;
        likely = 65;
        midlikely = 93;

        var creatureSet = data.generated_creatures[creatureType];
        var randomIndex = Math.ceil(Math.random() * 100);
        if (randomIndex < likely) {
            selectedProfessionSet = creatureSet.professions.common;
        } else if (randomIndex < midlikely) {
            selectedProfessionSet = creatureSet.professions.uncommon;
        } else {
            selectedProfessionSet = creatureSet.professions.rare;
        }
        var joblessString = "", connectionString;
        if (creatureType === "humanoid") {
            var jobless = Math.random() * 100;
            if (jobless > 98) joblessString = "Unemployed ";
            connectionString = ", and ";

        } else {
            connectionString = ". " + genderHeShe.charAt(0).toUpperCase() + genderHeShe.slice(1) + " ";
        }
        npcValues.profession = joblessString + selectedProfessionSet.pickOne();

        if (creatureSet.population_data) {
            var popData = creatureSet.population_data;
            var age = mathyUtil.getNormallyDistributedNum(popData.mean, popData.STD);
            if (popData.min && age < popData.min)
                age = popData.min;
            age = Math.round(age);
            npcValues.age = age;
        }

        npcValues.description = " " + creatureSet.traits.pickOne() + ". " + genderHeShe.charAt(0).toUpperCase() +
            genderHeShe.slice(1) + " has a " + creatureSet.appearance.face_shape.pickOne() + ", " + creatureSet.appearance.face_aesthetics.pickOne() + " face"
            + connectionString + creatureSet.appearance.build.pickOne() + ". " +
            npcValues.firstname + " " + creatureSet.hooks.pickOne() + ".";



        npcValues.description = replacePlaceholders(npcValues.description, gender == "male", data);
        if (descType == "generic") {
            npcValues.description = npcValues.firstname + npcValues.description;
        } else if (descType == "tavern") {
            npcValues.tavernKeepDescription = npcValues.description;
        } else if (descType == "shop") {
            npcValues.shopKeepDescription = npcValues.description + " " + npcValues.firstname + " " + data.shops.owner_attitude.pickOne() + " towards customers.";
        }

        return npcValues;
    }



    rerollNpc(key) {

        var dropDownGender = document.querySelector("#choose_gender");
        var dropDownType = document.querySelector("#choose_type_generated_creature");
        var type = dropDownType.options[dropDownType.selectedIndex].value;
        var gender = dropDownGender.options[dropDownGender.selectedIndex].value;
        var dropDownSet = document.querySelector("#choose_nameset");
        gender = gender == "any" ? ["male", "female"].pickOne() : gender;
        var set = dropDownSet.options[dropDownSet.selectedIndex].value;
        var data = this.generatorData;
        var foundNameSet = null;

        for (var i = 0; i < Object.keys(Object.values(data)[0]).length; i++) {
            if (set === Object.keys(Object.values(data)[0])[i]) {
                foundNameSet = Object.values(Object.values(data)[0])[i];
            }
        }
        var generatedNameTextField = document.querySelector("#generated_npc_name");
        if (key == "name") {

            var values = this.generateNPC(data, gender, foundNameSet, type)
            replaceName(values);
        } else if (key == "creature") {
            var names = generatedNameTextField.innerHTML.split(" ");
            if (names[1] == null) names[1] = "";
            var values = generateNPC(data, gender, { male: [names[0]], lastnames: [names[1]], female: [names[0]], lastnames: [names[1]] }, type)
            if (values.age)
                values.profession += ` (${values.age})`;
            replaceDescription(values);
        }

        function replaceDescription() {
            document.querySelector("#generated_npc_profession").innerHTML = values.profession;
            document.querySelector("#generated_npc_description").innerHTML = values.description;
        }

        function replaceName() {
            var oldName = generatedNameTextField.innerHTML.split(" ")[0];

            generatedNameTextField.innerHTML = values.firstname + " " + values.lastname;
            if (oldName == "") return;
            var descriptionEle = document.querySelector("#generated_npc_description");

            descriptionEle.innerHTML = descriptionEle.innerHTML.replace(new RegExp(oldName, "g"), values.firstname)
        }



    }




}

module.exports = NpcGenerator;