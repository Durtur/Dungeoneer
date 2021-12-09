const Quill = require('quill');
const util = require("./util");

const EDITOR_TOOLBAR = [
    ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
    ['blockquote', 'code-block'],


    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    [{ 'script': 'sub' }, { 'script': 'super' }],      // superscript/subscript
    [{ 'indent': '-1' }, { 'indent': '+1' }],          // outdent/indent
    [{ 'direction': 'rtl' }],                         // text direction

    [{ 'size': ['small', false, 'large', 'huge'] }],  // custom dropdown
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],

    [{ 'color': [] }],          // dropdown with defaults from theme
    [{ 'font': [] }],
    ['image'],
    [{ 'align': [] }],

    ['clean']                                         // remove formatting button
];

class NotePad {
    constructor(data, readonly, editFn, transparent = false) {

        this.cont = util.ele("div", "");
        this.readonly = readonly;
        this.data = data;
        this.parent = util.wrapper("div", "column notepad_container", this.cont);
        if(transparent){
            this.parent.classList.add("white_on_hover");
        }else{
            this.parent.style.backgroundColor = "white";
        }

        var cls = this;
        if (editFn && readonly) {
            this.cont.addEventListener("dblclick", (e) => {
                editFn(e);
            })
        }

    }

    getContents() {
        return this.editor.getContents();
    }

    container() {
        return this.parent;
    }

    ///Cal after the container has been added to the DOM
    render(focusOnRender) {
        if (!this.editor) {
            this.editor = this.createEditor(this.cont, this.readonly);
            if (focusOnRender)
                this.editor.focus();
        }


    }

    createEditor(el, readonly) {

        var options = {
            modules: {
                toolbar: readonly ? null : EDITOR_TOOLBAR,
                // mention: {
                //     mentionDenotationChars: mentionChars,
                //     source: async function (searchTerm, renderList, char) {

                //         const matchedPeople =
                //             await suggestions.suggest(searchTerm, char);
                //         renderList(matchedPeople);
                //     },
                //     onSelect: async function (item, insertItem) {

                //         if (suggestions.isCreateNewSuggestion(item)) {

                //             var suggestion = suggestions.getCreateNewSuggestion(item);
                //             dataAccess.saveLoreEntry({ title: suggestion.name }, WORLD_PATH, (newId) => {

                //                 item.value = suggestion.name;
                //                 item.id = newId;
                //                 insertItem(item);
                //             }, suggestion.groupId)

                //         } else {
                //             insertItem(item);
                //         }

                //     }
                // }
            },
            readOnly: readonly,
            theme: 'snow'
        }
        this.editor = new Quill(el, options);
        if (this.data) {
            this.editor.setContents(this.data);
        }
        return this.editor;
    }
}

module.exports = NotePad;