

module.exports = function () {
    function getAverage(offensive, defensive) {
        console.log(offensive, defensive)
        var check = Math.floor((offensive + defensive) / 2);
        if (check > 0) return check;
        check = (offensive + defensive) / 2;
 
        var values = [0, 0.125, 0.25, 0.5];
        var diff;
        for (var i = 0; i < values.length; i++) {
            var diffCurrent = Math.abs(check - values[i]);
            if (check <= [values[i]]) {

        
                if (diff && diffCurrent >= diff) {
                    return values[i - 1];
                } else {
                    return values[i];
                }

            }
            diff = diffCurrent;

        }
        if (1 - check > 0.5) return 1;
        return 0.5;
    }

    function calculateCR(ac, hp, attackBonus, predictedDmg, saveDc) {

        if (!predictedDmg) predictedDmg = 1;
        if (!hp) hp = 1;
        if (!attackBonus) attackBonus =  0;
        if (!ac) ac = 12;

        console.log(predictedDmg, hp, attackBonus, ac)
        // if (!expectedCR) {
        //     //Approximate 
        //     var found = table.find(x => x.minHP <= hp && x.maxHP >= hp);
        //     if (!found) found = table[table.length - 1]
        //     dCr = found
          
        //     var found = table.find(x => x.minDmg <= predictedDmg && x.maxDmg >= predictedDmg);
        //     if (!found) found = table[table.length - 1]
        //     oCr = found;
        //     console.log(`Offensive challenge rating ${found.cr}`);
        //     expectedCR = getAverage(eval(oCr.cr, dCr.cr));
        // }

  
        var found = table.find(x => x.minHP <= hp && x.maxHP >= hp);
        console.log(found)
        var acDiff = ac - found.ac;
        var adjust = Math.floor(Math.abs(acDiff)/2);
        if(acDiff < 0)adjust *= -1;
        console.log(`Adjust defensive CR by ${adjust}`);
        var index = table.indexOf(found);
        index+=adjust;
        if(index < 0)index = 0;
        if(index >= table.length)index = table.length-1;
      
        var dCr= table[index];

        found = table.find(x => x.minDmg <= predictedDmg && x.maxDmg >= predictedDmg);
        console.log(found);
        //Check if save DC is higher and should be used
        var useSave = false;
        if(saveDc){
            var atkEntry = table.find(x=> x.attack_bonus >= attackBonus);
            var dcEntry = table.find(x=> x.saveDc >= saveDc);
            if(dcEntry){
                if(!atkEntry || eval(dcEntry.cr) > eval(atkEntry.cr)){
                    useSave = true;
                }
  
            }
        }
        var attkDiff = useSave ? saveDc - found.saveDc : attackBonus - found.attack_bonus;
        adjust = Math.floor(Math.abs(attkDiff)/2);
        if(attkDiff < 0)adjust *= -1;
        console.log(`Adjust offensive CR by ${adjust}`);

        index = table.indexOf(found);
        index+=adjust;
        if(index < 0)index = 0;
        if(index >= table.length)index = table.length-1;
      
        var oCr=  table[index];

        var cr = getAverage(eval(oCr.cr) || 0, eval(dCr.cr) || 0);
        cr = table.find(x=> eval(x.cr) == cr);
        return { cr_entry: cr, dcr_entry: dCr, ocr_entry: oCr }
    }



    var table = [

        { cr: "0", minHP: 1, maxHP: 6, profBonus: 2, ac: 13, ac_string:"≤13", minDmg: 0, maxDmg: 1, saveDc: 13, saveDc_string : "≤13", attack_bonus: 3, attack_bonus_string : "≤3" },
        { cr: "1/8", minHP: 7, maxHP: 35, profBonus: 2, ac: 13, minDmg: 2, maxDmg: 3, saveDc: 13, attack_bonus: 3 },
        { cr: "1/4", minHP: 36, maxHP: 49, profBonus: 2, ac: 13, minDmg: 4, maxDmg: 5, saveDc: 13, attack_bonus: 3 },
        { cr: "1/2", minHP: 50, maxHP: 70, profBonus: 2, ac: 13, minDmg: 6, maxDmg: 8, saveDc: 13, attack_bonus: 3 },
        { cr: "1", minHP: 71, maxHP: 85, profBonus: 2, ac: 13, minDmg: 9, maxDmg: 14, saveDc: 13, attack_bonus: 3 },
        { cr: "2", minHP: 86, maxHP: 100, profBonus: 2, ac: 13, minDmg: 15, maxDmg: 20, saveDc: 13, attack_bonus: 3 },
        { cr: "3", minHP: 101, maxHP: 115, profBonus: 2, ac: 13, minDmg: 21, maxDmg: 26, saveDc: 13, attack_bonus: 4 },
        { cr: "4", minHP: 116, maxHP: 130, profBonus: 2, ac: 14, minDmg: 27, maxDmg: 32, saveDc: 14, attack_bonus: 5 },
        { cr: "5", minHP: 131, maxHP: 145, profBonus: 3, ac: 15, minDmg: 33, maxDmg: 38, saveDc: 15, attack_bonus: 6 },
        { cr: "6", minHP: 146, maxHP: 160, profBonus: 3, ac: 15, minDmg: 39, maxDmg: 44, saveDc: 15, attack_bonus: 6 },
        { cr: "7", minHP: 161, maxHP: 175, profBonus: 3, ac: 15, minDmg: 45, maxDmg: 50, saveDc: 15, attack_bonus: 6 },
        { cr: "8", minHP: 176, maxHP: 190, profBonus: 3, ac: 16, minDmg: 51, maxDmg: 56, saveDc: 16, attack_bonus: 7 },
        { cr: "9", minHP: 191, maxHP: 205, profBonus: 4, ac: 16, minDmg: 57, maxDmg: 62, saveDc: 16, attack_bonus: 7 },
        { cr: "10", minHP: 206, maxHP: 220, profBonus: 4, ac: 17, minDmg: 63, maxDmg: 68, saveDc: 16, attack_bonus: 7 },
        { cr: "11", minHP: 221, maxHP: 235, profBonus: 4, ac: 17, minDmg: 69, maxDmg: 74, saveDc: 17, attack_bonus: 8 },
        { cr: "12", minHP: 236, maxHP: 250, profBonus: 4, ac: 17, minDmg: 75, maxDmg: 80, saveDc: 17, attack_bonus: 8 },
        { cr: "13", minHP: 251, maxHP: 265, profBonus: 5, ac: 18, minDmg: 81, maxDmg: 86, saveDc: 18, attack_bonus: 8 },
        { cr: "14", minHP: 266, maxHP: 280, profBonus: 5, ac: 18, minDmg: 87, maxDmg: 92, saveDc: 18, attack_bonus: 8 },
        { cr: "15", minHP: 281, maxHP: 295, profBonus: 5, ac: 18, minDmg: 93, maxDmg: 98, saveDc: 18, attack_bonus: 8 },
        { cr: "16", minHP: 296, maxHP: 310, profBonus: 5, ac: 18, minDmg: 99, maxDmg: 104, saveDc: 18, attack_bonus: 9 },
        { cr: "17", minHP: 311, maxHP: 325, profBonus: 6, ac: 19, minDmg: 105, maxDmg: 110, saveDc: 19, attack_bonus: 10 },
        { cr: "18", minHP: 326, maxHP: 340, profBonus: 6, ac: 19, minDmg: 111, maxDmg: 116, saveDc: 19, attack_bonus: 10 },
        { cr: "19", minHP: 341, maxHP: 355, profBonus: 6, ac: 19, minDmg: 117, maxDmg: 122, saveDc: 19, attack_bonus: 10 },
        { cr: "20", minHP: 356, maxHP: 400, profBonus: 6, ac: 19, minDmg: 123, maxDmg: 140, saveDc: 19, attack_bonus: 10 },
        { cr: "21", minHP: 401, maxHP: 445, profBonus: 7, ac: 19, minDmg: 141, maxDmg: 158, saveDc: 20, attack_bonus: 11 },
        { cr: "22", minHP: 446, maxHP: 490, profBonus: 7, ac: 19, minDmg: 159, maxDmg: 176, saveDc: 20, attack_bonus: 11 },
        { cr: "23", minHP: 491, maxHP: 535, profBonus: 7, ac: 19, minDmg: 177, maxDmg: 194, saveDc: 20, attack_bonus: 11 },
        { cr: "24", minHP: 536, maxHP: 580, profBonus: 7, ac: 19, minDmg: 195, maxDmg: 212, saveDc: 21, attack_bonus: 12 },
        { cr: "25", minHP: 581, maxHP: 625, profBonus: 8, ac: 19, minDmg: 213, maxDmg: 230, saveDc: 21, attack_bonus: 12 },
        { cr: "26", minHP: 626, maxHP: 670, profBonus: 8, ac: 19, minDmg: 231, maxDmg: 248, saveDc: 21, attack_bonus: 12 },
        { cr: "27", minHP: 671, maxHP: 715, profBonus: 8, ac: 19, minDmg: 249, maxDmg: 266, saveDc: 22, attack_bonus: 13 },
        { cr: "28", minHP: 716, maxHP: 760, profBonus: 8, ac: 19, minDmg: 267, maxDmg: 284, saveDc: 22, attack_bonus: 13 },
        { cr: "29", minHP: 761, maxHP: 805, profBonus: 9, ac: 19, minDmg: 285, maxDmg: 302, saveDc: 22, attack_bonus: 13 },
        { cr: "30", minHP: 806, maxHP: 850, profBonus: 9, ac: 19, minDmg: 303, maxDmg: 320, saveDc: 23, attack_bonus: 14 },
    ]

    return {
        calculateCR: calculateCR
    }

}();