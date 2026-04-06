# Playback — Issue Analysis & Next Steps

## Why Playback Fails on Vizio TV

### Root Cause: No HLS.js

The stream URL is an HLS manifest (`.m3u8`). The player currently sets it directly on a `<video>` element:

```html
<video src="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8" ...>
```

**This only works natively on Safari / WebKit.** Vizio SmartCast runs a Chromium-based browser. Chromium has no native HLS support — it will not attempt to play `.m3u8` files at all. The video element loads, fires no error, and stays blank. There is no fallback in the current code.

The fix is [HLS.js](https://github.com/video-dev/hls.js/), a JavaScript library that parses HLS manifests and feeds segments to the video element via the browser's MediaSource Extensions (MSE) API. MSE is supported on Vizio SmartCast.

---

## Secondary Issues Found

### 1. `_switchEpisode()` sets an image URL as the video source

```js
const bg = this._container.querySelector('.player-bg');
if (bg && ep.thumbnail) bg.src = ep.thumbnail;
```

`.player-bg` is the `<video>` element. Assigning a thumbnail image URL to `video.src` will break the active stream when the user switches episodes.

**Fix:** Remove this line. The video stream is episode-agnostic (same stream URL regardless of episode); the episode metadata displayed in the overlay is what changes.

### 2. Missing Vizio remote key codes

`keycodes.js` does not map media keys that Vizio remotes emit for the play/pause button:

- `MediaPlayPause`
- `XF86PlayPause`
- `MediaPlay` / `MediaPause`

Currently the only way to play/pause is to navigate to the progress bar and press OK. On the TV the play/pause button on the remote will do nothing.

**Fix:** Add these key codes to the `KEYS.OK` (or a new `KEYS.PLAYPAUSE`) entry in `keycodes.js` and handle them in `player.js`.

### 3. `playbackRate` set before `loadedmetadata`

```js
video.playbackRate = DebugConfig.get('playbackSpeed', PLAYBACK_SPEED);
video.play().catch(() => {});
```

Some browsers reset `playbackRate` to `1` when the media element loads. Setting it before the stream is ready may have no effect on certain Chromium builds.

**Fix:** Move the `playbackRate` assignment into the `loadedmetadata` handler.

---

## Next Steps (in priority order)

### Step 1 — Add HLS.js (blocking — nothing works without this)

1. Add HLS.js to `index.html` via CDN before `player.js`:
   ```html
   <script src="https://cdn.jsdelivr.net/npm/hls.js@latest/dist/hls.min.js"></script>
   ```
2. Rewrite `_attachProgressUpdates()` to use HLS.js when native HLS is not supported:
   ```js
   if (Hls.isSupported()) {
     const hls = new Hls();
     hls.loadSource(VIDEO_STREAM_URL);
     hls.attachMedia(video);
     this._hls = hls;
   } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
     // Native HLS (Safari / WebKit)
     video.src = VIDEO_STREAM_URL;
   }
   ```
3. Store `this._hls` on the screen object and call `this._hls?.destroy()` in `destroy()`.

### Step 2 — Fix `_switchEpisode()` video src clobber

Remove the lines that reassign `bg.src` to the episode thumbnail:
```js
// DELETE these lines in _switchEpisode():
const bg = this._container.querySelector('.player-bg');
if (bg && ep.thumbnail) bg.src = ep.thumbnail;
```

### Step 3 — Add Vizio media key codes to `keycodes.js`

```js
PLAYPAUSE: ['MediaPlayPause', 'XF86PlayPause', 'MediaPlay', 'MediaPause'],
```

Handle `PLAYPAUSE` in `_handleKey()` the same way OK is handled on the progress bar (toggle `video.play()` / `video.pause()`).

### Step 4 — Move `playbackRate` into `loadedmetadata`

```js
video.addEventListener('loadedmetadata', () => {
  this._duration = video.duration;
  video.playbackRate = DebugConfig.get('playbackSpeed', PLAYBACK_SPEED); // moved here
  this._updateProgressUI();
});
```

---

## Test Matrix After Fix

| Platform        | HLS path used        | Expected result        |
|-----------------|----------------------|------------------------|
| Vizio SmartCast | HLS.js (MSE)         | Plays                  |
| Chrome/Firefox  | HLS.js (MSE)         | Plays                  |
| Safari (Mac/iOS)| Native HLS           | Plays                  |
| Other WebKit TV | Native HLS           | Plays                  |
