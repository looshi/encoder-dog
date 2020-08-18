import React, { useState, useReducer } from "react";
import "./index.scss";
import _ from "lodash";
import { createFFmpeg } from "@ffmpeg/ffmpeg";
import { rename } from "../utils";
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
            fileName: action.payload.fileName,
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

  async function convert(arraybuffer, file) {
    let fileName = rename(file.name);

    const convert = {
      origName: file.name,
      fileName,
      progress: true,
      completed: false,
      error: false,
      url: null,
    };
    dispatch({ type: "STARTED", payload: convert });

    await ffmpeg.load();
    await ffmpeg.write("input.wav", arraybuffer);
    const t = await ffmpeg.transcode("input.wav", fileName);

    const data = ffmpeg.read(fileName);
    const url = URL.createObjectURL(
      new Blob([data.buffer], { type: "audio/mpeg" })
    );

    dispatch({ type: "COMPLETED", payload: { ...convert, url } });
  }

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function () {
      convert(this.result, file);
    };
    reader.onerror = function (e) {
      console.log("Error, could not read file ", e);
    };
    reader.onprogress = function (event) {
      console.log(`Loading ${file.name}... `, event.loaded, event);
    };
    reader.readAsArrayBuffer(file);
  }

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
            onChange={handleFileChange}
            disabled={isFileProcessing}
          />

          <ul>
            {_.map(converted, (c) => {
              return (
                <li key={c.fileName}>
                  <div>{c.origName}</div>
                  {c.error && <div>Error</div>}
                  {c.progress && <div>Converting...</div>}
                  {c.completed && (
                    <a href={c.url} download={c.fileName}>
                      Download {c.fileName}
                    </a>
                  )}
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
