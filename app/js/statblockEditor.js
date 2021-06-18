

class StatblockEditor{
    //specialAbilities array
    static equipWeapon(dexMod,strengthMod, proficincyMod, weapon, specialAbilities){
   
        var returnObj = {};
        var diceMult = specialAbilities?.find(x=> x.toLowerCase() === "brute") ? 2 : 1; 
        var diceStringArr = weapon.damageDice.split("d");
        diceStringArr[0] = parseInt(diceStringArr[0] * diceMult);
        returnObj.damageDice = diceStringArr.join("d");
        returnObj.attackBonus = weapon.finesse || weapon.ranged ? parseInt(dexMod) + parseInt(proficincyMod)
                                                          : parseInt(strengthMod) + parseInt(proficincyMod)
        returnObj.damageBonus = (weapon.finesse || weapon.ranged) ? parseInt(dexMod) : parseInt(strengthMod)
        returnObj.description = `${(weapon.ranged ? "Ranged" : "Melee")} weapon attack: ${(returnObj.attackBonus > 0 ? "+": "")}${returnObj.attackBonus} to hit, ${rangedOrReach()}, one target. Hit: ${returnObj.damageDice}${(returnObj.attackBonus > 0 ? "+": "")}${returnObj.damageBonus} ${weapon.damageType} damage.`;
        return returnObj;   

        function rangedOrReach(){
            return weapon.ranged ? `range ${weapon.ranged} ft.` : `reach ${(weapon.reach || 5)} ft.${(weapon.thrown ? ` or ranged ${weapon.thrown} ft.`: "")}`
        }
    }

    static relaceMonsterWeapon(monster, oldWeapon, newWeapon){
        //Guess proficiency modifer
        var dexMod = getAbilityScoreModifier(monster.dexterity);
        var strMod = getAbilityScoreModifier(monster.strength);
        var oldAction = monster.actions.find(x=> x.name.toLowerCase() == oldWeapon.name.toLowerCase());
        var profMod = parseInt(oldAction.attack_bonus) - ((oldWeapon.finesse || oldWeapon.ranged) ? dexMod : strMod );
        
        var newAction = this.equipWeapon(dexMod, strMod, profMod, newWeapon, monster.special_abilities?.map(x=> Object.keys(x)[0] ||[]));
        oldAction.damage_dice = newAction.damageDice;
        oldAction.attack_bonus = newAction.attackBonus;
        oldAction.damage_bonus = newAction.damageBonus;
        oldAction.description = newAction.description;
        oldAction.name = newWeapon.name;
        monster.original_name = monster.original_name || monster.name;
        monster.name = (monster.original_name || monster.name) + ` (${newWeapon.name})`
    
    }

}

module.exports = StatblockEditor;