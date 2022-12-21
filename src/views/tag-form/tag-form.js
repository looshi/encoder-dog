import React from "react";
import { useDropzone } from "react-dropzone";
import PropTypes from "prop-types";
import _ from "lodash";
import "./styles.scss";
import { renameExtensionToMp3 } from "../../utils";

export const TagForm = ({
  canDownload,
  isCopyButtonVisible,
  onCopyPreviousTags,
  onDownload,
  onImageReadyForEncoding,
  onImageReadyForDisplay,
  onTagChange,
  track,
}) => {
  const {
    imageFileName,
    img,
    isComplete,
    isError,
    isProgress,
    progressRatio,
    tags,
    origName,
  } = track;

  const { getRootProps, isFocused, isDragAccept, isDragReject } = useDropzone({
    onDrop: handleImageFileSelected,
    accept: { "image/*": [] },
  });
  const dropZoneStyle = {
    ...(isFocused ? { borderColor: "#fff" } : {}),
    ...(isDragAccept
      ? { borderColor: "#fff", backgroundColor: "#24292c" }
      : {}),
    ...(isDragReject ? { borderColor: "red" } : {}),
  };

  const handleTagChange = (key) => (event) => {
    const updatedTags = _.map(tags, (t) => {
      if (t.key === key) {
        return { ...t, value: event.target.value };
      }
      return t;
    });
    onTagChange(updatedTags);
  };

  const handleSave = () => {
    onDownload(tags, imageFileName);
  };

  async function handleImageFileSelected(files) {
    const file = files[0];
    if (!file) alert("File type not recognized");

    onImageReadyForEncoding(file);

    // Read as data url for display.
    const img_reader = new FileReader();
    img_reader.onload = function () {
      onImageReadyForDisplay(img_reader.result);
    };
    img_reader.readAsDataURL(file);
  }

  const buttonProgressStyle = {
    width: `${progressRatio ?? 0}%`,
    opacity: progressRatio < 100 ? 1 : 0,
  };

  return (
    <details open>
      <summary>{origName}</summary>
      <div className="tag-form">
        <div className="tags-input">
          <div style={{ textAlign: "right" }}>
            {isCopyButtonVisible && (
              <button
                className="copy-previous-button"
                onClick={onCopyPreviousTags}
              >
                Copy Previous Metadata
              </button>
            )}
          </div>
          {_.map(tags, (t) => {
            return (
              <label className="tag-input-label" key={t.label}>
                {t.label}
                <input
                  type="text"
                  onChange={handleTagChange(t.key)}
                  value={t.value || ""}
                />
              </label>
            );
          })}
        </div>
        <div className="image-input">
          <div
            className="image-dropzone"
            {...getRootProps({ style: dropZoneStyle })}
          >
            {img ? (
              <img src={img} alt="album art" />
            ) : (
              <p>Drag and drop image file, or click to select</p>
            )}
          </div>
        </div>
      </div>
      <div className="button-area">
        <div className="download-button-container">
          <div>
            <button
              disabled={isProgress || !canDownload}
              className="save-button"
              onClick={handleSave}
            >
              Save and Download {renameExtensionToMp3(origName)}
            </button>
            {progressRatio ? (
              <div
                className="download-button-progress"
                style={{ ...buttonProgressStyle }}
              ></div>
            ) : (
              <div style={{ height: 1 }}></div>
            )}
          </div>
          {isError ? (
            <div style={{ marginLeft: 8, color: "yellow" }}>
              {" "}
              &#9888; Sorry, an error occurred while encoding.
            </div>
          ) : null}
          {isProgress ? (
            <div style={{ marginLeft: 8 }}> Encoding {progressRatio ?? 0}%</div>
          ) : null}
          {isComplete ? (
            <div style={{ marginLeft: 8 }}> Encoding Complete &#10004;</div>
          ) : null}
          {!canDownload && !isProgress ? (
            <div style={{ marginLeft: 8 }}>
              {" "}
              Wait for 1 track to complete...
            </div>
          ) : null}
        </div>
      </div>
    </details>
  );
};

TagForm.propTypes = {
  canDownload: PropTypes.bool.isRequired,
  isCopyButtonVisible: PropTypes.bool.isRequired,
  onCopyPreviousTags: PropTypes.func.isRequired,
  onDownload: PropTypes.func.isRequired,
  onImageReadyForDisplay: PropTypes.func.isRequired,
  onImageReadyForEncoding: PropTypes.func.isRequired,
  onTagChange: PropTypes.func.isRequired,
  track: PropTypes.shape({
    imageFileName: PropTypes.string,
    img: PropTypes.string,
    isComplete: PropTypes.bool.isRequired,
    isError: PropTypes.bool.isRequired,
    isProgress: PropTypes.bool.isRequired,
    origName: PropTypes.string.isRequired,
    progressRatio: PropTypes.number,
    tags: PropTypes.array,
  }),
};
