const { execFile } = require("child_process");
const { writeFile, readFile, readdir, mkdir } = require("fs").promises;
const fs = require("fs");
const path = require("path");
const PathConstants = require("./pathConstants");

const exePath = __dirname;
class Util {
    static runExe(relativePath, callback) {
        execFile(path.join(exePath, relativePath), null, function (err, data) {
            console.log(err);
            console.log(data.toString());
        });
    }

    static async initDirectory(path) {
        try {
            return await readdir(path);
        } catch (err) {
            return await mkdir(path);
        }
    }

    static async getFiles(dir) {
        const dirents = await readdir(dir, { withFileTypes: true });
        const files = await Promise.all(
            dirents.map((dirent) => {
                const res = pathModule.resolve(dir, dirent.name);
                return dirent.isDirectory() ? getFiles(res) : res;
            })
        );
        return Array.prototype.concat(...files);
    }

    static readJsonfile(path, fallbackValue = {}) {
        try {
            var file = fs.readFileSync(path);
            return JSON.parse(file);
        } catch (e) {
            console.log(e);
            return fallbackValue;
        }
    }

    static copyFile(existingPath, newPath) {
        fs.createReadStream(existingPath).pipe(fs.createWriteStream(newPath));
    }

    static async writeJsonFile(path, data) {
        await writeFile(path, JSON.stringify(data));
    }

    static async writeTempFile(fileName, dataBuffer) {
        var tempFilePath = PathConstants.tempFilePath();
        if (!fs.existsSync(tempFilePath)) fs.mkdirSync(tempFilePath);
        var filePath = path.join(tempFilePath, fileName);
        await writeFile(filePath, dataBuffer);
        filePath = filePath.replaceAll("\\", "/");
        return filePath;
    }

    static async fileToBase64(fPath) {
        return await readFile(fPath, { encoding: "base64" });
    }
}

module.exports = Util;
