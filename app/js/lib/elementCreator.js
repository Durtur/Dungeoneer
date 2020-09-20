

class ElementCreator{

    static createDeletableParagraph(text){
        var para = document.createElement("para");
        para.innerHTML = text;
        para.addEventListener("click", function(e){
            e.target.parentNode.removeChild(e.target);
        });
        para.classList = "deletable_paragraph";
        return para;
    }

}

module.exports = ElementCreator;