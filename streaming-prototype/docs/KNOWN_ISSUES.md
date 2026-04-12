# Known Issues

> Tracked issues and limitations. Not bugs — these are deliberate trade-offs,
> deferred features, or inherent platform constraints.
> Last updated: 2026-04-12

---

## Open Issues

### KI-001 — `gitCommit` in version.json is always the parent commit hash

**Severity:** Low — cosmetic  
**Affects:** Debug panel "Version Info" section, `version.json`

Pre-commit hooks run before the commit hash is generated, so `bump-build-number.sh`
can only capture the hash of the previous commit. The `buildNumber` is the reliable
unique build identifier.

**Workaround:** Use `buildNumber` wherever an exact build identifier is needed.
The commit hash in `version.json` should be treated as "last known commit" not
"this commit."

---

### KI-002 — EPG program schedule is not real-time aware

**Severity:** Low — acceptable for prototype  
**Affects:** `EPGScreen`, `EPGDataModel`

Programs are generated from `Date.now()` at the time `EPGDataModel.init()` runs.
If the EPG screen is left open for an extended period, the "current" program
indicator will drift and no longer reflect actual wall-clock time. There is no
live-clock refresh mechanism.

**Impact:** Affects program tile "Xm left" time display accuracy and the
currently-playing tile highlight after extended EPG dwell.  
**Workaround:** Re-navigate to EPG to re-run `init()` and regenerate schedules.

---

### KI-003 — Continue Watching rail always returns empty

**Severity:** Low — documented, intentional  
**Affects:** `LanderScreen`, `DataStore.getContinueWatching()`

`DataStore.getContinueWatching()` always returns `[]`. The Continue Watching rail
builder (`buildContinueWatchingRail()`) returns `null` and is excluded from rendering.
This is deferred to the Authentication phase of the project.

**Expected resolution:** Authentication phase (future).

---

### KI-004 — EPG More Info overlay CTA is analytics-only

**Severity:** Low — intentional for prototype scope  
**Affects:** `more-info-overlay.js`, `EPGScreen`

The "Watch Now" / "Set Reminder" CTA button inside the More Info overlay fires
`epg_more_info_cta_activated` but does not navigate to any screen. It is a
no-op interaction by design for this build.

**Expected resolution:** Deferred — post-EPG initial delivery.

---

### KI-005 — Non-Live nav tabs show toast only

**Severity:** Low — intentional for prototype scope  
**Affects:** Both `LanderScreen` nav and `EPGScreen` nav

Search, Movies, Shows, and Settings nav tabs are stubbed — selecting them shows
a `"[Tab Name] — coming soon"` toast and returns focus to the current tab.
No navigation occurs.

**Expected resolution:** Deferred to future phases per EPG_INTAKE_V1.md out-of-scope list.

---

### KI-006 — Auth state is always anonymous

**Severity:** Low — documented, intentional  
**Affects:** `SeriesPDPScreen`, any future auth-gated feature

The series PDP always renders in anonymous state — single "Play" action button,
no "Add to My Stuff", no watchlist state. Auth mode radio in the debug panel
exposes the placeholder but other modes are not implemented.

**Expected resolution:** Authentication phase (future).

---

### KI-007 — EPG anchor chip `triggering_channel_id` is always null

**Severity:** Low — incomplete analytics payload  
**Affects:** `epg_genre_anchor_updated` event, `genre-rail.js`

The `setActiveChip(genreId)` call in `channel-grid.js` does not pass the
`channelId` that triggered the anchor update. The `epg_genre_anchor_updated`
payload always has `triggering_channel_id: null`.

**Fix:** Pass `channelId` through the `onGenreVisible` callback from
`channel-grid.js` to `genre-rail.js:setActiveChip()`.  
**Priority:** Low — data is present in other events (`epg_channel_row_focused`).

---

### KI-008 — HLS playback unavailable without a real stream URL

**Severity:** Low — expected prototype behavior  
**Affects:** `PlayerScreen`

The player falls back to a simulated progress timer when `streamUrl` is absent
or `Hls.isSupported()` returns false. No real `.m3u8` streams are bundled with
the prototype data.

**Workaround:** Pass a real `streamUrl` param via `App.navigate('player', { streamUrl: '...' })`.

---

## Resolved Issues (for reference)

| ID | Description | Fixed in |
|----|-------------|---------|
| — | `epg_nav_to_live` fired twice per EPG entry (lander + epg-screen.js) | Stage 7 (build 22) |
| — | `epg_back_to_nav` fired on UP from rail (should only fire on BACK) | Stage 7 (build 22) |
| — | `setFocusedChip(-1)` in BACK handler corrupted `_focusedIndex` | Stage 7 (build 22) |
| — | Overlay DOM leaked into `document.body` on EPG re-mount | Stage 7 (build 22) |
| — | Living tile timers continued running during other screens | v1.5.2 |
| — | Analytics writes caused per-keypress localStorage sync | v1.5.2 |
| — | DataStore catalog lookups were O(n) per call | v1.5.2 |
| — | Hero carousel timer restarted on every held keypress | v1.5.3 |
| — | All lander `focusTile()` calls were O(n) classList scans | v1.5.3 |
| — | HLS / QRCode CDN scripts were render-blocking | v1.5.3 |
