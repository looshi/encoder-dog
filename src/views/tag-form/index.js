import React, { useState } from "react";
import _ from "lodash";
import "./index.scss";

const TagForm = ({ onSaveTags }) => {
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
      <button onClick={handleSave}>Save</button>
    </div>
  );
};
export default TagForm;
