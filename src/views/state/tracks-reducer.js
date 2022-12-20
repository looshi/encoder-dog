import _ from "lodash";

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

export function tracksReducer(state, action) {
  switch (action.type) {
    case "FILE_SELECTED":
      // eslint-disable-next-line no-case-declarations
      const item = {
        imageFileName: null,
        img: null,
        isComplete: false,
        isError: false,
        isProgress: false,
        origName: action.payload.origName,
        progressRatio: null,
        tags: initialTags,
      };
      return [...state, item];
    case "TRANSCODE_STARTED":
      return _.map(state, (s) => {
        if (s.origName === action.payload.origName) {
          return {
            ...s,
            isProgress: true,
            isComplete: false,
            isError: false,
          };
        }
        return s;
      });
    case "TRANSCODE_COMPLETED":
      return _.map(state, (s) => {
        if (s.origName === action.payload.origName) {
          return {
            ...s,
            isProgress: false,
            isComplete: true,
            isError: false,
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
            isProgress: false,
            isComplete: false,
            isError: true,
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
