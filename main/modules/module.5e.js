const module5e = {
    thirdParty: false,
    name: "5e",
    requiredFolders: ["generators"],
    dataFiles: [
        {
            name: "Monsters",
            fileName: "monsters.json",
        },
        {
            name: "Homebrew",
            fileName: "homebrew.json",
        },
        {
            name: "Tables",
            fileName: "tables.json",
        },
        {
            name: "Conditions",
            fileName: "conditions.json",
        },
        {
            name: "Items",
            fileName: "items.json",
        },
        {
            name: "Tables & notes",
            fileName: "randomTables.json",
        },
        {
            name: "Spells",
            fileName: "spells.json",
        },
        {
            name: "Encounters",
            fileName: "encounters.json",
        },
        {
            name: "Party",
            fileName: "party.json",
        },
        {
            name: "hooks",
            fileName: "hook.json",
            folder: "generators",
        },
        {
            name: "hooks",
            fileName: "names.json",
            folder: "generators",
        },
        {
            name: "scrolls",
            fileName: "scrolls.json",
            folder: "generators",
        },
    ],
    defaultSettings: {
        playerPlaques: true,
        autoInitiative: true,
        initiativeNoGroup: false,
        countRounds: true,
        maxAutoLoads: "80",
        party_settings: {},
        maptool: {
            defaultMonsterTokenRotate: "0",
            defaultPlayerTokenRotate: "0",
            matchSizeWithFileName: false,
            transparentWindow: false,
            snapToGrid: true,
            enableGrid: true,
            syncToCombatPanel: true,
            addPlayersAutomatically: true,
            colorTokenBases: true,
            applyDarkvisionFilter: true,
            fogOfWarHue: "#000000",
            currentFilter: 0,
            currentMap: "../modules/5e/default_library/forest_road.png",
            gridSettings: {
                showGrid: true,
                cellSize: 35,
            },
            defaultMapSize: null,
        },
        enable: {
            generator: true,
            mapTool: true,
            lootRoller: true,
            diceRoller: true,
            saveRoller: true,
            mobController: false,
        },
        coverImagePath: {
            name: "default.jpg",
            path: "./server/bg.jpg",
        },
    },
};

module.exports = module5e;
