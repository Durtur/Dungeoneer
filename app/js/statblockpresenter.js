
document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("spell_popup").addEventListener("mouseenter", function (e) {
    e.target.setAttribute("data-mouse-over", "t");
    $('#spell_popup').finish().fadeIn("fast");
  });
  document.getElementById("spell_popup").addEventListener("mouseleave", function (e) {
    e.target.setAttribute("data-mouse-over", "f");
    $('#spell_popup').finish().fadeOut("slow");
    delayOpening = true;

  });
});

var statblockPresenter = function () {
  var foundMonster;
  var encounterModule;
  var values;
  var statblock;
  var abilityScores = {};
  const attributeNamesToIgnore = ["condition_color_value", "condition_background_location", "id"];
  const attributeNamesToHeader = ["name"]
  const attributesWithoutNames = [" ", "description"];
  var spellCastingRootNodes = [];

  function createStatblock(_statblock, valueElement, statblockType) {
    foundMonster = valueElement;
    statblock = _statblock;
    console.log(statblock)
    while (statblock.firstChild)
      statblock.removeChild(statblock.firstChild);
    values = JSON.parse(JSON.stringify(valueElement));
    if (["tables", "random_tables", "spells", "conditions", "items"].indexOf(statblockType) >= 0) {
      statblock.classList.add("single_column");
    } else {
      statblock.classList.remove("single_column");
    }

    validateEntry(valueElement);
    abilityScores = {};
    [
      addClasses,
      addName,
      addRitual,
      addSpellProperties,
      storeDescription,
      createTypeDescription,
 
      addRequiredProperties,
      addSpeed,
      addSavingThrowRow,
      addAbilityRow,
      morphActions,
      storeTable,
      storeHigherLevels,
      populateRemainingStats,
      addDescription,
      addTable,
      createAndAddEncounterDescription,
      addHigherLevels,
      finalizeStatblock
    ].forEach(step => {
      if (typeof step == "function")
        return step();
      baseCreatePropertyAndDelete(step);

    });
  }
  var higher_levels;
  function storeHigherLevels() {
    higher_levels = values.higher_levels;
    delete values.higher_levels;
  }
  function addHigherLevels() {
    if (higher_levels == null || higher_levels == "") return;

    statblock.appendChild(createParaAndBold("Higher levels", higher_levels));
    higher_levels = null;
  }
  var statblock_table;
  function storeTable() {
    statblock_table = values.table;
    delete values.table;
  }
  function addName() {
    if (values.name == null) return;
    var h2 = document.createElement("h1");
    h2.innerHTML = values.name;
    statblock.appendChild(h2);
    if(dataAccess.getTokenPath(values.id)){
      console.log(dataAccess.getTokenPath(values.id))
    }
    delete values.name;
  }
  var statblockDescriptionText;
  function storeDescription() {
    statblockDescriptionText = values.description ||"";
    if(values.tags && values.tags.length > 0){
      statblockDescriptionText= "**Tags.** *" + values.tags.join(", ") + "*\n\n" + statblockDescriptionText;
    }
    delete values.description;
    delete values.tags;
  }

  function addDescription() {
    if (!statblockDescriptionText)
      return;
    var p = document.createElement("p");

    p.innerHTML = marked(statblockDescriptionText);
    createSeperator();
  
    statblock.appendChild(p);
 

  }

  function addTable() {
    if (!statblock_table) return;
    statblock.append(generateHTMLTable(statblock_table));
  }

  function addSpeed(){
    if(!values.speed)return;
    var p = document.createElement("p");
    p.innerHTML = "<strong>Speed.</strong> " + values.speed;
    statblock.appendChild(p);
    delete values.speed;
  }
  function addRequiredProperties() {
    if(!(values.hit_points || values.armor_class || values.challenge_rating))return;
    var hpAndACRow = document.createElement("div");
    hpAndACRow.classList = "statblock_hp_and_ac_row";
    if (values.hit_points)
      createCol("hit_points");

    if (values.armor_class)
      createCol("armor_class");
    if (values.challenge_rating)
      createCol("challenge_rating", "CR", (encounterModule ? encounterModule : new EncounterModule()).getXpValueForCR(values.challenge_rating) + " xp");
    statblock.appendChild(hpAndACRow);

    function createCol(prop, showName, title) {
      if (values[prop] == null) return;
      var newCol = document.createElement("div");
      newCol.classList = "column";
      var newP = document.createElement("p");
      newP.classList = "statblock_key_stats statblock_" + prop;
      newP.innerHTML = values[prop];
      newP.title = title ? title : prop.replace(/_/g, " ").toProperCase();
      if (showName) {
        var strP = document.createElement("p");
        strP.style.textAlign = "center";
        strP.style.margin = "0";
        var str = document.createElement("strong");
        str.innerHTML = showName;
        strP.appendChild(str);
        newCol.appendChild(strP);
      }

      newCol.appendChild(newP);
      delete values[prop];
      hpAndACRow.appendChild(newCol);
    }


  }
  function morphActions() {
    if (!values.actions)
      return;
    var action, actionString;
    for (var j = 0; j < values.actions.length; j++) {
      action = values.actions[j];
      actionString = "";
      if (!action.attack_bonus && !action.damage_dice && !action.damage_bonus) continue;
      if (action.attack_bonus) {
        if (parseInt(action.attack_bonus) >= 0) {
          actionString = "+" + action.attack_bonus + " to hit";
        } else {
          actionString = action.attack_bonus + " to hit";
        }
      }
      if (action.damage_dice) {
        actionString += " " + action.damage_dice;

      }
      if (action.damage_bonus) {
        actionString += (action.damage_dice != null ? "+" + action.damage_bonus : action.damage_bonus)

      } else if (!action.damage_bonus && !action.damage_dice) {
        actionString += "0"
      }
      actionString += " damage";
      action[" "] = actionString;
      delete action.attack_bonus;
      delete action.damage_dice;
      delete action.damage_bonus;
    }
  }
  function addClasses() {
    if (values.classes == null)
      return;
    var classes = values.classes;
    var classBlock = document.createElement("div");
    classBlock.classList.add("class_row");
    var count = 1;
    classes.forEach(pcClass => {

      var newClass = document.createElement("div");
      newClass.classList.add("class_node");
      newClass.innerHTML = pcClass.substring(0, 1).toUpperCase() + pcClass.substring(1) + (count < classes.length ? " - " : "");
      count++;
      classBlock.appendChild(newClass);
    });
    statblock.appendChild(classBlock);
    delete values.classes;
  }

  function addSavingThrowRow() {
    var monsterSavingthrowValues = [];
    ["strength_save", "dexterity_save", "constitution_save", "intelligence_save", "wisdom_save", "charisma_save"].forEach(attr => {
      if (!values[attr]) {
        if (values[attr.replace("_save", "")])
          monsterSavingthrowValues.push({ name: attr, value: getAbilityScoreModifier(values[attr.replace("_save", "")]) });
        return;
      }
      monsterSavingthrowValues.push({ name: attr, value: values[attr] });
      delete values[attr];
    });
 
    if (monsterSavingthrowValues.length == 0) return;
    var abilityRow = document.createElement("div");
    abilityRow.classList.add("statblock_saving_throw_row")
    monsterSavingthrowValues.forEach(save => {

      var element = document.createElement("div");
      var modifier = parseInt(save.value);
      modifier = modifier < 0 ? modifier : "+" + modifier;
      element.innerHTML = "<p>" + modifier + "</p>";
      element.title = save.name.deserialize();

      abilityRow.appendChild(element);

    });
    var cont = document.createElement("div");
    cont.classList = "column statblock_saving_throw_row_container";
    var p = document.createElement("p");
    p.innerHTML = "SAVES";
    p.classList = "center statblock_saves_label"
    cont.appendChild(p);
    cont.append(abilityRow);
    createSeperator();
    statblock.append(cont);
  }

  function addAbilityRow() {
    var monsterAbilityValues = [];
    ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"].forEach(attr => {
      if (values[attr] == null) return;
      abilityScores[attr] = values[attr];
      monsterAbilityValues.push({ name: attr, value: values[attr] });
      delete values[attr];
    });
    if (monsterAbilityValues.length == 0) return;
    var abilityRow = document.createElement("div");
    abilityRow.classList.add("ability_row")
    monsterAbilityValues.forEach(ability => {
      var wrapper = document.createElement("ul");
      var scoreEle = document.createElement("li");
      var nameEle = document.createElement("li");
      var modEle = document.createElement("li");
      modEle.classList = "statblock_modifier";
      var modifier = getAbilityScoreModifier(ability.value);
      modifier = modifier < 0 ? modifier : "+" + modifier;
      modEle.innerHTML = "<p>" + modifier + "</p>";
      scoreEle.innerHTML = "<p>" + ability.value + "</p>";
      nameEle.innerHTML = "<p>" + ability.name.substring(0, 3).toUpperCase() + "</p>";
      wrapper.appendChild(nameEle);
      wrapper.appendChild(scoreEle);
      wrapper.appendChild(modEle);
      abilityRow.appendChild(wrapper);

    });

    statblock.append(abilityRow);
    createSeperator();

  }

  function createSeperator(append = true) {


    var seperator = document.createElement("div");

    seperator.classList = "statblock_seperator_line";
    if(append)statblock.appendChild(seperator);
    return seperator;
  }
  function addSpellProperties() {
    var divCont = document.createElement("div");
    divCont.classList = "spell_statblock_properties";
    if (values["level"])
      if (values.level == 0 || values.level == "0") values.level = "Cantrip";
    var props = ["level", "school", "range", "casting_time",
      "duration", "components"];
    var col, hasAnySpellProp = false;
    for (var i = 0; i < props.length; i++) {
      var prop = props[i];
      if (values[prop] == null) continue;
      hasAnySpellProp = true;
      if (i % 2 == 0) {
        col = document.createElement("div");
        col.classList = "column";
        divCont.appendChild(col);
      }
      var colInner = document.createElement("div");
      var strP = document.createElement("p");
      var str = document.createElement("strong");
      str.innerHTML = prop.deserialize();
      strP.appendChild(str);
      colInner.appendChild(strP)
      colInner.appendChild(createPara(values[prop]));
      col.appendChild(colInner);
      delete values[prop];
    }
    if (!hasAnySpellProp)return;
      createSeperator();
      statblock.appendChild(divCont);

  }

  function createAndAddEncounterDescription() {
    if (values.encounter_xp_value && partyArray.filter(p => p.active).length > 0) {
      var allLevels = [];
      var levelCounts = [];

      partyArray.filter(p => p.active).forEach(partyMember => {
        allLevels.push(partyMember.level)
        var lvlIndex = parseInt(partyMember.level)
        levelCounts[lvlIndex] = levelCounts[lvlIndex] ? levelCounts[lvlIndex] + 1 : 1;
      });

      var levelsLeft = 0;
      levelCounts.forEach(x => { if (x) levelsLeft++; })
      var encPcLevelString = "";
      for (var i = 0; i < levelCounts.length; i++) {
        if (levelCounts[i]) {
          levelsLeft--;
          encPcLevelString += levelCounts[i] + " level " + i + " character" + (levelCounts[i] > 1 ? "s" : "") + (levelsLeft > 0 ? (levelsLeft == 1 ? " and " : ", ") : "")
        }
      }
      encounterDescription = (encounterModule ? encounterModule : new EncounterModule()).getTextualDescriptionForValue(allLevels, values.encounter_xp_value)
      createEncounterDifficultyElement(encounterDescription, values.encounter_xp_value, encPcLevelString);

      delete values.encounter_xp_value;
      function createEncounterDifficultyElement(description, totalXp, partyDescString) {
        var newP = document.createElement("p");

        newP.innerHTML = "This encounter is " + description + " (" + totalXp + "xp)" + " for a party of " + partyDescString;
        newP.classList.add("encounter_difficulty_description")
        statblock.appendChild(newP);
      }
    }
  }

  function populateRemainingStats() {
    var keys = Object.keys(values);
    var div = document.createElement("div");

    populateStats(keys, values, div);
    statblock.appendChild(div);
  }

  function baseCreatePropertyAndDelete(propertyName) {
    var prop = values[propertyName];
    if (prop == null) return;
    statblock.appendChild(createParaAndBold(propertyName, prop));
  }

  function addRitual() {
    if (!values.ritual) {
      delete values.ritual;
      return;
    }
    var em = document.createElement("em");
    var p = document.createElement("p");
    em.innerHTML = "Ritual";
    p.appendChild(em);
    statblock.appendChild(p);
    delete values.ritual;
  }
  function createTypeDescription() {
    var str = values.size != null ? values.size
      : (values.rarity != null ? values.rarity : "");
    delete values.size;
    delete values.rarity;
    if (values.type) {
      str += " " + values.type;
      delete values.type;
      if (values.subtype) {
        str += " (" + values.subtype + ")";
        delete values.subtype;
      }
    }
    if (!str) return;
    var em = document.createElement("em");
    var p = document.createElement("p");
    em.innerHTML = str;
    p.appendChild(em);
   // createSeperator();
    statblock.appendChild(p);
  }

  function validateEntry(obj) {
    if (obj.speed = null) obj.speed = "-";
  }
  function createHeader(text) {
    var seperator = createSeperator(false);
    var cont = document.createElement("div");
    cont.appendChild(createHeaderHelper(text, "h2"));
    cont.appendChild(seperator);
    return cont;
  }

  function createHeaderSmaller(text) {
    return createHeaderHelper(text, "h3");
  }

  function createHeaderHelper(text, size) {
    text = text.replace(/_/g, " ");
    var h2 = document.createElement(size);
    h2.classList = "statblock_"+text;
    h2.innerHTML = text.toProperCase()
    return h2;
  }

  function createPara(text) {
    text = text + "";
    var p = document.createElement("p");
    p.innerHTML = marked(text.substring(0, 1).toUpperCase() + text.substring(1));
    return p;
  }

  function createParaAndBold(boldText, paraText) {
    paraText = paraText + "";
    var newDiv = document.createElement("p");
    boldText += boldText.substring(boldText.length - 1) == "." ? "" : ".";
    boldText = boldText.deserialize();

    newDiv.innerHTML = marked("**" + boldText + "** " + paraText.substring(0, 1).toUpperCase() + paraText.substring(1));

    return newDiv;
  }
  function populateStats(k, v, statblock) {
    if (Array.isArray(v)) {

      if (v.length > 0 && v.constructor != Object)
        statblock.appendChild(createHeader(k));
      for (var i = 0; i < v.length; i++) {
        populateStats(i, v[i], statblock);
      }

    } else if (typeof v === "object") {
      for (var k in v) {
        populateStats(k, v[k], statblock);
      }
    } else {
      if ((typeof k) == "string" && k.toLowerCase().indexOf("spellcast") >= 0 | (typeof v) == "string" && v.toLowerCase().indexOf("spell") >= 0)
        spellCastingRootNodes.push(k);

      if (v != "" && attributeNamesToIgnore.indexOf(k) < 0) {
        if ((typeof k) == "string") {
          statblock.appendChild(
            attributeNamesToHeader.indexOf(k.toLowerCase()) >= 0 ?
              createHeaderSmaller(v) :
              (attributesWithoutNames.indexOf(k.toLowerCase()) < 0 ?
                createParaAndBold(k, v) : createPara(v))
          );
        }
      }

    }
  }

  function finalizeStatblock() {
    var randBtn = document.getElementById("statblock_random_table_button");
    if (randBtn != null) {
      if (statblock.getElementsByTagName("table")[0] != null) {
        randBtn.classList.remove("hidden");
      } else {
        randBtn.classList.add("hidden");
      }
    }
    if (spellCastingRootNodes.length > 0)
      spellcastingLinkController.updateLinks(statblock);
    diceRollerLinkController.updateLinks(statblock);
  }


  var diceRollerLinkController = function () {
    function updateLinks(statblock) {

      var paragraphs = [...statblock.getElementsByTagName("p")];
      paragraphs.forEach(paragraph => {
        //dx and dx + x strings

        paragraph.innerHTML = paragraph.innerHTML.replace(/[0-9]+d[0-9]+( ?[+-]+ ?([0-9]+d[0-9])*([0-9]|[1-9]d[0-9])+)*/g, function (match, p1, offset, string) {
          var newEle = document.createElement("a");
          newEle.classList.add("dice_roller_link");
          newEle.innerHTML = match;
          return newEle.outerHTML;

        });
        paragraph.innerHTML = paragraph.innerHTML.replace(/(?<=\D)[+-]\s?\d+(?!\s*\d*\s*\<\/a)/g, function (match, p1, p2, offset, string) {

          var nonHTML = "";
          
          var newD = document.createElement("a");
          newD.innerHTML = match;
          newD.classList.add("d20_roll_link");
          return nonHTML + newD.outerHTML;

        });


      });


      window.setTimeout(() => {
        [...document.getElementsByClassName("d20_roll_link")].forEach(d20Handler => {
          d20Handler.addEventListener("click", function (e) {
            var rand = d(20);
            console.log(e.target.innerHTML)
            showHandlerRollResult(rand + parseInt(e.target.innerHTML), e);
          });
        });

        [...document.getElementsByClassName("dice_roller_link")].forEach(d20Handler => {
          d20Handler.addEventListener("click", function (e) {

            showHandlerRollResult(diceRoller.rollFromString(e.target.innerHTML), e);

          });
        });
      }, 700)


    }

    function showHandlerRollResult(text, event) {
      Util.showBubblyText(text, { x: event.clientX, y: event.clientY });

    }
    return {
      updateLinks: updateLinks
    }
  }();

  var spellcastingLinkController = function () {

    var knownSpells;
    function updateLinks(statblock) {
      knownSpells = [];

      var paragraphs = statblock.getElementsByTagName("p");
      var spellcastingAttribute = "";

      spellCastingRootNodes.forEach(node => {
        var currAttribute = foundMonster[node];
        spellcastingAttribute += " ";

        if (!currAttribute) {
          if (foundMonster.special_abilities)
            foundMonster.special_abilities.forEach(function (ability) {

              if (ability[node]) {

                spellcastingAttribute += ability[node].toLowerCase();
              }

            })
        } else {
          spellcastingAttribute += currAttribute;
        }

      });


      if (spellcastingAttribute == "")
        return;
      dataAccess.getSpells(function (spells) {
        spells = spells.sort(function (a, b) {
          return b.name.length - a.name.length;
        })

        spells.forEach(function (spell) {
          var index = spellcastingAttribute.indexOf(spell.name.toLowerCase());
          if (index >= 0) {
            spell.name = spell.name;
            knownSpells.push(spell);
            //Remove from set
            spellcastingAttribute = spellcastingAttribute.substring(0, index) + spellcastingAttribute.substring(index + spell.name.length)
          }

        });

        [...paragraphs].forEach(function (paragraph) {

          if (paragraph.getAttribute("data-spell-links-updated") == "t") return;
          var descriptions = paragraph.getElementsByTagName("strong");
          if (descriptions.length > 0 && descriptions[0].innerHTML.toLowerCase().indexOf("spellcasting") >= 0) {
            updateLinksForParagraph(paragraph);
          }

        });
        createHandlersForSpellLinks();

      });

      spellCastingRootNodes = [];

    }

    var delayedOpening, delayedClosing;
    function createHandlersForSpellLinks() {
      var allLinks = [...document.getElementsByClassName("spell_link")];
      allLinks.forEach(link => link.addEventListener("mouseenter", function (e) {
        e.target.setAttribute("data-mouse-over", "t")
        clearTimeout(delayedOpening);
        delayedOpening = window.setTimeout(function () {
          if (document.getElementById("spell_popup").getAttribute("data-mouse-over") == "t" || e.target.getAttribute("data-mouse-over") == "f")
            return;
          var spellName = e.target.getAttribute("data-spell");
          var spell;

          dataAccess.getSpells(function (spells) {
            for (var i = 0; i < spells.length; i++) {
              if (spells[i].name.toLowerCase() == spellName) {
                spell = spells[i];
                break;
              }
            }
            if (!spell)
              return;
            var popupWindow = document.getElementById("spell_popup");
            $('#spell_popup').finish().fadeIn("fast");
            showSpell(spell);
            var scrollDistance = parseInt(document.getElementsByClassName("main_content_wrapper")[0].scrollTop);
            var calculatedTop = (parseInt(e.clientY) + scrollDistance);
            var calculatedLeft = (parseInt(e.clientX) - parseInt(popupWindow.clientWidth));

            if (calculatedTop + parseInt(popupWindow.clientHeight) > window.innerHeight) calculatedTop = window.innerHeight - parseInt(popupWindow.clientHeight) - 30 + scrollDistance;
            if (calculatedLeft + parseInt(popupWindow.clientWidth) > window.innerWidth) calculatedLeft = window.innerWidth - parseInt(popupWindow.clientWidth) - 30;
            if (calculatedTop < 0) calculatedTop = 0 + scrollDistance;
            if (calculatedLeft < 0) calculatedLeft = 0;
            popupWindow.style.top = calculatedTop + "px";
            popupWindow.style.left = calculatedLeft + "px";


          });
        }, 600)
      }));
      allLinks.forEach(link => link.addEventListener("mouseleave", function (e) {
        e.target.setAttribute("data-mouse-over", "f")
        window.clearTimeout(delayedClosing);
        delayedClosing = window.setTimeout(function () {
          if (document.getElementById("spell_popup").getAttribute("data-mouse-over") == "f")
            $('#spell_popup').finish().fadeOut("slow");
        }, 600)

      }));
    }
    function showSpell(spell) {

      document.getElementById("spell_popup_name").innerHTML = spell.name;
      document.getElementById("spell_popup_school").innerHTML = spell.school;
      document.getElementById("spell_popup_level").innerHTML = spell.level;
      document.getElementById("spell_popup_range").innerHTML = spell.range;
      document.getElementById("spell_popup_casting_time").innerHTML = spell.casting_time;
      document.getElementById("spell_popup_duration").innerHTML = spell.duration;
      document.getElementById("spell_popup_higher_levels").innerHTML = spell.higher_levels;
      document.getElementById("spell_popup_description").innerHTML = marked(spell.description);
      document.getElementById("spell_popup_components").innerHTML = spell.components
      document.getElementById("spell_popup_ritual").innerHTML = !spell.ritual || spell.ritual == "" ? "" : "(Ritual)"
      $("#spell_popup").find("a").attr("onclick", "return spellcastingLinkController.showSpellInPopup($(this).attr('href'))");
    }

    function showSpellInPopup(spellname) {

      dataAccess.getSpells(function (spells) {
        spells.forEach(function (spell) {
          if (spell.name.toLowerCase() == spellname) {
            showSpell(spell)
          }
        })
      })
      return false;
    }

    function isLetterOrNum(c) {
      if (c == null) return false;
      if (isNaN(parseInt(c))) {
        return c.toLowerCase() != c.toUpperCase();
      }
      return true;
    }
    function updateLinksForParagraph(paragraph) {
      if (paragraph.getAttribute("data-spell-links-updated") == "t") return;
      var innerText = paragraph.innerHTML;
      var textTemplate = innerText.toLowerCase();
      var separators = [" ", ",", ".", ";", ">", "<"];
      knownSpells.forEach(function (spell) {
        if (!spell || !spell.name)
          return;
        var spellIndex = textTemplate.indexOf(spell.name.toLowerCase());

        if (spellIndex >= 0) {
          var charBefore = spellIndex != 0 ? textTemplate.substring(spellIndex - 1, spellIndex) : null;
          var charAfter = spellIndex != textTemplate.length ? textTemplate.substring(spellIndex + spell.name.length, spellIndex + spell.name.length + 1) : null;
          if (isLetterOrNum(charBefore) || isLetterOrNum(charAfter)) {
            return;
          }


          var spellNameLength = spell.name.length;
          var newAnchor = document.createElement("a");
          newAnchor.classList.add("spell_link");
          newAnchor.setAttribute("data-spell", spell.name.toLowerCase().trim());
          newAnchor.innerHTML = spell.name;

          innerText = innerText.substring(0, spellIndex)
            + newAnchor.outerHTML + innerText.substring(spellIndex + spellNameLength, innerText.length)
          var spaceToFill = newAnchor.outerHTML.length;
          var whiteSpaceFill = "";
          for (var i = 0; i < spaceToFill; i++) {
            whiteSpaceFill += " ";
          }
          textTemplate = textTemplate.substring(0, spellIndex) + whiteSpaceFill + textTemplate.substring(spellIndex + spellNameLength, textTemplate.length)


        }
      });
      paragraph.setAttribute("data-spell-links-updated", "t")
      paragraph.innerHTML = innerText;
      if (paragraph.nextElementSibling
        && paragraph.nextElementSibling.getAttribute("data-spell-links-updated") != "t") {

        updateLinksForParagraph(paragraph.nextElementSibling);
      }
    }
    return {
      showSpellInPopup: showSpellInPopup,
      updateLinks: updateLinks
    }
  }();



  return {
    createStatblock: createStatblock
  }




}();

