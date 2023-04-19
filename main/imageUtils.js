const MAX_SHARP_WEBP_SIZE = 16383;
const sharp = require("sharp");

class ImageUtils {
    //MAX webp width 16383 x 16383

    static async toBase64(path, svg = false) {
        var resizeWidth = 1200;
        if (path.includes("?")) path = path.substring(0, path.lastIndexOf("?"));
        path = path.replaceAll('"', "");
        try {
            if (svg) {
                return await dataAccess.base64(path);
            }
            var shrp = sharp(path);
            var metadata = await shrp.metadata();
            var width = metadata.width;
            var height = metadata.height;
            if (width > MAX_SHARP_WEBP_SIZE || height > MAX_SHARP_WEBP_SIZE) {
                if (width > height && width > MAX_SHARP_WEBP_SIZE) {
                    shrp = shrp.resize(MAX_SHARP_WEBP_SIZE);
                } else if (height > MAX_SHARP_WEBP_SIZE) {
                    shrp = shrp.resize({ height: MAX_SHARP_WEBP_SIZE });
                } else {
                    shrp = shrp.resize(resizeWidth);
                }
            }

            var buffer = await shrp.toFormat("webp").toBuffer();

            return buffer.toString("base64");
        } catch (err) {
            console.error(err);
            return null;
        }
    }
}

module.exports = ImageUtils;
