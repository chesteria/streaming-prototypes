# Analytics Registry

> Canonical list of every event fired by `Analytics.track()` across the prototype.
> Last updated: 2026-04-12

All events share a common envelope added automatically by `Analytics.track()`:

```json
{
  "event":       "event_name",
  "timestamp":   1234567890123,
  "sessionId":   "sess_abc123",
  "participantId": "P-1234",
  "deviceType":  "desktop | tv | mobile",
  "screen":      "lander | epg | series-pdp | player",
  "config": {
    "appVersion":     "1.6.0",
    "buildNumber":    22,
    "gitCommit":      "abc1234",
    "landerVersion":  "1.4",
    "debugOverrides": {}
  },
  "payload": { ... }
}
```

---

## Session

| Event | Fired from | Trigger | Key payload fields |
|-------|-----------|---------|-------------------|
| `session_start` | `lander.js` | First keypress after lander mounts | `referrer`, `startTime` |
| `session_end` | `app.js` via `App.back()` | BACK pressed when history stack is empty | All fields from `Analytics.getSessionSummary()` |

---

## Lander (`lander.js`)

| Event | Trigger | Key payload fields |
|-------|---------|-------------------|
| `focus_change` | Focus moves between zones (nav→rail, rail→rail) | `from`, `to`, `direction` |
| `rail_engagement` | LEFT/RIGHT within a rail | `railId`, `direction`, `tileIndex`, `maxTileReached`, `totalTiles`, `dwellMs` |
| `tile_select` | OK on a tile | `railId`, `tileIndex`, `itemId`, `itemTitle`, `screen` (destination) |
| `scroll_depth` | Rail scrolled past midpoint; also on lander blur | `railId`, `maxTileReached`, `totalTiles`, `railsVisible` |
| `dead_end` | LEFT/RIGHT at rail boundary | `screen`, `zone`, `index`, `direction`, `note` |
| `navigation` | Tile select that navigates to a new screen | `from`, `to`, `itemId` |
| `epg_nav_to_live` | Live tab selected in nav bar | _(none)_ |

---

## EPG Screen (`epg-screen.js`)

### Screen lifecycle

| Event | Trigger | Key payload fields |
|-------|---------|-------------------|
| `epg_screen_entered` | `EPGScreen.init()` | `entry_source` (`'nav'` \| etc.) |
| `epg_screen_exited` | `EPGScreen.onBlur()` | `dwell_ms`, `exit_destination` |

### Navigation context

| Event | Trigger | Key payload fields |
|-------|---------|-------------------|
| `epg_nav_from_live` | For You tab selected from EPG nav | _(none)_ |
| `epg_back_to_nav` | BACK key pressed from `'rail'` or `'grid'` context | `from_surface` (`'rail'` \| `'grid'`) |

### Grid focus

| Event | Trigger | Key payload fields |
|-------|---------|-------------------|
| `epg_channel_row_focused` | Row gains focus in grid | `channel_id`, `genre_id`, `row_index` |
| `epg_channel_logo_focused` | Logo cell gains focus within a row | `channel_id`, `genre_id` |
| `epg_program_tile_focused` | Tile gains focus (row entry, LEFT, or RIGHT) | `channel_id`, `genre_id`, `program_id`, `tile_offset_from_now` |
| `epg_program_tile_scrubbed` | RIGHT pressed on tile track | `channel_id`, `genre_id`, `new_tile_offset` |
| `epg_row_returned_to_now` | `returnToNow()` called on a row (via BACK in grid) | `channel_id`, `genre_id`, `tiles_scrolled` |

### Genre rail (`genre-rail.js`)

| Event | Trigger | Key payload fields |
|-------|---------|-------------------|
| `epg_genre_chip_focused` | Chip gains focus | `genre_id`, `genre_index` |
| `epg_genre_selected` | OK pressed on a chip | `genre_id` |
| `epg_genre_anchor_updated` | Active anchor chip changes (debounced 50ms) | `genre_id`, `triggering_channel_id` |

### More Info overlay (`more-info-overlay.js`)

| Event | Trigger | Key payload fields |
|-------|---------|-------------------|
| `epg_more_info_opened` | Overlay opens | `channel_id`, `program_id`, `variant` (`'currently_playing'` \| `'future'`) |
| `epg_more_info_closed` | Overlay closes | `channel_id`, `program_id`, `reason` (`'back'` \| `'cta'`) |
| `epg_more_info_cta_activated` | CTA button pressed inside overlay | `channel_id`, `program_id`, `variant` |

---

## Series PDP (`series-pdp.js`)

| Event | Trigger | Key payload fields |
|-------|---------|-------------------|
| `navigation` | Screen enters | `from`, `to`, `itemId` |
| `focus_change` | Focus moves between zones | `from`, `to`, `direction` |
| `feature_interaction` | Season pill selected | `type` (`'season_select'`), `value` (season index) |
| `tile_select` | Episode / extra / similar tile selected | `railId`, `tileIndex`, `itemId`, `itemTitle`, `screen` |
| `dead_end` | Edge press at boundary | `screen`, `zone`, `index`, `direction`, `note` |

---

## Player (`player.js`)

| Event | Trigger | Key payload fields |
|-------|---------|-------------------|
| `navigation` | Screen enters | `from`, `to`, `itemId` |
| `playback_start` | HLS / native playback begins | `streamUrl`, `showId`, `episodeId` |
| `playback_pause` | Playback paused via transport controls | `position_ms`, `duration_ms` |
| `playback_complete` | Playback reaches end | `showId`, `episodeId`, `duration_ms` |
| `playback_scrub` | Scrub bar seek committed | `from_ms`, `to_ms`, `duration_ms` |
| `controls_interaction` | Transport button activated | `action` (`'start_over'`, `'next_episode'`, `'more_info'`, `'captions'`) |
| `dead_end` | Edge press at boundary | `screen`, `zone`, `index`, `direction`, `note` |

---

## Feedback System (`feedback.js`)

| Event | Trigger | Key payload fields |
|-------|---------|-------------------|
| `user_feedback` | Feedback overlay submitted | `reaction`, `tags[]`, `comment`, full app state snapshot |

---

## Event Count Summary

| Screen / System | Event count |
|----------------|------------|
| Session | 2 |
| Lander | 7 |
| EPG | 16 |
| Series PDP | 5 |
| Player | 7 |
| Feedback | 1 |
| **Total** | **38** |

---

## Transport

- **Default:** localStorage rolling buffer — 50 sessions max, 5 MB cap.
- **Optional:** Firebase Realtime Database. Set `FIREBASE_URL` in `analytics.js` and switch `ANALYTICS_TRANSPORT` to `'firebase'` or `'both'`.
- **Reporting:** `reporting.html` reads from localStorage for the session overview, navigation heatmap, rail performance, and feedback feed dashboards.
