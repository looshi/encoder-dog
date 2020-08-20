import _ from "lodash";

export function renameExtensionToMp3(filename) {
  if (filename.indexOf(".") !== -1) {
    filename = filename.split(".").slice(0, -1).concat("mp3").join(".");
    // replaces white spaces with underscore
    filename = _.join(_.split(filename, " "), "_");
  }
  return filename;
}
