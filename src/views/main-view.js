import React, { useReducer, useEffect } from "react";
import "./styles.scss";
import _ from "lodash";
import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";
import { useDropzone } from "react-dropzone";
import { renameExtensionToMp3, startDownload } from "../utils";
import { TagForm } from "./tag-form/tag-form.js";
import { tracksReducer } from "./state/tracks-reducer.js";
const path = new URL("./ffmpeg-core.js", document.location).href;

let ffmpeg;

const MainView = () => {
  const [tracks, dispatch] = useReducer(tracksReducer, []);

  useEffect(() => {
    async function init() {
      ffmpeg = await createFFmpeg({
        corePath: path,
        log: true,
        progress: (params) => {
          const progressRatio = params.duration
            ? 0
            : Math.max(Math.floor(Math.round(params.ratio * 100)), 0);
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
      type: "TRANSCODE_PROGRESS",
      payload: { progressRatio: 0 },
    });
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

  return (
    <div id="index-view">
      <div className="convert-list">
        {!window.SharedArrayBuffer && (
          <div className="oops-message">
            <div class="alert-icon">
              &#9888;
            </div>
            <p>We're sorry, this browser can not run ffmpeg.</p>
            <p>Try Chrome Browser on desktop.</p>
          </div>
        )}

        {_.isEmpty(tracks) && window.SharedArrayBuffer && (
          <div
            className="no-converts-message intro"
            {...getRootProps({ style: dropZoneStyle })}
          >
            <p>Drag and drop files here, or click to select</p>
          </div>
        )}

        <ul>
          {_.map(tracks, (track, index) => {
            return (
              <li key={track.origName}>
                <TagForm
                  isCopyButtonVisible={index > 0}
                  track={track}
                  onTagChange={onTagChange(track.origName)}
                  onDownload={onDownload(track.origName)}
                  onImageReadyForEncoding={onImageReadyForEncoding(
                    track.origName
                  )}
                  onImageReadyForDisplay={onImageReadyForDisplay(
                    track.origName
                  )}
                  onCopyPreviousTags={onCopyPreviousTags(track.origName)}
                  canDownload={!_.some(tracks, "isProgress")}
                />
              </li>
            );
          })}
        </ul>

        {!_.isEmpty(tracks) && (
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

export default MainView;
