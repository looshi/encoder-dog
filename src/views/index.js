import React, { useState, useReducer } from "react";
import "./index.scss";
import _ from "lodash";
import { createFFmpeg } from "@ffmpeg/ffmpeg";
import { rename } from "../utils";
import TagForm from "./tag-form/index.js";
const ffmpeg = createFFmpeg({
  log: true,
});
const consoleLog = window.console.log;

function reducer(state, action) {
  switch (action.type) {
    case "STARTED":
      const item = {
        origName: action.payload.origName,
        fileName: action.payload.fileName,
        progress: true,
        completed: false,
        error: false,
        url: null,
      };
      return [item, ...state];
    case "COMPLETED":
      return _.map(state, (s) => {
        if (s.origName === action.payload.origName) {
          return {
            origName: action.payload.origName,
            fileName: rename(action.payload.origName),
            progress: false,
            completed: true,
            error: false,
            url: action.payload.url,
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
            completed: false,
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

  async function encodeToMp3(arraybuffer, file) {
    const convert = {
      origName: file.name,
      url: null,
    };
    dispatch({ type: "STARTED", payload: convert });

    const fileName = rename(file.name);
    await ffmpeg.load();
    await ffmpeg.write("input.wav", arraybuffer);
    await ffmpeg.transcode("input.wav", fileName);

    // remove the temp input file
    await ffmpeg.remove("input.wav");

    const data = ffmpeg.read(fileName);
    const url = URL.createObjectURL(
      new Blob([data.buffer], { type: "audio/mpeg" })
    );

    dispatch({ type: "COMPLETED", payload: { ...convert, url } });
  }

  function handleAudioFileSelected(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function () {
      encodeToMp3(this.result, file);
    };
    reader.onerror = function (e) {
      console.log("Error, could not read file ", e);
    };
    reader.onprogress = function (event) {
      console.log(`Loading ${file.name}... `, event.loaded, event);
    };
    reader.readAsArrayBuffer(file);
  }

  const handleSaveTags = (origName) => async (tags) => {
    // filename that is stored in memory after transcode completed
    // should be able to read / write to the file.
    const nameInFFMpegMemory = rename(origName);

    // -metadata title="Track Title" -metadata artist="Eduard Artemyev" ... etc.
    const options = _.map(
      _.filter(tags, (t) => t.value),
      (t) => {
        return `-metadata "${t.key}=${t.value}"`;
      }
    );

    const tempFileName = "temp_" + nameInFFMpegMemory;

    // remove the temp file ( if exists )
    const listFiles = await ffmpeg.ls("/");
    if (_.includes(listFiles, tempFileName)) {
      await ffmpeg.remove(tempFileName);
    }

    const args = [
      "-i",
      nameInFFMpegMemory,
      ...options,
      "-c copy",
      tempFileName,
    ];
    await ffmpeg.run(_.join(args, " "));

    // write the file to the object url for the download link
    const data = ffmpeg.read(tempFileName);
    const url = URL.createObjectURL(
      new Blob([data.buffer], { type: "audio/mpeg" })
    );
    dispatch({ type: "COMPLETED", payload: { origName, url } });
  };

  const isFileProcessing = _.some(converted, (c) => c.progress);

  return (
    <div id="index-view">
      <header>
        <h1>Dog Encoder</h1>
      </header>

      <div className="panel">
        <div className="convert-list">
          {_.isEmpty(converted) && (
            <div className="no-converts-message">
              Select a file to start encoding...
            </div>
          )}

          <input
            id="file-input"
            type="file"
            accept=".wav,.aiff"
            onChange={handleAudioFileSelected}
            disabled={isFileProcessing}
          />

          <ul>
            {_.map(converted, (c) => {
              return (
                <li key={c.origName}>
                  <div>{c.origName}</div>
                  {c.error && <div>Error</div>}
                  {c.progress && <div>Converting...</div>}
                  {c.completed && (
                    <>
                      <a href={c.url} download={c.fileName}>
                        Download {c.fileName}
                      </a>
                    </>
                  )}
                  <TagForm onSaveTags={handleSaveTags(c.origName)} />
                </li>
              );
            })}
          </ul>
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
