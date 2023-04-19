const pathModule = require("path");
const sharp = require("sharp");
const TOKEN_FORMAT = "webp";
const baseTokenSize = 280;

class TokenPersister {
    static async getTokenPath(creatureId) {
        var fileEndings = [".webp", ".png", ".jpg", ".gif"];
        for (var i = 0; i < fileEndings.length; i++) {
            fileEnding = fileEndings[i];
            var path = pathModule.join(defaultTokenPath, creatureId + fileEnding);
            if (fs.existsSync(path)) return path;
        }
        return null;
    }
    static getNewTokenSavePath(currentPath, tokenId) {
        var fileEnding = currentPath.substring(currentPath.lastIndexOf("."));
        return pathModule.join(defaultTokenPath, tokenId + fileEnding);
    }

    static async saveToken(tokenId, currentPath, trim) {
        console.log("Saving token", tokenId, "trim:" + trim);
        var savePath = this.getNewTokenSavePath;
        currentPath, tokenId;
        savePath = pathModule.join(defaultTokenPath, tokenId + ".webp");
        let buffer = await sharp(currentPath)
            .resize({
                width: baseTokenSize,
            })
            .toFormat(TOKEN_FORMAT)
            .toBuffer();
        if (trim) await sharp(buffer).trim(0.5).toFile(pathModule.resolve(savePath));
        else await sharp(buffer).toFile(pathModule.resolve(savePath));
    }
}

module.exports = TokenPersister;