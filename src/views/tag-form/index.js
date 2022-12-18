import React, { useState } from "react";
import { useDropzone } from 'react-dropzone'
import PropTypes from "prop-types";
import _ from "lodash";
import "./index.scss";
import { renameExtensionToMp3 } from "../../utils";

const TagForm = ({
  origName,
  onDownload,
  onTagChange,
  onImageReadyForEncoding,
  onImageReadyForDisplay,
  onCopyPreviousTags,
  imgSrc,
  imageFileName,
  isComplete,
  isProgress,
  canDownload,
  mp3Name,
  tags,
  isCopyButtonVisible,
}) => {
  const { acceptedFiles, getRootProps, getInputProps, isFocused, isDragAccept, isDragReject } = useDropzone({
    onDrop: handleImageFileSelected,
    accept: { 'image/*': [] },
  });
  ;
  const dropZoneStyle = {
    ...(isFocused ? { borderColor: "#fff" } : {}),
    ...(isDragAccept ? { borderColor: "#fff", backgroundColor: '#24292c' } : {}),
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

  return (
    <details open={!isComplete}>
      <summary>
        {origName}
      </summary>
      <div className="tag-form">
        <div className="tags-input">
          <div style={{ textAlign: "right" }}>
            {isCopyButtonVisible && (
              <button className="copy-previous-button" onClick={onCopyPreviousTags}>
                Copy Previous Metadata
              </button>
            )}
          </div>
          {_.map(tags, (t) => {
            return (
              <label className="tag-input-label" key={t.label}>
                <div class="label-text">{t.label}</div>
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

          <div className="image-dropzone" {...getRootProps({ style: dropZoneStyle })}>
            {imgSrc ? <img src={imgSrc} alt="album art" /> : <p>Drag and drop image file, or click to select</p>}
          </div>

        </div>
      </div>
      <div className="button-area">
        <div style={{ display: "flex", alignItems: "baseline", width: "100%" }}>
          <button
            disabled={isProgress || !canDownload}
            className="save-button"
            onClick={handleSave}
          >
            Download {renameExtensionToMp3(mp3Name)}

          </button>
          {isProgress ? <div style={{ marginLeft: 8 }}> Encoding In Process...</div> : null}
          {!canDownload && !isProgress ? <div style={{ marginLeft: 8 }}> Wait for 1 track to complete...</div> : null}
        </div>
      </div>
    </details>
  );
};

TagForm.propTypes = {
  isCopyButtonVisible: PropTypes.bool.isRequired,
  origName: PropTypes.string.isRequired,
  onDownload: PropTypes.func.isRequired,
  onTagChange: PropTypes.func.isRequired,
  onImageReadyForEncoding: PropTypes.func.isRequired,
  onImageReadyForDisplay: PropTypes.func.isRequired,
  onCopyPreviousTags: PropTypes.func.isRequired,
  imgSrc: PropTypes.string,
  isComplete: PropTypes.bool.isRequired,
  mp3Name: PropTypes.string.isRequired,
  tags: PropTypes.array.isRequired,
};
export default TagForm;
