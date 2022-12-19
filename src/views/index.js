import React, { useReducer, useEffect } from "react";
import "./index.scss";
import _ from "lodash";
import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";
import { useDropzone } from "react-dropzone";
import { renameExtensionToMp3, startDownload } from "../utils";
import TagForm from "./tag-form/index.js";

const path = new URL("./ffmpeg-core.js", document.location).href;

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
    case "FILE_SELECTED":
      const item = {
        origName: action.payload.origName,
        fileName: action.payload.fileName,
        progress: false,
        complete: false,
        error: false,
        url: null,
        tags: initialTags,
        imageFileName: null,
      };
      return [...state, item];
    case "TRANSCODE_STARTED":
      return _.map(state, (s) => {
        if (s.origName === action.payload.origName) {
          return {
            ...s,
            progress: true,
            complete: false,
            error: false,
          };
        }
        return s;
      });
    case "TRANSCODE_COMPLETED":
      return _.map(state, (s) => {
        if (s.origName === action.payload.origName) {
          return {
            ...s,
            // origName: action.payload.origName,
            // fileName: action.payload.origName,
            progress: false,
            complete: true,
            error: false,
            // url: action.payload.url,
          };
        }
        return s;
      });
    case "TRANSCODE_PROGRESS":
      // Progress is global due to ffmpeg restriction of 1 track at a time
      // This ratio will be set for all tracks, so to determine progress for current
      // check both state.item.progress and also state.item.progressRatio
      return _.map(state, (s) => {
        return {
          ...s,
          progressRatio: action.payload.progressRatio,
        };
      });
    case "TRANSCODE_ERROR":
      return _.map(state, (s) => {
        if (s.origName === action.payload.origName) {
          return {
            ...s,
            progress: false,
            complete: false,
            error: true,
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
  }
  return state;
}


let ffmpeg;

const IndexView = () => {
  const [converted, dispatch] = useReducer(reducer, []);

  useEffect(() => {
    async function init() {
      ffmpeg = await createFFmpeg({
        corePath: path,
        log: true,
        progress: (params) => {
          const progressRatio = Math.floor(Math.round(params.ratio * 100));
          dispatch({
            type: "TRANSCODE_PROGRESS",
            payload: { progressRatio },
          });
        },
      });
      if (!ffmpeg.isLoaded()) {
        await ffmpeg.load();
      }
    }
    init();
  }, []);

  const { getRootProps, getInputProps, isFocused, isDragAccept, isDragReject } =
    useDropzone({
      onDrop: handleAudioFileSelected,
      accept: {
        "audio/*": [],
      },
    });

  const dropZoneStyle = {
    ...(isFocused ? { borderColor: "#fff" } : {}),
    ...(isDragAccept
      ? { borderColor: "#fff", backgroundColor: "#24292c" }
      : {}),
    ...(isDragReject ? { borderColor: "red" } : {}),
  };

  async function handleAudioFileSelected(files) {
    const file = files[0];
    if (!file) alert("File type not recognized");

    const convert = {
      origName: file.name,
      url: null,
    };
    dispatch({ type: "FILE_SELECTED", payload: convert });
    ffmpeg.FS("writeFile", file.name, await fetchFile(file));
  }

  const onDownload = (inputFileName) => async (tags, imageFileName) => {
    // inputFileName is stored in memory after transcode complete
    // should be able to read / write to the file
    const outputFileName = "output_" + renameExtensionToMp3(inputFileName);
    dispatch({
      type: "TRANSCODE_STARTED",
      payload: { origName: inputFileName },
    });

    const listFiles = await ffmpeg.FS("readdir", "/");

    console.log("Saving: ", inputFileName);
    console.log("Tags: ", tags);
    console.log("All Files: ", listFiles);

    // Add Metadata
    // -metadata title="Track Title" -metadata artist="Eduard Artemyev" ... etc.
    const metadataCommand = _.map(
      _.filter(tags, (t) => t.value),
      (t) => {
        return ["-metadata", `${t.key}=${t.value}`];
      }
    );

    // Add image ( if exists )
    //const imageFileName = `${inputFileName}__image`;
    const hasImage = _.includes(listFiles, imageFileName);
    const imageCommand = [`-i`, imageFileName, "-map", "0", "-map", "1"];

    const bitrateCommand = [
      // constant bitrate of 320k
      "-b:a",
      "320k",
    ];

    const args = [
      `-i`,
      inputFileName,
      hasImage ? imageCommand : null,
      metadataCommand,
      bitrateCommand,
      outputFileName,
    ];

    // One arg per parameter is required for run, thus the spread "..."
    // e.g. ffmpeg.run('-i', 'input', 'output')
    const runArgs = _.compact(_.flattenDeep(args));
    try {
      await ffmpeg.run(...runArgs);
      // write the file to the object url for the download link
      const data = ffmpeg.FS("readFile", "./" + outputFileName);
      const url = URL.createObjectURL(
        new Blob([data.buffer], { type: "audio/mpeg" })
      );

      dispatch({
        type: "TRANSCODE_COMPLETED",
        payload: { origName: inputFileName },
      });

      // remove "output" from the filename
      const outFileName = outputFileName.substring("output_".length);
      startDownload(url, outFileName);
    } catch (e) {
      dispatch({
        type: "TRANSCODE_ERROR",
        payload: { origName: inputFileName },
      });
    }
  };

  const onImageReadyForEncoding = (origName) => async (file) => {
    // Write image file to "disk" with the corresponding audio filename
    // prepended.  e.g. "mysong.wav__image".
    // Later when the user clicks save the image can be looked up by its
    // corresponding audio file's name.

    const imageFileName = `${origName}__image`;
    await ffmpeg.FS("writeFile", imageFileName, await fetchFile(file));
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
      <div className="convert-list">
        {!window.SharedArrayBuffer && (
          <div className="no-converts-message">
            <p>Oops, this browser can not run ffmpeg.</p>{" "}
            <p>Try Chrome Browser.</p>
          </div>
        )}

        {_.isEmpty(converted) && window.SharedArrayBuffer && (
          <div
            className="no-converts-message intro"
            {...getRootProps({ style: dropZoneStyle })}
          >
            <p>Drag and drop files here, or click to select</p>
          </div>
        )}

        <ul>
          {_.map(converted, (c, index) => {
            return (
              <li key={c.origName}>
                <TagForm
                  isCopyButtonVisible={index > 0}
                  tags={c.tags}
                  origName={c.origName}
                  mp3Name={c.origName}
                  onTagChange={onTagChange(c.origName)}
                  onDownload={onDownload(c.origName)}
                  onImageReadyForEncoding={onImageReadyForEncoding(c.origName)}
                  onImageReadyForDisplay={onImageReadyForDisplay(c.origName)}
                  onCopyPreviousTags={onCopyPreviousTags(c.origName)}
                  imgSrc={c.img}
                  imageFileName={c.imageFileName}
                  isComplete={c.complete}
                  isProgress={c.progress}
                  progressRatio={c.progressRatio}
                  isError={c.error}
                  canDownload={!_.some(converted, "progress")}
                />
              </li>
            );
          })}
        </ul>

        {!_.isEmpty(converted) && (
          <div
            className="no-converts-message"
            {...getRootProps({ style: dropZoneStyle })}
          >
            <p>Add another audio file</p>
            <input
              id="file-input"
              type="file"
              accept=".wav,.aiff"
              onChange={handleAudioFileSelected}
              {...getInputProps()}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default IndexView;
