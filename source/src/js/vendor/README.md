# Vendored, not fetched

Both muxers are copied into the repository rather than loaded from a CDN,
for the same reason everything else here is: the site has to work from a
folder of files with no network, and it makes no third-party requests.

| file | package | version | licence |
|---|---|---|---|
| `mp4-muxer.js` | [mp4-muxer](https://www.npmjs.com/package/mp4-muxer) | 5.2.2 | MIT, © 2023 Vanilagy |
| `webm-muxer.js` | [webm-muxer](https://www.npmjs.com/package/webm-muxer) | 5.1.4 | MIT, © 2023 Vanilagy |

Both are the UMD builds exactly as published (`npm pack`, untouched), so
they can be diffed against the registry. They expose `Mp4Muxer` and
`WebMMuxer` as globals.

Licence text: `LICENSE-muxers.txt`.

## What they are for

`VideoEncoder` produces encoded chunks; something has to write them into a
container. These do that and nothing else — no encoding, no decoding, no
network. They are what lets the Studio write a file whose duration is the
duration the reel was built for rather than however long encoding took.
