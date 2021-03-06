import React, { useState } from "react";
import PropTypes from "prop-types";
import _ from "lodash";
import "./index.scss";

const TagForm = ({
  origName,
  onSaveTags,
  onTagChange,
  onImageReadyForEncoding,
  onImageReadyForDisplay,
  onCopyPreviousTags,
  imgSrc,
  isComplete,
  mp3Name,
  tags,
  isCopyButtonVisible,
}) => {
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
    onSaveTags(tags);
  };

  async function handleImageFileSelected(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Read as array buffer for ffmpeg.
    const reader = new FileReader();
    reader.onload = function () {
      const arraybuffer = this.result;
      onImageReadyForEncoding(arraybuffer, file);
    };
    reader.onerror = function (e) {
      console.log("Error, could not read image file ", e);
    };
    reader.readAsArrayBuffer(file);

    // Read as data url for display.
    const img_reader = new FileReader();
    img_reader.onload = function () {
      onImageReadyForDisplay(img_reader.result);
    };
    img_reader.readAsDataURL(file);
  }

  return (
    <div className="tag-form">
      <div className="tags-input">
        <label className="tag-input-label">{origName}</label>
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
        <div className="image-area">
          {imgSrc && <img src={imgSrc} alt="album art" />}
        </div>
        <label htmlFor="image-file-input">Select Image</label>
        <input
          id="image-file-input"
          type="file"
          accept=".gif,.png,.jpg"
          onChange={handleImageFileSelected}
        />
      </div>
      <div className="button-area">
        {isCopyButtonVisible && (
          <button className="copy-previous-button" onClick={onCopyPreviousTags}>
            Copy Previous Metadata
          </button>
        )}
        <button
          disabled={!isComplete}
          className="save-button"
          onClick={handleSave}
        >
          Save {mp3Name}
          {isComplete ? null : " (still processing...)"}
        </button>
      </div>
    </div>
  );
};

TagForm.propTypes = {
  isCopyButtonVisible: PropTypes.bool.isRequired,
  origName: PropTypes.string.isRequired,
  onSaveTags: PropTypes.func.isRequired,
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
