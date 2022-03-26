const util = require("./js/util");
const clientPath = "https://www.ogreforge.me/Dungeoneer"
var connectionObj =
{
    secure: true,
    host: 'dungeoneer-peer-server.herokuapp.com', 
    port: 443
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("init_server_button").onclick = () => initServer();
    document.getElementById("server_id").onclick = (e) => {
        navigator.clipboard.writeText(e.target.value).then(function () {
            util.showMessage("Host ID copied to clipboard");
        }, function (err) {
            console.error('Async: Could not copy text: ', err);
        });
    };

    document.getElementById("invite_link_button").onclick = (e) => {
        var text = `${clientPath}?hostID=${document.getElementById("server_id").value}`
        navigator.clipboard.writeText(text).then(function () {
            util.showMessage("Invite link copied to clipboard");
        }, function (err) {
            console.error('Async: Could not copy text: ', err);
        });
    };

});

function initServer() {
    showLoading("Contacting P2P server");
    var peer = new Peer(connectionObj);
    peer.on('open', function (id) {

        document.getElementById("server_id").value = id;
        document.getElementById("server_info_container").classList.remove("hidden");
        document.getElementById("init_server_button").classList.add("hidden");
        document.getElementById("status_text").innerHTML = "Server running";
        hideLoading();
    });

    peer.on('disconnected', function() { 
        console.log("Peer disconnected")
        peer.reconnect();
     });
    peer.on('error', function (err) {
        hideLoading();
        document.getElementById("error_message").innerHTML = err;
        document.getElementById("init_server_button").innerHTML = "Retry";
    });

    peer.on('connection', function (conn) {
        console.log("Peer connected");
        console.log(conn);
        conn.on('data', function (data) {
            handleDataEvent(data, conn);
            console.log('Received', data);
        });

    });
}

function handleDataEvent(data, connection) {
    if(data.messageType == "init"){
        
    }
    var peer = peers.find(x => x.connectonId == connection.id);
}

function hideLoading() {
    document.getElementById("loading").classList.add("hidden");;
}
function showLoading(text) {
    var loadingEle = document.getElementById("loading");
    document.getElementById("loading_text").innerHTML = text;
    loadingEle.classList.remove("hidden");
}


