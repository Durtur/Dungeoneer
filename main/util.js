const { execFile } = require("child_process");
const path = require("path");
const exePath = __dirname// path.join(__dirname, "main");
class Util {
  static runExe(relativePath, callback) {
    execFile(path.join(exePath, relativePath), null, function (err, data) {
      console.log(err);
      console.log(data.toString());
    });
  }
}

module.exports = Util;

