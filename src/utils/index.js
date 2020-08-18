import _ from "lodash";

export function rename(filename) {
  if (filename.indexOf(".") !== -1) {
    // strips extension and adds "mp3"
    filename = filename.split(".").slice(0, -1).concat("mp3").join(".");
    // replaces white spaces with underscore
    filename = _.join(_.split(filename, " "), "_");
  }
  return filename;
}
