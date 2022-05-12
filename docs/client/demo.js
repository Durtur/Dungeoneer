function demo(){
    var pawns =[{
        name:"Spider",
        color:"brown",
        size:"huge",
        bgPhoto:"../docs/client/demo/spider.webp",
        spawnPoint:map.pixelsFromGridCoords(5, 5)
    }];
    creaturePossibleSizes = {
        "hexes": [
            1,
            2,
            3,
           
        ],
        "sizes": [
          
            "medium",
            "large",
            "huge",
      
        ]};
    generatePawns(pawns, true)
}