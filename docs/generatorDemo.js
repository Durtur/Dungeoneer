

var module = {};

document.addEventListener("DOMContentLoaded", (e) => {
    
    loadGeneratorData();
});

async function loadGeneratorData(){
    
  const response = await fetch("https://raw.githubusercontent.com/Durtur/Dungeoneer/master/data/generators/names.json", {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    }
  });
  console.log(response);
}