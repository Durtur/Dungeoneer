
function replaceAll(string, replacementString, replaceArray) {
    while (string.indexOf(replacementString) > -1) {
        string = string.replace(replacementString, replaceArray.pickOne());
    }
    return string;

}


function replacePlaceholders(string, isMale, data) {
    if (!string) return;

    data.replacement_values.forEach(replacement => {
        var replWith = replacement.replace_with;

        if (Array.isArray(replWith)) {
            string = replaceAll(string, replacement.value, replWith);
        } else if (typeof replWith == "string") {
            if (isArrayReference(replWith)) {
                replWith = replWith.substring(6);
                var split = replWith.split(".");
                var replacementValue;
                split.forEach(splitV => { replacementValue = data[splitV] })

                if (replacementValue == null) return;
                string = replaceAll(string, replacement.value, replacementValue);
            }
        } else if (typeof replWith == "object") {

            if (isMale != null && replWith.male && replWith.female) {

                var replacementArr = isMale ? replWith.male : replWith.female;
                if (replacementArr[0] && isArrayReference(replacementArr[0]))
                    replacementArr = data[replacementArr[0].split(".")[1]];
                string = replaceAll(string, replacement.value, replacementArr);
            }
        }
    });
    return string;
    function isArrayReference(string) {
        return string.substring(0, 5) == "$this";
    }
}