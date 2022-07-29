

var videoContainer, buttonContainer;
document.addEventListener("DOMContentLoaded", function (e) {
    videoContainer = document.querySelector(".video_cont");
    buttonContainer = document.querySelector(".button_cont");
  
    document.querySelector("#choose_file").onclick = function (e) {
        var imgPath = window.dialog.showOpenDialogSync(
            {
                properties: ['openFile'],
                message: "Choose picture location",
                filters: [{ name: 'Images and videos', extensions: ['jpg', 'png', 'gif', 'mp4', 'webm', "ogg"] }]
            })[0];
        if (!imgPath) return;
        videoContainer.classList.remove("hidden");
        buttonContainer.classList.add("hidden");
        imgPath = imgPath.replace(/\\/g, "/")
        var fileEnding = imgPath.substring(imgPath.lastIndexOf(".")+1);
        if (['mp4', 'webm', "ogg"].indexOf(fileEnding) >= 0)
            return setVideo(imgPath, fileEnding);
        setBackground(imgPath);
    }

});

function setBackground(path){
    console.log(path)
    videoContainer.style.backgroundImage = "url('"+path+"')";
}

function setVideo(path, fileEnding){
    var sourceEle = document.createElement("source");
    sourceEle.setAttribute("type", "video/"+fileEnding)
    sourceEle.setAttribute("src", path);
    var vid = document.getElementById("video_backdrop");
    vid.appendChild(sourceEle);
    vid.play();
    
}