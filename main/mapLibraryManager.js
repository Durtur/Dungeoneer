const sharp = require("sharp");
const Util = require("./util");
const Settings = require("./settings");
const PathConstants = require("./pathConstants");
const pathModule = require("path");
const maptoolLibraryFolder = PathConstants.maptoolLibraryFolder();
class MapLibraryManager {
    static async getMapLibraryThumbNailPath(libName) {
        var destinationFolder = pathModule.join(maptoolLibraryFolder, libName);
        var thumbnailFolder = pathModule.join(destinationFolder, "thumbnails");
        await Util.initDirectory(destinationFolder);
        await Util.initDirectory(thumbnailFolder);
        return thumbnailFolder;
    }

    static async createLibraryFolder(libraryName, folderPath, callback, thumbnailSize) {
        var settings = await Settings.globalSettingsAsync();
        await Util.initDirectory(maptoolLibraryFolder);
        console.log(`Creating library ${libraryName}`);
        var files = await Util.getFiles(folderPath);

        var destinationFolder = pathModule.join(maptoolLibraryFolder, libraryName);
        var thumbnailFolder = await getMapLibraryThumbNailPath(libraryName);
        var data = await Util.readJsonfile(pathModule.join(destinationFolder, "library_data.json"), null);
        if (!data) {
            data = {
                paths: [],
                name: libraryName,
                pinned: [],
                rootFolder: folderPath,
            };
        }
        var newFiles = files.filter((x) => !data.paths.find((y) => pathModule.basename(x) == pathModule.basename(y)));
        var deletedFiles = data.paths.filter((x) => !files.find((y) => pathModule.basename(x) == pathModule.basename(y)));

        deletedFiles.forEach((x) => {
            var thumbnailPath = pathModule.join(thumbnailFolder, `${pathModule.basename(x)}.png`);
            fs.unlink(thumbnailPath, (err) => {
                if (err) console.error(err);
            });
        });

        var dungeoneerMaps = newFiles.filter((x) => [".dd2vtt", ".dungeoneer_map"].includes(pathModule.extname(x)));
        var images = newFiles.filter((x) => settings.imageFilters.includes(pathModule.extname(x).replace(".", "")));
        var libraryList = [...images, ...dungeoneerMaps];
        data.paths = data.paths.filter((x) => !deletedFiles.includes(x));
        data.paths = [...data.paths, ...libraryList];
        var workCount = dungeoneerMaps.length + images.length;
        var processedImages = 0;
        console.log("New files:");
        console.log([...images, ...dungeoneerMaps]);

        images.forEach(async (img) => {
            await sharp(img)
                .resize(await this.getMosaicDimensions(img, thumbnailSize))
                .png()
                .toFile(pathModule.join(thumbnailFolder, `${pathModule.basename(img)}.png`));

            processedImages++;
            if (processedImages == workCount) callback();
        });

        dungeoneerMaps.forEach(async (path) => {
            console.log(path);
            var data = await Util.readJsonfile(path);
            var buffer = pathModule.extname(path) == ".dungeoneer_map" ? Buffer.from(data.foregroundBase64, "base64") : Buffer.from(data.image, "base64");
            var dimensions = await this.getMosaicDimensions(buffer, thumbnailSize);
            await sharp(buffer)
                .resize(dimensions)
                .png()
                .toFile(pathModule.join(thumbnailFolder, `${pathModule.basename(path)}.png`));

            processedImages++;
            if (processedImages == workCount) callback();
        });
        await Util.writeJsonFile(pathModule.join(destinationFolder, "library_data.json"), data);
        if (workCount == 0) callback();
    }

    static async saveLibraryState(libraryObject) {
        var destinationFolder = pathModule.join(maptoolLibraryFolder, libraryObject.name);
        await Util.writeJsonFile(pathModule.join(destinationFolder, "library_data.json"), libraryObject);
    }

    static async getMosaicDimensions(img, thumbnailSize) {
        var metaData = await sharp(img).metadata();

        return {
            height: getHeight(),
            width: getWidth(),
        };

        function getWidth() {
            var returnValue = (metaData.width / metaData.height) * thumbnailSize;
            returnValue -= returnValue % thumbnailSize;
            return returnValue == 0 ? thumbnailSize : returnValue;
        }
        function getHeight() {
            var returnValue = (metaData.height / metaData.width) * thumbnailSize;
            returnValue -= returnValue % thumbnailSize;
            return returnValue == 0 ? thumbnailSize : returnValue;
        }
    }
}

module.exports = MapLibraryManager;
