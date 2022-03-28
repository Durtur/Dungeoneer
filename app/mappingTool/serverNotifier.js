
function notifyServer(eventName, data){
    ipcRenderer.send("maptool-server-event", {event:eventName, data:data});
}