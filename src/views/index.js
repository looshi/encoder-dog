import React, { useState, useReducer } from "react";
import "./index.scss";
import _ from "lodash";
import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";
import { renameExtensionToMp3, startDownload } from "../utils";
import TagForm from "./tag-form/index.js";

const path = new URL('./ffmpeg-core.js', document.location).href;

const ffmpeg = createFFmpeg({
  corePath: path,
  log: true,
});

const initialize = async () => {
  if (!ffmpeg.isLoaded()) {
    await ffmpeg.load();
  }
}
initialize();

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
        imageFileName: null,
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
            imageFileName: `${action.payload.origName}__image`,
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
          const previous = state[index - 1];
          return {
            ...s,
            tags: [...previous.tags],
            img: previous.img,
            imageFileName: previous.imageFileName,
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


    ffmpeg.FS('writeFile', file.name, await fetchFile(file))

    const outputFileName = `output_${renameExtensionToMp3(file.name)}`;
    await ffmpeg.run('-i', file.name, outputFileName);

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

    encodeToMp3(filename);
  }

  const onDownload = (inputFileName) => async (tags, imageFileName) => {
    // inputFileName is stored in memory after transcode complete
    // should be able to read / write to the file
    const outputFileName = "output_" + renameExtensionToMp3(inputFileName);
    const listFiles = await ffmpeg.FS("readdir", "/");

    console.log("Saving: ", inputFileName);
    console.log("Tags: ", tags);
    console.log('All Files: ', listFiles);

    // Add Metadata
    // -metadata title="Track Title" -metadata artist="Eduard Artemyev" ... etc.
    const metadataCommand = _.map(
      _.filter(tags, (t) => t.value),
      (t) => {
        return ['-metadata', `${t.key}=${t.value}`];
      }
    );
    console.log('dave imageFileName', imageFileName);
    // Add image ( if exists )
    //const imageFileName = `${inputFileName}__image`;
    const hasImage = _.includes(listFiles, imageFileName);
    const imageCommand = [
      `-i`,
      imageFileName,
      '-map',
      '0',
      '-map',
      '1',
    ];

    const bitrateCommand = [
      // constant bitrate of 320k
      '-b:a',
      '320k',
    ]

    const args = [
      `-i`,
      inputFileName,
      hasImage ? imageCommand : null,
      metadataCommand,
      bitrateCommand,
      // "-c copy",  // I don't know why this used to be here, it doesn't work.
      outputFileName,

    ];

    // One arg per parameter is required for run, thus the spread "..."
    // e.g. ffmpeg.run('-i', 'input', 'output')
    const runArgs = _.compact(_.flattenDeep(args));
    await ffmpeg.run(...runArgs);

    // write the file to the object url for the download link
    const data = ffmpeg.FS('readFile', "./" + outputFileName);
    const url = URL.createObjectURL(
      new Blob([data.buffer], { type: "audio/mpeg" })
    );
    dispatch({ type: "COMPLETED", payload: { outputFileName, url } });

    // remove "output" from the filename
    const outFileName = outputFileName.substring("output_".length);
    startDownload(url, outFileName);
  };

  const onImageReadyForEncoding = (origName) => async (file) => {
    // Write image file to "disk" with the corresponding audio filename
    // prepended.  e.g. "mysong.wav__image".
    // Later when the user clicks save the image can be looked up by its
    // corresponding audio file's name.

    const imageFileName = `${origName}__image`;
    await ffmpeg.FS('writeFile', imageFileName, await fetchFile(file));
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
                    onDownload={onDownload(c.origName)}
                    onImageReadyForEncoding={onImageReadyForEncoding(
                      c.origName
                    )}
                    onImageReadyForDisplay={onImageReadyForDisplay(c.origName)}
                    onCopyPreviousTags={onCopyPreviousTags(c.origName)}
                    imgSrc={c.img}
                    imageFileName={c.imageFileName}
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
