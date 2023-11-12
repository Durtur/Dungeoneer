# Dungeoneer 

<img src="https://raw.githubusercontent.com/Durtur/Dungeoneer/master/app/css/img/icon.png" data-canonical-src="https://raw.githubusercontent.com/Durtur/Dungeoneer/master/app/css/img/icon.png" width="100" /> <a href="https://www.buymeacoffee.com/durtur" target="_blank" style="width 4em; height:2em;"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-red.png" alt="Buy Me A Coffee" width="217" height="60"></a>


## Demo video
[![IMAGE ALT TEXT](http://img.youtube.com/vi/wBNgcsm-fnI/0.jpg)](http://www.youtube.com/watch?v=wBNgcsm-fnI "Demo")

[Download Dungeoneer](https://github.com/Durtur/Dungeoneer/releases/latest)

## What is it?
This tool is meant to make the DM's job easier and help you run your games effectively. It handles database managment and lookup for
homebrew and freely licensed SRD monsters and spells, and has a few standard tools.
* Multiplayer Virtual Tabletop
    * Join games on any desktop or android mobile browser
    * Powerful access control
* Encounter creator
    * Create level appropriate encounters easily
* Initiative tracker.
* Stat tracker for monsters.
    * Real time encounter difficulty
    * Roll saves and attacks
    * Condition tracker             
* Random tables to randomize things.
     * Pregenerated, and create your own!
* Level appropriate encounter generator.
     * From your own tables
     * ... or creature type
     * ... or environment
* An integrated map tool with fog of war.
    * Dungeondraft wall import
    * Tokens and stuff
    * Mass token importer
    * Some effects
* Generator thingy
    * Generate taverns with a menu, some optional plot hooks
    * Generate an NPC on the fly
    * Magic item shops
* A loot generator.

## What is it not?
 * A place to keep your notes
 * A map making application


## I don't have any monster tokens
There are some great sources of tokens, such as [Forgotten Adventures](https://www.forgotten-adventures.net/) (you can get all their tokens for free). You can use the token importer to mass import tokens. 

## Operating system / Linux support
Dungeoneer is built for windows as of now but a Mac build is included in the releases. If you are on Linux you will have to build it yourself, due to the sharpjs image library. You need to add the npm package on a Linux machine for it to run correctly. 
* Check out the code
* yarn remove sharp
* yarn add sharp
* yarn install
* yarn start

You can then run the build command, **npm run buildlinux**


## Licence and usage
Anyone is free to use this application. See further constraints in [Licence.md](https://github.com/Durtur/Dungeoneer/blob/master/LICENSE.md). 

## Contributing
Pull requests are welcome!

To get started you need to install nodejs, npm and yarn. Clone the project and run yarn install && yarn start. 

See [contributing.md](https://github.com/Durtur/Dungeoneer/blob/master/CONTRIBUTING.md) for more information.
