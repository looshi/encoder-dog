import React, { useState, useReducer } from "react";
import "./index.scss";
import _ from "lodash";
import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";
import { renameExtensionToMp3, startDownload } from "../utils";
import TagForm from "./tag-form/index.js";

const path = new URL('./ffmpeg-core.js', document.location).href;
console.log('loading ffmpeg from ', path);
const ffmpeg = createFFmpeg({
  corePath: path,

});
const consoleLog = window.console.log;

const initialTags = [
  { label: "Artist", key: "artist" },
  { label: "Album", key: "album" },
  { label: "Year", key: "date" },
  { label: "Genre", key: "genre" },
  { label: "Track Number", key: "track" },
  { label: "Disc Number", key: "disc" },
  { label: "Comments", key: "comment" },
  { label: "Description", key: "description" },
  { label: "Album Artist", key: "album_artist" },
  { label: "Grouping", key: "grouping" },
  { label: "Composer", key: "composer" },
  { label: "Producer", key: "producer" },
];

function reducer(state, action) {
  switch (action.type) {
    case "STARTED":
      const item = {
        origName: action.payload.origName,
        fileName: action.payload.fileName,
        progress: true,
        complete: false,
        error: false,
        url: null,
        tags: initialTags,
      };
      return [...state, item];
    case "COMPLETED":
      return _.map(state, (s) => {
        if (s.origName === action.payload.origName) {
          return {
            ...s,
            origName: action.payload.origName,
            fileName: action.payload.origName,
            progress: false,
            complete: true,
            error: false,
            url: action.payload.url,
          };
        }
        return s;
      });
    case "IMAGE_READY_FOR_DISPLAY":
      return _.map(state, (s) => {
        if (s.origName === action.payload.origName) {
          return {
            ...s,
            img: action.payload.dataUrl,
          };
        }
        return s;
      });
    case "TAG_CHANGED":
      return _.map(state, (s) => {
        if (s.origName === action.payload.origName) {
          return {
            ...s,
            tags: action.payload.tags,
          };
        }
        return s;
      });
    case "COPY_PREVIOUS_TAGS":
      return _.map(state, (s, index) => {
        if (s.origName === action.payload.origName) {
          return {
            ...s,
            tags: [...state[index - 1].tags],
            img: state[index - 1].img,
          };
        }

        return s;
      });
    case "ERROR":
      return _.map(state, (s) => {
        if (s.origName === action.payload.origName) {
          return {
            origName: action.payload.origName,
            fileName: action.payload.fileName,
            progress: false,
            complete: false,
            error: true,
            url: null,
          };
        }
        return s;
      });
      return state;
  }

  return state;
}

const IndexView = () => {
  const [converted, dispatch] = useReducer(reducer, []);
  const [logged, setLogged] = useState([]);

  window.console.log = (msg, ...args) => {
    consoleLog(msg, ...args);
    setLogged([{ msg, timestamp: Date.now() }, ...logged]);
  };

  async function encodeToMp3(file) {
    const convert = {
      origName: file.name,
      url: null,
    };
    dispatch({ type: "STARTED", payload: convert });

    // const fileName = renameExtensionToMp3(file.name);
    await ffmpeg.load();

    // await ffmpeg.write("input.wav", arraybuffer);
    // await ffmpeg.transcode("input.wav", fileName);

    if (!ffmpeg.isLoaded()) {
      await ffmpeg.load();
    }


    ffmpeg.FS('writeFile', file.name, await fetchFile(file))

    // ffmpeg.FS('writeFile', 'input.wav', arraybuffer);
    await ffmpeg.run('-i', file.name, `temp_${file.name}`);
    //await fs.promises.writeFile('./test.mp4', ffmpeg.FS('readFile', 'test.mp4'));


    // remove the temp input file
    // await ffmpeg.remove("input.wav");

    const data = ffmpeg.FS('readFile', file.name);
    const url = URL.createObjectURL(
      new Blob([data.buffer], { type: "audio/mpeg" })
    );

    dispatch({ type: "COMPLETED", payload: { ...convert, url } });
  }

  function handleAudioFileSelected(e) {
    const filename = e.target.files[0];
    if (!filename) return;

    // const reader = new FileReader();
    // reader.onload = function () {
    //   encodeToMp3(this.result, file);
    // };
    // reader.onerror = function (e) {
    //   console.log("Error, could not read file ", e);
    // };
    // reader.readAsArrayBuffer(file);
    encodeToMp3(filename);
  }

  const onSaveTags = (origName) => async (tags) => {
    // filename that is stored in memory after transcode complete
    // should be able to read / write to the file.
    const mp3FileName = origName;

    // -metadata title="Track Title" -metadata artist="Eduard Artemyev" ... etc.
    const options = _.map(
      _.filter(tags, (t) => t.value),
      (t) => {
        return `-metadata "${t.key}=${t.value}"`;
      }
    );

    const tempFileName = "temp_" + mp3FileName;

    // remove the temp file ( if exists )
    //const listFiles = await ffmpeg.run("ls", "/");

    const listFiles = await ffmpeg.FS("readdir", "/");

    console.log('--listFiles', listFiles);

    if (_.includes(listFiles, tempFileName)) {
      await ffmpeg.FS("unlink", tempFileName);
    }



    // Add image ( if exists )
    const imageFileName = `${origName}__image`;
    const hasImage = _.includes(listFiles, imageFileName);

    const args = [
      `-i ${mp3FileName}`,
      hasImage ? `-i ${imageFileName} -map 0:0 -map 1:0` : null,
      ...options,
      "-c copy",
      tempFileName,
    ];
    await ffmpeg.run(_.join(_.compact(args), " "));

    // write the file to the object url for the download link

    const data = ffmpeg.FS('readFile', "./" + tempFileName);
    const url = URL.createObjectURL(
      new Blob([data.buffer], { type: "audio/mpeg" })
    );
    dispatch({ type: "COMPLETED", payload: { origName, url } });

    startDownload(url, mp3FileName);
  };

  const onImageReadyForEncoding = (origName) => async (arraybuffer, file) => {
    // Write image file to "disk" with the corresponding audio filename
    // prepended.  e.g. "mysong.wav__image".
    // Later when the user clicks save the image can be looked up by its
    // corresponding audio file's name.

    const imageFileName = `${origName}__image`;
    // Remove the last image file for this audio ( if exists )
    const listFiles = await ffmpeg.FS("readdir", "/");
    if (_.includes(listFiles, imageFileName)) {
      await ffmpeg.remove(imageFileName);
    }

    await ffmpeg.write(imageFileName, arraybuffer);
  };

  const onTagChange = (origName) => (tags) => {
    dispatch({ type: "TAG_CHANGED", payload: { origName, tags } });
  };

  const onCopyPreviousTags = (origName) => () => {
    dispatch({ type: "COPY_PREVIOUS_TAGS", payload: { origName } });
  };

  const onImageReadyForDisplay = (origName) => (dataUrl) => {
    dispatch({
      type: "IMAGE_READY_FOR_DISPLAY",
      payload: { origName, dataUrl },
    });
  };

  const isFileProcessing = _.some(converted, (c) => c.progress);

  return (
    <div id="index-view">
      <header>
        <h1>Encode files to mp3 and add tags</h1>
        <p><a href="https://github.com/looshi/encoder-dogView">Source on Github</a></p>
      </header>

      <div className="panel">
        <div className="convert-list">
          {_.isEmpty(converted) && (
            <div className="no-converts-message">
              <div>Select a file to start encoding...</div>
              <input
                id="file-input"
                type="file"
                accept=".wav,.aiff"
                onChange={handleAudioFileSelected}
                disabled={isFileProcessing}
              />
            </div>
          )}

          <ul>
            {_.map(converted, (c, index) => {
              return (
                <li key={c.origName}>
                  {c.error && <div>Error</div>}
                  {c.progress && (
                    <div className="converting-message">Converting...</div>
                  )}
                  <TagForm
                    isCopyButtonVisible={index > 0}
                    tags={c.tags}
                    origName={c.origName}
                    mp3Name={c.origName}
                    onTagChange={onTagChange(c.origName)}
                    onSaveTags={onSaveTags(c.origName)}
                    onImageReadyForEncoding={onImageReadyForEncoding(
                      c.origName
                    )}
                    onImageReadyForDisplay={onImageReadyForDisplay(c.origName)}
                    onCopyPreviousTags={onCopyPreviousTags(c.origName)}
                    imgSrc={c.img}
                    isComplete={c.complete}
                  />
                </li>
              );
            })}
          </ul>
          {!_.isEmpty(converted) && !isFileProcessing && (
            <div className="no-converts-message">
              <div>Select another file...</div>
              <input
                id="file-input"
                type="file"
                accept=".wav,.aiff"
                onChange={handleAudioFileSelected}
              />
            </div>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="log-list">
          <ul>
            {_.map(logged, (l) => (
              <li key={l.timestamp}>{l.msg}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default IndexView;
