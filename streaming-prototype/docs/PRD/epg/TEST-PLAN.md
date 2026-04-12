# TEST-PLAN.md — EPG (Electronic Program Guide)
**Stage:** 4 — Test Plan  
**PRD version:** 2  
**Branch:** `epg-initial`

Each test case is identified by `EPG-T###`. Each references one or more AC IDs from `PRD.md`. Tests marked **[EDGE]** are mandatory edge cases from the ORCHESTRATE.md Stage 4 specification.

---

## Test Environment Setup

Before running any tests:
1. Open `index.html` in a desktop browser (Chrome recommended).
2. Complete the welcome screen and participant ID prompt if present.
3. Confirm the EPG screen is reachable via the "Live" nav tab.
4. Open the browser console — keep it visible throughout to observe analytics events and catch JS errors.
5. For debug.html tests: open `debug.html` in a separate tab.

**Test notation:**
- **d-pad** = arrow keys on keyboard (UP/DOWN/LEFT/RIGHT)
- **OK** = Enter key
- **BACK** = Escape key
- **PASS / FAIL** — binary only. No "partial."

---

## Group 1 — Screen Entry & Initial State

### EPG-T001
**AC:** EPG-AC-10, EPG-AC-22, EPG-AC-37  
**Description:** For You → Live navigation mounts EPG with correct initial focus.

**Steps:**
1. Load the app. Land on the For You lander.
2. Press UP to reach the top nav. Navigate RIGHT to "Live."
3. Press OK.

**Expected:**
- EPG screen mounts and becomes visible.
- Focus is on the currently-playing tile of the first channel row (first genre group, first channel, tile index 0).
- Console shows `epg_screen_entered` event with `entry_source: 'nav'`.
- The "Live" nav pill has the `.active` class; "For You" does not.

---

### EPG-T002
**AC:** EPG-AC-10, EPG-AC-11 **[EDGE]**  
**Description:** Round trip For You → Live → For You preserves no EPG state.

**Steps:**
1. Navigate to the EPG screen.
2. Scrub right 3 tiles on the first channel row.
3. Press BACK to reach the top nav.
4. Navigate LEFT to "For You." Press OK.
5. The For You lander loads. Navigate to "Live" again.

**Expected:**
- On second EPG mount, focus starts fresh on the first channel row, currently-playing tile (index 0).
- No previously scrubbed row positions are retained.
- `epg_screen_entered` fires a second time.

---

## Group 2 — Top Nav Behaviour on EPG Screen

### EPG-T003
**AC:** EPG-AC-02, EPG-AC-03  
**Description:** BACK from the channel grid lands focus on the top nav Live pill.

**Steps:**
1. Navigate to the EPG screen. Focus is in the channel grid.
2. Press BACK.

**Expected:**
- Focus moves to the top nav. The "Live" pill is focused (not "For You" or any other tab).
- EPG screen remains mounted — grid and genre rail are still visible behind the nav.
- Console shows `epg_back_to_nav` event with `from_surface: 'grid'`.

---

### EPG-T004
**AC:** EPG-AC-02, EPG-AC-04  
**Description:** BACK from the genre rail lands focus on the top nav Live pill.

**Steps:**
1. Navigate to EPG. Press UP from the channel grid to reach the genre rail.
2. Press BACK.

**Expected:**
- Focus moves to the top nav "Live" pill.
- EPG screen remains mounted.
- Console shows `epg_back_to_nav` with `from_surface: 'rail'`.

---

### EPG-T005
**AC:** EPG-AC-02 **[EDGE]**  
**Description:** UP from genre rail → top nav lands on "Live" pill specifically.

**Steps:**
1. Navigate to EPG. Press UP from the channel grid to reach the genre rail.
2. Press UP again from the genre rail.

**Expected:**
- Focus moves to the top nav.
- The focused tab is "Live" — not "For You" and not whichever tab was active on the previous screen.

---

### EPG-T006
**AC:** (non-AC — navigation stability)  
**Description:** Non-implemented nav tabs on EPG screen show toast and do not navigate.

**Steps:**
1. Navigate to EPG. Press BACK to reach the top nav.
2. Navigate LEFT past "Live" to reach "Movies" (or any non-For You / non-Live tab). Press OK.

**Expected:**
- A toast notification appears (e.g., "Navigating to Movies…").
- The EPG screen remains mounted. No screen transition occurs.

---

### EPG-T007
**AC:** EPG-AC-11  
**Description:** Selecting "For You" from the EPG nav transitions to the lander.

**Steps:**
1. Navigate to EPG. Press BACK to reach the top nav.
2. Navigate LEFT to "For You." Press OK.

**Expected:**
- The For You lander mounts and becomes the active screen.
- Console shows `epg_nav_from_live` event followed by `epg_screen_exited` with `exit_destination: 'lander'`.

---

## Group 3 — Genre Rail Navigation

### EPG-T008
**AC:** EPG-AC-12 **[EDGE]**  
**Description:** Genre rail wraps right-to-first.

**Steps:**
1. Navigate to EPG. Press UP to reach the genre rail.
2. Press RIGHT repeatedly until focus reaches the last genre chip.
3. Press RIGHT once more.

**Expected:**
- Focus moves to the first genre chip (index 0).
- Console shows `epg_genre_chip_focused` with `genre_index: 0`.

---

### EPG-T009
**AC:** EPG-AC-13 **[EDGE]**  
**Description:** Genre rail wraps left-to-last.

**Steps:**
1. Navigate to EPG. Press UP to reach the genre rail.
2. Confirm focus is on the first chip (or navigate to it).
3. Press LEFT.

**Expected:**
- Focus moves to the last genre chip.
- Console shows `epg_genre_chip_focused` with the last genre's index.

---

### EPG-T010
**AC:** EPG-AC-14  
**Description:** Selecting a genre chip scrolls the grid to that genre's first channel.

**Steps:**
1. Navigate to EPG. Press UP to reach the genre rail.
2. Navigate to the "Comedy" chip (or any non-first genre). Press OK.

**Expected:**
- The channel grid scrolls vertically to bring the first Comedy channel row to the top of the visible area.
- Focus moves down to that channel row's currently-playing tile.
- Console shows `epg_genre_selected` with the correct `genre_id`.

---

### EPG-T011
**AC:** EPG-AC-15 **[EDGE]**  
**Description:** Genre rail anchor chip updates correctly and promptly when scrolling fast through multiple genres.

**Steps:**
1. Navigate to EPG. Start in the channel grid.
2. Press DOWN rapidly, moving focus through several channel rows that cross genre boundaries.

**Expected:**
- After each genre boundary crossing, the corresponding genre chip in the rail becomes active.
- The correct chip is always active for the genre the current row belongs to — no mismatches after settling.
- No visible lag between the row focus changing genres and the chip updating.

---

## Group 4 — Channel Grid & Row Navigation

### EPG-T012
**AC:** EPG-AC-01  
**Description:** UP from the top channel row reaches the genre rail.

**Steps:**
1. Navigate to EPG. Focus is on the first channel row.
2. Press UP.

**Expected:**
- Focus moves to the genre rail. The active chip corresponds to the first genre group.

---

### EPG-T013
**AC:** EPG-AC-09  
**Description:** DOWN from the last channel row is a no-op.

**Steps:**
1. Navigate to EPG. Press DOWN repeatedly until focus reaches the last channel row in the grid.
2. Press DOWN once more.

**Expected:**
- Focus does not move. The last channel row remains focused.
- No JS error in the console. No crash.

---

### EPG-T014
**AC:** EPG-AC-05, EPG-AC-06  
**Description:** LEFT from tile index 0 → logo cell; RIGHT from logo cell → tile index 0.

**Steps:**
1. Navigate to EPG. Focus is on the currently-playing tile of any channel row (tile index 0).
2. Press LEFT.
3. Press RIGHT.

**Expected:**
- Step 2: Focus moves to the channel logo cell of the same row.
- Step 3: Focus moves back to tile index 0 (currently-playing tile).

---

### EPG-T015
**AC:** EPG-AC-07 **[EDGE]**  
**Description:** RIGHT arrow at the 24-hour boundary tile is a no-op.

**Steps:**
1. Navigate to EPG. Focus on any channel row.
2. Press RIGHT repeatedly until focus reaches the last tile in the row (24-hour boundary).
3. Press RIGHT once more.

**Expected:**
- Focus does not move past the last tile. No wrap, no crash.
- No JS error in the console.

---

### EPG-T016
**AC:** EPG-AC-08  
**Description:** No tile exists to the left of the currently-playing tile.

**Steps:**
1. Navigate to EPG. Focus on the currently-playing tile of any row.
2. Confirm this is tile index 0 (leftmost tile).
3. Press LEFT.

**Expected:**
- Focus moves to the channel logo cell — not to a "past" program tile.
- No tile renders to the left of the currently-playing tile.

---

### EPG-T017
**AC:** EPG-AC-19  
**Description:** Each channel row scrolls independently.

**Steps:**
1. Navigate to EPG. Focus on the first channel row. Press RIGHT 3 times (scrub 3 tiles forward).
2. Press DOWN to move focus to the second channel row.

**Expected:**
- The first row's tile track has scrolled right (tiles 1–3 visible).
- The second row's tile track is at position 0 (currently-playing tile is leftmost).
- The two rows are in different scroll positions independently.

---

### EPG-T018
**AC:** EPG-AC-20 **[EDGE]**  
**Description:** Two instances of the same channel in different genres scroll independently.

**Steps:**
1. Navigate to EPG. Locate a channel that appears in two different genre groups (e.g., "The Correspondent" in News and Documentary).
2. Navigate to the first instance. Scrub RIGHT 4 tiles.
3. Navigate DOWN through the grid until the second instance of the same channel comes into view.

**Expected:**
- The second instance is at tile index 0 (currently-playing tile) — it has not moved with the first instance.
- Scrub RIGHT 2 tiles on the second instance.
- Navigate back UP to the first instance — it remains at 4 tiles forward, unaffected by the second instance's scroll.

---

### EPG-T019
**AC:** EPG-AC-21 **[EDGE]**  
**Description:** Row blur triggers the return-to-now animation cleanly.

**Steps:**
1. Navigate to EPG. Focus on any channel row. Press RIGHT 5 tiles.
2. Press DOWN to leave the row.

**Expected:**
- The departed row's tile track animates smoothly back to tile index 0 (currently-playing position).
- The animation completes fully — no stuck state, no partial completion, no snap without transition.
- Console shows `epg_row_returned_to_now` with `final_offset_before_reset: 5` (or equivalent tile offset).

---

### EPG-T020
**AC:** EPG-AC-21 **[EDGE]**  
**Description:** Row blur during scrub mid-animation completes cleanly.

**Steps:**
1. Navigate to EPG. Focus on a channel row. Press RIGHT 5 tiles.
2. Press DOWN immediately and quickly (before any return animation starts naturally).
3. Observe the departing row.

**Expected:**
- The return-to-now animation completes to tile index 0 — no stuck state at a mid-position.
- The incoming row receives focus immediately without waiting for the animation.
- No JS error in the console.

---

### EPG-T021
**AC:** EPG-AC-22  
**Description:** Initial focus on screen entry is the currently-playing tile of the first channel row.

**Steps:**
1. Navigate to the EPG screen from For You.

**Expected:**
- The focused element is the currently-playing tile (tile index 0) of the very first channel row rendered.
- No other tile or element has focus.

---

## Group 5 — More-Info Overlay

### EPG-T022
**AC:** EPG-AC-23 **[EDGE]**  
**Description:** Channel logo OK while row is at tile index 0 opens the currently-playing overlay variant.

**Steps:**
1. Navigate to EPG. Focus on the currently-playing tile (index 0) of any channel row.
2. Press LEFT to focus the channel logo cell.
3. Press OK.

**Expected:**
- The more-info overlay opens in the **currently-playing variant**: displays a progress bar, remaining time (e.g., "33m left"), and a "Watch Live" CTA.
- Console shows `epg_more_info_opened` with `variant: 'currently_playing'`.

---

### EPG-T023
**AC:** EPG-AC-24, EPG-AC-25  
**Description:** Channel logo OK while row is scrubbed opens the future overlay variant for the correct tile.

**Steps:**
1. Navigate to EPG. Focus on any channel row. Press RIGHT 3 tiles (focus is now on tile index 3).
2. Press LEFT to focus the channel logo cell.
3. Press OK.

**Expected:**
- The more-info overlay opens in the **future variant**: displays a scheduled window string, no progress bar, and a "Watch Channel" CTA.
- The program title and details shown are for the program at tile index 3 — not the currently-playing program.
- Console shows `epg_more_info_opened` with `variant: 'future'`.

---

### EPG-T024
**AC:** EPG-AC-26  
**Description:** BACK closes the more-info overlay and returns focus to the channel logo cell.

**Steps:**
1. Open the more-info overlay (from any channel logo).
2. Press BACK.

**Expected:**
- The overlay closes. The EPG grid becomes fully visible (no dim).
- Focus returns to the channel logo cell that triggered the overlay.
- Console shows `epg_more_info_closed` with a valid `dwell_ms` value.

---

### EPG-T025
**AC:** EPG-AC-26  
**Description:** Escape key closes the more-info overlay.

**Steps:**
1. Open the more-info overlay.
2. Press Escape (same key mapping as BACK).

**Expected:**
- Same result as EPG-T024.

---

### EPG-T026
**AC:** EPG-AC-27  
**Description:** "Watch Live" CTA is a no-op; fires analytics event only.

**Steps:**
1. Open the more-info overlay in the currently-playing variant.
2. The "Watch Live" CTA has focus by default. Press OK.

**Expected:**
- No navigation. No playback. The overlay remains open.
- Console shows `epg_more_info_cta_activated` with `cta_type: 'watch_live'`.

---

### EPG-T027
**AC:** EPG-AC-27  
**Description:** "Watch Channel" CTA is a no-op; fires analytics event only.

**Steps:**
1. Open the more-info overlay in the future variant.
2. Press OK on the "Watch Channel" CTA.

**Expected:**
- No navigation. No playback. Overlay remains open.
- Console shows `epg_more_info_cta_activated` with `cta_type: 'watch_channel'`.

---

### EPG-T028
**AC:** EPG-AC-21 (overlay close + row state) **[EDGE]**  
**Description:** Closing the more-info overlay after opening from a mid-scrubbed row leaves the row in its scrubbed position.

**Steps:**
1. Navigate to EPG. Focus on a channel row. Press RIGHT 4 tiles.
2. Press LEFT to focus the logo cell. Press OK to open the overlay.
3. Press BACK to close the overlay.

**Expected:**
- The overlay closes. Focus returns to the channel logo cell.
- The channel row's tile track is still in its scrubbed position (tile 4 visible) — the return-to-now animation has **not** fired.
- The row resets to "now" only when the user presses UP or DOWN to leave the row.

---

### EPG-T029
**AC:** EPG-AC-26 (focus trap)  
**Description:** D-pad directions are no-ops while the more-info overlay is open.

**Steps:**
1. Open the more-info overlay.
2. Press UP, DOWN, LEFT, RIGHT in sequence.

**Expected:**
- Focus does not move to the grid, genre rail, or nav behind the overlay.
- The overlay remains open and fully interactive after each key press.
- No JS errors.

---

## Group 6 — Content & Brand

### EPG-T030
**AC:** EPG-AC-28  
**Description:** No Local Now branding anywhere in the EPG UI.

**Steps:**
1. Navigate to the EPG screen. Visually inspect the full grid: channel logos, channel names, program tiles, genre rail, more-info overlay.

**Expected:**
- No "Local Now" wordmark, logo, colour scheme, or branded element appears anywhere.
- All channel names and logos are invented/placeholder.

---

### EPG-T031
**AC:** EPG-AC-29  
**Description:** No past programs are accessible or rendered.

**Steps:**
1. Navigate to EPG. Focus on the currently-playing tile of any channel row.
2. Press LEFT.

**Expected:**
- Focus moves to the channel logo cell — not to a program that started before "now."
- No tiles exist to the left of the currently-playing tile.

---

### EPG-T032
**AC:** EPG-AC-30  
**Description:** The 24-hour forward limit is enforced.

**Steps:**
1. Navigate to EPG. On any channel row, press RIGHT until hitting the rightmost tile.
2. Verify the tile's scheduled window does not extend beyond now + 24 hours.

**Expected:**
- The last tile ends at or before now + 24h.
- Pressing RIGHT from the last tile is a no-op (covered by EPG-T015).

---

### EPG-T033
**AC:** EPG-AC-16, EPG-AC-17, EPG-AC-18  
**Description:** Grid renders 30+ rows, 8+ genres, with multi-genre channels in multiple groups.

**Steps:**
1. Navigate to EPG. Count the total channel rows rendered across all genre groups.
2. Count the number of distinct genre group headers.
3. Locate a channel known to appear in 2 genres (e.g., "The Correspondent") and confirm it appears in both genre groups.

**Expected:**
- Total channel rows ≥ 30.
- Total genre groups ≥ 8.
- Multi-genre channel appears as a separate row in each of its genre groups.

---

## Group 7 — Debug Configuration

### EPG-T034
**AC:** EPG-AC-31 **[EDGE]**  
**Description:** Genre order changes in debug.html are reflected on next EPG mount.

**Steps:**
1. Open `debug.html`. Navigate to the EPG Config section.
2. Reorder the genres (e.g., drag "Sports" to position 1).
3. Save changes.
4. Switch to `index.html`. Navigate away from EPG (if on it) and back to EPG.

**Expected:**
- The genre rail and channel grid reflect the new genre order — "Sports" chips and rows appear first.
- No JS errors on mount.

---

### EPG-T035
**AC:** EPG-AC-32  
**Description:** Genre naming changes in debug.html are reflected on next EPG mount.

**Steps:**
1. Open `debug.html` → EPG Config. Rename "Comedy" to "Ha Ha Zone."
2. Save. Re-mount the EPG screen.

**Expected:**
- The genre chip and genre group header display "Ha Ha Zone."
- No other genres are affected.

---

### EPG-T036
**AC:** EPG-AC-33  
**Description:** Channel-to-genre association changes are reflected on next EPG mount.

**Steps:**
1. Open `debug.html` → EPG Config. Remove a channel from its current genre and assign it to a different one.
2. Save. Re-mount the EPG screen.

**Expected:**
- The channel no longer appears in its former genre group.
- The channel appears in its newly assigned genre group.
- No JS errors.

---

### EPG-T037
**AC:** EPG-AC-34  
**Description:** Channel metadata (name) edits are reflected on next EPG mount.

**Steps:**
1. Open `debug.html` → EPG Config. Edit a channel's display name to "Test Channel Renamed."
2. Save. Re-mount the EPG screen.

**Expected:**
- The renamed channel's logo cell and any more-info overlay reference display "Test Channel Renamed."

---

## Group 8 — Analytics

### EPG-T038
**AC:** EPG-AC-35 **[EDGE]**  
**Description:** No analytics event fires more than once per single trigger.

**Steps:**
1. Navigate to EPG. Open the browser console and filter for `epg_` events.
2. Perform one right-arrow press on a channel row tile.
3. Perform one genre chip OK press.
4. Open and close the more-info overlay once.

**Expected:**
- `epg_program_tile_scrubbed` appears exactly once for the single right-arrow press.
- `epg_genre_selected` appears exactly once for the single OK press.
- `epg_more_info_opened` and `epg_more_info_closed` each appear exactly once.
- No duplicate events from key bubbling or event propagation.

---

### EPG-T039
**AC:** EPG-AC-36  
**Description:** Every EPG analytics event includes `participant_code` and `session_id`.

**Steps:**
1. Navigate to EPG. In the console, inspect 5 different EPG events (e.g., `epg_screen_entered`, `epg_program_tile_focused`, `epg_genre_chip_focused`, `epg_more_info_opened`, `epg_back_to_nav`).

**Expected:**
- Each event object includes a non-null `participantId` field (P-XXXX format) and a non-empty `sessionId` field.

---

### EPG-T040
**AC:** EPG-AC-37, EPG-AC-38  
**Description:** Screen entry and exit events fire with correct payloads.

**Steps:**
1. Navigate to the EPG screen. Check the console for `epg_screen_entered`.
2. Navigate to For You. Check the console for `epg_screen_exited`.

**Expected:**
- `epg_screen_entered` present with `entry_source: 'nav'`.
- `epg_screen_exited` present with a positive `dwell_ms` value and `exit_destination: 'lander'`.

---

### EPG-T041
**AC:** EPG-AC-35 (event coverage sweep)  
**Description:** All 16 analytics events fire at least once during a full user journey.

**Steps:**
Perform the following actions in one session:
1. Select "Live" from For You nav → `epg_nav_to_live`, `epg_screen_entered`
2. Focus a genre chip → `epg_genre_chip_focused`
3. Select a genre chip → `epg_genre_selected`
4. Scroll down through a genre boundary → `epg_genre_anchor_updated`
5. Enter a channel row → `epg_channel_row_focused`
6. Focus a program tile → `epg_program_tile_focused`
7. Press RIGHT on a tile → `epg_program_tile_scrubbed`
8. Leave the row (DOWN) → `epg_row_returned_to_now`
9. Focus a channel logo cell → `epg_channel_logo_focused`
10. Open more-info → `epg_more_info_opened`
11. Press OK on CTA → `epg_more_info_cta_activated`
12. Close overlay → `epg_more_info_closed`
13. Press BACK from grid → `epg_back_to_nav`
14. Navigate to For You → `epg_nav_from_live`, `epg_screen_exited`

**Expected:**
- All 16 events appear in the console, each exactly once per action.

---

## Group 9 — Performance

### EPG-T042
**AC:** EPG-AC-39 **[EDGE]**  
**Description:** EPG screen mounts and renders the full grid within 2 seconds with no visible jank.

**Steps:**
1. Hard-reload `index.html` (Cmd+Shift+R / Ctrl+Shift+R).
2. Complete the welcome screen. Navigate to EPG.
3. Observe the initial render of the full channel grid (30+ rows, 8+ genres).
4. Press DOWN repeatedly to scroll through all genre groups.

**Expected:**
- The full grid is visible and interactive within 2 seconds of the EPG screen mounting.
- No visible frame drop or jank during initial render.
- No visible frame drop or jank while scrolling vertically through all rows.
- No JS errors in the console.

---

## Mandatory Edge Case Coverage Summary

| ORCHESTRATE.md Edge Case | Test(s) |
|---|---|
| Channel in 2+ genres: instances scroll independently | EPG-T018 |
| Row blur during scrub mid-animation: animation completes cleanly | EPG-T020 |
| Genre anchor when scrolling fast across genres: rail keeps up | EPG-T011 |
| Genre rail wrap: right-last→first, left-first→last | EPG-T008, EPG-T009 |
| Back from deeply-scrubbed row: returns to nav AND row resets | EPG-T003 + EPG-T019 (combined flow) |
| Last channel row: DOWN does not crash | EPG-T013 |
| 24-hour boundary tile: RIGHT does not advance | EPG-T015 |
| Logo OK at tile 0 → currently-playing variant (not future) | EPG-T022 |
| More-info from mid-scrub row: close returns to scrubbed position | EPG-T028 |
| Top nav from UP-arrow: lands on Live pill, not For You | EPG-T005 |
| For You → Live → For You: round trip is fresh state | EPG-T002 |
| Debug genre order change reflected on next load | EPG-T034 |
| 30 rows × 8 genres: no frame drops | EPG-T042 |
| Analytics: no duplicates from event bubbling | EPG-T038 |

---

## AC Coverage Matrix

| AC ID | Test(s) | AC ID | Test(s) |
|---|---|---|---|
| EPG-AC-01 | T012 | EPG-AC-22 | T021 |
| EPG-AC-02 | T005 | EPG-AC-23 | T022 |
| EPG-AC-03 | T003 | EPG-AC-24 | T023 |
| EPG-AC-04 | T004 | EPG-AC-25 | T023 |
| EPG-AC-05 | T014 | EPG-AC-26 | T024, T025, T029 |
| EPG-AC-06 | T014 | EPG-AC-27 | T026, T027 |
| EPG-AC-07 | T015 | EPG-AC-28 | T030 |
| EPG-AC-08 | T016 | EPG-AC-29 | T031 |
| EPG-AC-09 | T013 | EPG-AC-30 | T032 |
| EPG-AC-10 | T001, T002 | EPG-AC-31 | T034 |
| EPG-AC-11 | T007 | EPG-AC-32 | T035 |
| EPG-AC-12 | T008 | EPG-AC-33 | T036 |
| EPG-AC-13 | T009 | EPG-AC-34 | T037 |
| EPG-AC-14 | T010 | EPG-AC-35 | T038, T041 |
| EPG-AC-15 | T011 | EPG-AC-36 | T039 |
| EPG-AC-16 | T033 | EPG-AC-37 | T040 |
| EPG-AC-17 | T033 | EPG-AC-38 | T040 |
| EPG-AC-18 | T033 | EPG-AC-39 | T042 |
| EPG-AC-19 | T017 | | |
| EPG-AC-20 | T018 | | |
| EPG-AC-21 | T019, T020, T028 | | |

**Total tests:** 42  
**All 39 ACs covered.**  
**All 14 mandatory edge cases covered.**

---

*Test plan version: 1 — Stage 4 output, EPG feature build*
