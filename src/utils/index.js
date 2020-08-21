import _ from "lodash";

export function renameExtensionToMp3(filename) {
  if (filename.indexOf(".") !== -1) {
    filename = filename
      .split(".")
      .slice(0, -1)
      .concat("mp3")
      .join(".");
    // replaces white spaces with underscore
    filename = _.join(_.split(filename, " "), "_");
  }
  return filename;
}

export function startDownload(data, fileName) {
  const el = document.createElement("a");
  el.setAttribute("href", data);
  el.setAttribute("download", fileName);
  document.body.appendChild(el);
  el.click();
  document.body.removeChild(el);
}
