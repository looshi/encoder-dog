# Encoder Dog

React app that converts audio files to mp3 using ffmpeg wasm.  Allows the user to add mp3 metadata like artist, track number, and album art.

View Running Project: https://looshi.github.io/encoder-dog/

![Screenshot of project](https://raw.githubusercontent.com/looshi/encoder-dog/master/encoder-dog-screenshot.png)


### Install
```sh
git clone git@github.com:looshi/encoder-dog.git
cd encoder-dog
npm i
```

### Run Locally
```sh
npm run start
```

### Build
```sh
npm run build
# This will run webpack build and create a bundle in the "dist" folder
# This will also try to copy the built files to my local github pages repo
# Tweak that part of build to your own needs
```

### SharedArrayBuffer

In order for SharedArrayBuffer to work, specific headers need to be set: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer#security_requirements

This app will be hosted on github pages, in order to get the headers set correctly on github pages this approach is used ( in /src/static/enable-threads.js ):

https://github.com/gzuidhof/coi-serviceworker

### Resources
ffmpeg: https://ffmpeg.org

wasm: https://webassembly.org

ffmpegwasm: https://ffmpegwasm.netlify.app
