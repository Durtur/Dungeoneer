const shell = require('electron').shell;
const remote = require('electron').remote;

const app = remote.app;

var pathModule = require('path');
const resourcePath = pathModule.join(app.getPath("userData"), 'data');
// assuming $ is jQuery
$(document).on('click', 'a[href^="http"]', function (event) {
    event.preventDefault();
    shell.openExternal(this.href);
});


/*Henda þessu siðan */
window.addEventListener('mousedown', (e) => {
    if (e.ctrlKey && e.button == 1)
        remote.getCurrentWindow().inspectElement(e.clientX, e.clientY);

}, false);


window.addEventListener("DOMContentLoaded", ()=>{
    var modal = document.getElementById("myModal");
   
    // Get the image and insert it inside the modal - use its "alt" text as a caption
    var images = document.getElementsByTagName("img");
    var img = document.getElementById("myImg");
    var modalImg = document.getElementById("img01");
    var captionText = document.getElementById("caption");
    [...images].forEach(img => {
        img.onclick = function(){
            modal.style.display = "block";
            modalImg.src = this.src;
            captionText.innerHTML = this.alt;
          }
    });


    
    // Get the <span> element that closes the modal
    var span = document.getElementsByClassName("close")[0];
    
    // When the user clicks on <span> (x), close the modal
    span.onclick = function() { 
      modal.style.display = "none";
    }
    document.addEventListener("keydown",(e)=>{
        if(e.keyCode == 27){
            modal.style.display = "none";
        }
    })
});

function setDrawer(index) {
    var drawers = [...document.getElementsByClassName("drawer_item")];
    drawers.forEach(dr => dr.classList.remove("drawer_out"));

    var sections = [...document.getElementsByClassName("content_section")];
    sections.forEach(sec => sec.classList.add("hidden"));

    drawers[index].classList.add("drawer_out");
    sections[index].classList.remove("hidden")
    $('#main_wrapper').animate({ scrollTop: 0 }, 0);

}

function openDataFolder(){
     shell.openPath(resourcePath);
}