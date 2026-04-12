# CC-BRIEF.md — EPG (Electronic Program Guide)

> Working doc for Claude Code. Hold this in context during the build. PRD is reference; this is the instruction set.

---

## 1. Build context

EPG is the Live screen of the UTA prototype — a grid of channels grouped by genre, with a horizontal genre rail anchor, an independently-scrolling time grid per row, and a more-info overlay per channel. It lives at `js/screens/epg/` (verify against existing For You folder convention before creating). It connects to the existing top nav (For You ↔ Live wiring is new in this build) and the existing debug.html (which gains EPG configuration controls). The For You lander, the existing event bus, the existing focus/navigation system, and debug.html's existing structure must not be broken. This is a Phase 3, prototype-fidelity build — no real playback, no auth, no persistence.

---

## 2. Build order

1. **Mock data file** — `data/epg-mock.json`: 30+ channels, 8+ genres, hand-authored cheeky/humorous program metadata, IP-free placeholder logos, at least 2 channels appearing in 2+ genres. 24 hours of programs per channel starting from "now."
2. **Data model + loader** — channel/genre/program types; `getChannelsByGenre()`; multi-genre channels referenced by ID, not duplicated.
3. **Tile component** — single component, two render modes (currently-playing: remaining-time string + currently-watching indicator slot; future: scheduled window string). Default + focus states. Static PG rating chip. Analytics wired.
4. **Channel logo cell** — fixed left column, default + focus states, static decorative favorite heart, no interaction. Analytics wired.
5. **Channel row** — logo cell + horizontally scrollable tile track. Per-instance scroll state keyed by `${channelId}:${genreId}`. Independent scroll. Return-to-now CSS transition (~250ms ease-out) on row blur. 24-hour right boundary enforced. No leftward navigation past the currently-playing tile. Analytics wired.
6. **Genre group** — header + N channel rows. Renders the same channel multiple times if it belongs to multiple genres; each instance is its own row state.
7. **Channel grid** — vertical stack of genre groups. Down-arrow flow; up from top row goes to genre rail.
8. **Genre rail** — horizontally scrollable focusable chip rail, wraps right-to-first and left-to-last. Selecting a chip scrolls grid to first channel of that genre. Anchor reaction: when grid focus enters a new genre group, the corresponding chip auto-highlights (debounced ~50ms). Up from rail goes to top nav (lands on Live pill). Analytics wired.
9. **More-info overlay** — overlay layer over dimmed EPG (not a route). Two variants: currently-playing (Watch Live + progress bar + remaining duration) vs. future (Watch Channel + scheduled window). Back/Escape closes. CTAs are no-ops that fire analytics only. Analytics wired.
10. **Screen module** — wires components together, sets initial focus on first row's currently-playing tile, handles screen entry/exit analytics, handles back-button → top nav.
11. **Nav integration** — For You → Live and Live → For You transitions. Top nav "Live" pill active state on EPG screen.
12. **debug.html additions** — genre naming, genre order, channel-to-genre association, channel metadata edit, plus a logical sweep of any other EPG toggles that fit the existing debug pattern.
13. **Final analytics audit** — every interactive element fires its event exactly once.

---

## 3. Component checklist

- [ ] **Program tile (currently-playing mode)** — default | focus | with-watching-indicator
- [ ] **Program tile (future mode)** — default | focus
- [ ] **Channel logo cell** — default | focus (static heart decoration)
- [ ] **Channel row** — default | scrubbed | returning-to-now (animation)
- [ ] **Genre group header** — default (non-focusable, visual grouping only)
- [ ] **Channel grid container** — default
- [ ] **Genre chip** — default | focus | active (anchor-reacted) | selected
- [ ] **Genre rail** — default | scrolled | wrapped
- [ ] **More-info overlay (currently-playing variant)** — default with Watch Live CTA focused
- [ ] **More-info overlay (future variant)** — default with Watch Channel CTA focused
- [ ] **EPG screen container** — default | overlay-open (dimmed)
- [ ] **Top nav Live pill** — active state when on EPG

---

## 4. Do not build (hard stops)

- ❌ Picture-in-Picture player — no rendering, no focus state, no interaction, no transition
- ❌ Player playback — Watch Live / Watch Channel CTAs are analytics-only no-ops
- ❌ Favoriting interaction — heart icon is decorative only
- ❌ Authentication, sign-in, account state
- ❌ Any persistence (no localStorage, no cookies, no session storage for user data)
- ❌ Channel icon upload or any storage-dependent feature
- ❌ Wiring Search, Movies, Shows, Bookmarks, Settings, Location pill in top nav
- ❌ Past programs / leftward navigation past "now"
- ❌ Now-line indicator
- ❌ Local Now branding of any kind
- ❌ Loading skeletons, empty state, mobile variant (not in design scope)

---

## 5. Analytics table

| Event name | Trigger | Payload fields |
|---|---|---|
| `epg_screen_entered` | EPG screen mounts | `participant_code`, `session_id`, `entry_source` |
| `epg_screen_exited` | EPG screen unmounts | `participant_code`, `session_id`, `dwell_ms`, `exit_destination` |
| `epg_genre_chip_focused` | Focus enters a genre chip | `participant_code`, `session_id`, `genre_id`, `genre_index` |
| `epg_genre_selected` | OK pressed on a genre chip | `participant_code`, `session_id`, `genre_id` |
| `epg_genre_anchor_updated` | Anchor auto-highlights chip from row blur | `participant_code`, `session_id`, `genre_id`, `triggering_channel_id` |
| `epg_channel_row_focused` | Focus enters a channel row | `participant_code`, `session_id`, `channel_id`, `genre_id`, `row_index` |
| `epg_program_tile_focused` | Focus enters a program tile | `participant_code`, `session_id`, `channel_id`, `genre_id`, `program_id`, `tile_offset_from_now` |
| `epg_program_tile_scrubbed` | Right-arrow advances within a row | `participant_code`, `session_id`, `channel_id`, `genre_id`, `new_tile_offset` |
| `epg_row_returned_to_now` | Row blur triggers return animation | `participant_code`, `session_id`, `channel_id`, `genre_id`, `final_offset_before_reset` |
| `epg_channel_logo_focused` | Focus enters a channel logo cell | `participant_code`, `session_id`, `channel_id`, `genre_id` |
| `epg_more_info_opened` | Channel logo selected | `participant_code`, `session_id`, `channel_id`, `variant` (`currently_playing`\|`future`) |
| `epg_more_info_closed` | Back/Escape on overlay | `participant_code`, `session_id`, `channel_id`, `dwell_ms` |
| `epg_more_info_cta_activated` | Watch Live / Watch Channel pressed | `participant_code`, `session_id`, `channel_id`, `cta_type` |
| `epg_back_to_nav` | Back button from rail or grid | `participant_code`, `session_id`, `from_surface` |
| `epg_nav_to_live` | For You → Live transition | `participant_code`, `session_id` |
| `epg_nav_from_live` | Live → For You transition | `participant_code`, `session_id` |

---

## 6. Acceptance criteria checklist

- [ ] Channels render grouped by genre; multi-genre channels appear in each of their genre groups
- [ ] At least 30 channel rows and 8 genres present
- [ ] No Local Now branding anywhere in the UI or assets
- [ ] Each row scrolls independently when scrubbed right
- [ ] Stacked instances of the same channel (across genres) scroll independently of each other
- [ ] Row returns to currently-playing tile via animation on blur
- [ ] 24-hour forward limit enforced; right-arrow at boundary is a no-op
- [ ] No past programs accessible; left from currently-playing tile goes to channel logo
- [ ] Selecting channel logo opens the correct more-info variant (currently-playing vs. future)
- [ ] Genre rail anchor highlights the correct chip within ~100ms of focus entering a new genre group
- [ ] Selecting a genre chip scrolls the grid to the first channel of that genre
- [ ] Genre rail wraps: right from last → first, left from first → last
- [ ] Up from top channel row → genre rail
- [ ] Up from genre rail → top nav, focus lands on Live pill
- [ ] Back button from rail or grid → top nav
- [ ] For You → Live and Live → For You navigation both work
- [ ] Genre order and naming configurable from debug.html
- [ ] Channel-to-genre association editable from debug.html
- [ ] Channel metadata editable from debug.html
- [ ] Currently-watching indicator renders on the correct tile (P1)
- [ ] Every interactive element fires its analytics event exactly once per trigger
- [ ] Every analytics event includes `participant_code` and `session_id`
- [ ] No frame drops on 30 rows × 8 genres render

---

## 7. File map

**Artifact root:** `docs/epg/` — all feature documentation lives here.

**Files to create (feature folder):**
- `docs/epg/PRD.md` — product requirements (Stage 1 output)
- `docs/epg/PRD-REVIEW.md` — self-review (Stage 2 output)
- `docs/epg/TEST-PLAN.md` — test plan (Stage 4 output)
- `docs/epg/TEST-RESULTS.md` — test results (Stage 6 output)

**Files to create (project source — verify folder convention against For You first):**
- `js/screens/epg/epg-screen.js` — screen module, focus orchestration, screen-level analytics
- `js/screens/epg/components/program-tile.js` — single tile, two render modes
- `js/screens/epg/components/channel-logo.js` — fixed left cell with static heart
- `js/screens/epg/components/channel-row.js` — logo + tile track + per-instance scroll state
- `js/screens/epg/components/genre-group.js` — header + rows
- `js/screens/epg/components/channel-grid.js` — vertical stack of genre groups
- `js/screens/epg/components/genre-rail.js` — wrapping chip rail with anchor reaction
- `js/screens/epg/components/more-info-overlay.js` — overlay with two variants
- `js/screens/epg/data-model.js` — channel/genre/program types and selectors
- `css/screens/epg/epg.css` — all EPG styling
- `data/epg-mock.json` — 30+ channels, 8+ genres, 24h of programs each

**Files to touch:**
- `debug.html` — add genre naming, genre order, channel-to-genre association, channel metadata edit, plus any logical EPG toggles that fit the existing pattern
- The existing top nav module — wire For You ↔ Live transitions, add active state for Live pill on EPG screen
- The existing screen router / index.html screen mount points — register the EPG screen
- The existing event bus consumer registry — register EPG events

**Files that must NOT be touched:**
- For You lander internals (only its nav-out hook may be touched)
- The existing event bus implementation itself (consume it; do not modify it)
- The existing focus/navigation system internals (consume it; do not modify it)
- Any file in another screen folder
- `index.html` root structure
- **Rule of thumb:** if a file isn't in the "to create" or "to touch" lists above, do not modify it. If unsure, ask before editing.

**Platform-level docs to update retroactively in Stage 10:**
- `docs/COMPONENT_MAP.md` — add all EPG components
- `docs/ANALYTICS_REGISTRY.md` — add all events from § 5 above
- `docs/SCREEN_INVENTORY.md` — add Live / EPG screen
- `docs/NAVIGATION_MAP.md` — add For You ↔ Live + intra-EPG focus map
- `docs/DEPENDENCY_GRAPH.md` — add EPG module and its debug.html dependency
- `docs/KNOWN_ISSUES.md` — log anything deferred or quirky discovered during build
- `CHANGELOG.md` — EPG feature entry on `epg-initial`

---

## 8. Branch and push

Work on branch `epg-initial` on `chesteria/UTA`. Create from main if it does not exist. Commit messages use `feat(epg): <summary>` for feature commits, `fix(epg): <summary>` for bug fixes after Stage 6, and `docs(epg): <summary>` for documentation-only commits including the Stage 10 retroactive platform doc updates. Push to `epg-initial` only — never to `main`. Do not open a pull request; the user handles merge decisions manually.

---

*Brief version: 1.0 — companion to ORCHESTRATE.md for EPG feature build*
