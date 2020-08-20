import React, { useState } from "react";
import _ from "lodash";
import "./index.scss";

const TagForm = ({
  onSaveTags,
  onImageReadyForEncoding,
  onImageReadyForDisplay,
}) => {
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

  const [tags, setTags] = useState(initialTags);

  const handleTagChange = (key) => (event) => {
    const updated = _.map(tags, (t) => {
      if (t.key === key) {
        return { ...t, value: event.target.value };
      }
      return t;
    });
    setTags(updated);
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
      {_.map(tags, (t) => {
        return (
          <label className="tag-input-label" key={t.label}>
            {t.label}
            <input type="text" onChange={handleTagChange(t.key)} />
          </label>
        );
      })}
      <input
        id="image-file-input"
        type="file"
        accept=".gif,.png,.jpg"
        onChange={handleImageFileSelected}
      />
      <button onClick={handleSave}>Save</button>
    </div>
  );
};
export default TagForm;
