var crawlerSpells;
var webCrawler = function () {

    var TurndownService = require('turndown')
    var turndownService = new TurndownService()
    turndownService.addRule('strikethrough', {
        filter: ['a'],
        replacement: function (content) {
            return content
        }
    });

    function mineSpells() {
        var url = "https://www.dnd-spells.com/spell/";
        var spells;
        dataAccess.getSpells(data => {
            spells = data;
            crawlerSpells = spells;
            for (var i = 0; i < spells.length; i++) {
                if (spells[i].description.includes("This spell is not available"))
                    getSpellDesc(spells, i);
            }
          
            window.setTimeout(function(){
                fs.writeFile("missingSpells.json", JSON.stringify(spells), (err) => { console.log("Spells saved") });
            },35000)
      
        });

        function getSpellDesc(spellArr,index) {
         
            try {
                var spellName = spellArr[index].name;
                var xhttp = new XMLHttpRequest();
                console.log(spellName)
                spellName = spellName.toLowerCase().replace(/ /g, "-").replace(/'/g, "");
       
                xhttp.onreadystatechange = function () {
                    
                    if (this.readyState == 4 && this.status == 200) {
                  
                        const parser = new DOMParser();
                        const htmlDocument = parser.parseFromString(this.responseText, "text/html");
                        var doc = htmlDocument.documentElement;
                        var paragraphs = [... doc.querySelectorAll("p")].filter(x=> x.innerHTML != "");
                        
                        if(paragraphs.length == 0)return;
                        var description = paragraphs[3].innerHTML.trim();
                        if(description.includes("our mailing list"))return
                        description = description.replace(/<br>/g, "\n\n");
                        console.log(description);
                        spellArr[index].description = description;
                        var headers = [... doc.querySelectorAll(".classic-title")].filter(x=> x.innerHTML.includes("higher level"));
                        if(headers.length > 0){
                            var atHigherLevels = paragraphs[4].innerHTML.trim();
                            spellArr[index].higher_levels = atHigherLevels;
                        }
                        

                    }
                };

                xhttp.open("GET", url + spellName, true);
                xhttp.send();
            } catch(err){
                console.log(err)
            }
 
           
    }

    function nextByClass(node, cls) {
        while (node = node.nextSibling) {
            if (hasClass(node, cls)) {
                return node;
            }
        }
        return null;
    }
    function hasClass(elem, cls) {
        var str = " " + elem.className + " ";
        var testCls = " " + cls + " ";
        return(str.indexOf(testCls) != -1) ;
    }
    
}

function toTitleCase(str) {
    return str.replace(
        /\w\S*/g,
        function (txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        }
    );
}

function checkDndBeyond(url, callback) {
    var xhttp = new XMLHttpRequest();

    xhttp.onreadystatechange = function () {
        console.log(this)
        if (this.readyState == 4 && this.status == 200) {
            const monObject = {};
            const parser = new DOMParser();
            const htmlDocument = parser.parseFromString(this.responseText, "text/html");
            var doc = htmlDocument.documentElement;
            monObject.name = doc.querySelector(".mon-stat-block__name-link").innerHTML;
            monObject.name = monObject.name.trim();
            var metastring = doc.querySelector(".mon-stat-block__header>.mon-stat-block__meta").innerHTML;
            var metastringArray = metastring.split(",");
            monObject.size = metastringArray[0].split(" ")[0];
            monObject.type = metastringArray[0].split(" ")[1];
            monObject.alignment = metastringArray[1];

            var descBlocks = doc.querySelectorAll(".more-info-content>.mon-details__description-block>.mon-details__description-block-content");
            monObject.description = "";
            descBlocks.forEach(blk => {
                monObject.description += turndownService.turndown(blk.innerHTML);
            })


            var attributes = doc.querySelectorAll(".mon-stat-block__attribute");
            attributes.forEach(attri => {
                console.log(attri)
                var attributeLabel = attri.querySelector(".mon-stat-block__attribute-label");
                var attributeData = attri.querySelector(".mon-stat-block__attribute-data-value");
                if (attributeLabel != null && attributeData != null) {
                    monObject[serializeToAtt(attributeLabel.innerHTML)] = turndownService.turndown(attributeData.innerHTML).trim();

                    if (attributeLabel.innerHTML.trim().indexOf("Hit Points") >= 0) {
                        var hitDice = attri.querySelector(".mon-stat-block__attribute-data-extra").innerHTML;

                        if (hitDice != null) hitDice = hitDice.replace(/[\(\)]/g, "");
                        monObject.hit_dice = hitDice;

                    }
                }
            });
            addIfNotNull(monObject, "strength", doc.querySelector(".ability-block__stat--str"))
            addIfNotNull(monObject, "dexterity", doc.querySelector(".ability-block__stat--dex"))
            addIfNotNull(monObject, "constitution", doc.querySelector(".ability-block__stat--con"))
            addIfNotNull(monObject, "wisdom", doc.querySelector(".ability-block__stat--wis"))
            addIfNotNull(monObject, "intelligence", doc.querySelector(".ability-block__stat--int"))
            addIfNotNull(monObject, "charisma", doc.querySelector(".ability-block__stat--cha"))

            var tidbits = doc.querySelectorAll(".mon-stat-block__tidbit");
            tidbits.forEach(tid => {
                var attributeLabel = tid.querySelector(".mon-stat-block__tidbit-label");
                var attributeData = tid.querySelector(".mon-stat-block__tidbit-data");
                if (attributeLabel != null && attributeData != null) {
                    monObject[serializeToAtt(attributeLabel.innerHTML)] = turndownService.turndown(attributeData.innerHTML).trim();
                }
            });

            descBlocks = doc.querySelectorAll(".mon-stat-block__description-block");
            descBlocks.forEach(block => {
                var blkHeading = block.querySelector(".mon-stat-block__description-block-heading");
                if (blkHeading == null) {
                    monObject.special_abilities = addSpecialAbilities(block);
                } else if (blkHeading.innerHTML == "Actions") {
                    monObject.actions = addActions(block);
                } else if (blkHeading.innerHTML == "Legendary Actions") {
                    monObject.legendary_actions = addLegendaryActions(block);
                }
            });


            //Finalize
            if (monObject.challenge) {
                monObject.challenge_rating = parseInt(monObject.challenge);
                delete monObject.challenge;
                /*
                                    if(monObject.hit_points){
                                  
                                        var hpSplit = monObject.hit_points.split(" ");
                                        console.log(hpSplit)
                                        monObject.hit_points = hpSplit[0];
                                        monObject.hit_dice = hpSplit[1].replace(/[\(\)\s]/g, "");
                                    }
                                    */
            }


            console.log(monObject)
            if (callback) callback(monObject);
        }
    };
    xhttp.open("GET", url, true);
    xhttp.send();
}

function addLegendaryActions(block) {
    return baseAddActionArray(block, true);
}

function addActions(block) {
    return baseAddActionArray(block, true);
}
function addSpecialAbilities(block) {
    return baseAddActionArray(block, false)
}
function baseAddActionArray(block, isAction) {
    var paragraphs = block.querySelectorAll(".mon-stat-block__description-block-content>p");
    var arr = [];
    var lastKey;
    paragraphs.forEach(para => {
        var obj = {};
        var heading = para.querySelector("em>strong");
        if (heading != null) {
            para.removeChild(heading.parentNode);
            heading = styleHeading(heading);

        } else if (arr.length > 0) {
            arr[arr.length - 1].description = arr[arr.length - 1].description + "\n" + turndownService.turndown(para.innerHTML);
            return;
        } else {
            heading = "description"
        }
        if (isAction) {
            var attackBonus = para.innerHTML.match(/[+][0-9]+ to hit/g);
            if (attackBonus != null && attackBonus.length > 0)
                obj.attack_bonus = parseInt(attackBonus[0]);
            obj.name = heading;
            obj.description = turndownService.turndown(para.innerHTML);
            var dmgAndBonus = para.innerHTML.match(/\([0-9]+d[0-9]+( ?[+-]+ ?([0-9]+d[0-9])*([0-9]|[1-9]d[0-9]+))*\)/g);

            if (dmgAndBonus) {
                if (dmgAndBonus.length > 0) dmgAndBonus = dmgAndBonus.join("+");
                dmgAndBonus = dmgAndBonus.replace(/[\(\)\s]/g, "")
                console.log(dmgAndBonus)
                var splt = dmgAndBonus.split("+");
                var dmgDice = "";
                var dmgBonus;
                splt.forEach(entry => {
                    if (entry.indexOf("d") >= 0 || entry.indexOf("D") > 0) {
                        dmgDice += dmgDice != "" ? "+" + entry : entry;
                    } else {
                        dmgBonus = entry;
                    }
                });
                if (dmgBonus) obj.damage_bonus = dmgBonus;
                if (dmgDice != "") obj.damage_dice = dmgDice
            }
        } else {
            obj[heading] = turndownService.turndown(para.innerHTML);
        }
        arr.push(obj);
    })
    return arr;
}

function styleHeading(heading) {
    heading = heading.innerHTML.trim();
    if (heading.substring(heading.length - 1) == ".") heading = heading.substring(0, heading.length - 1); //Remove dot
    return heading;
}
function addIfNotNull(obj, key, docEle) {

    if (docEle != null) {
        obj[key] = docEle.querySelector(".ability-block__score").innerHTML.trim();
    }

}
//Morphs string by putting all to lower case and
//and replacing whitespace with _
function serializeToAtt(string) {

    var x = string.toLowerCase();
    x = x.replace(/ /g, "_");
    return x;

}

return {
    checkDndBeyond: checkDndBeyond,
    mineSpells: mineSpells
}
}();

