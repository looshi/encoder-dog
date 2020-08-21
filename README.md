# encoder-dog

encodes audio files

## build issue:

After `npm run build` ( right now )
find this char: ſ
and give it quotes to be a valid json string.
e.g. change `ſ: value` to `"ſ": value`

also,
to run on some hosts, remove the "/" root path for css and js bundle in
index.html.
