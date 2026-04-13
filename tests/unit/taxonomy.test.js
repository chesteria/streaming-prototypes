/**
 * S5 — Event Taxonomy
 * Data-driven validation of the event catalog defined in PRD §6.
 * No analytics.js import needed — tests the spec itself as a data contract.
 */

// ── Catalog ────────────────────────────────────────────────────────────────
// Mirrors PRD §6 exactly. Each entry: { name, params: [param names] }
// Standard params are listed separately and excluded from per-event counts.

const STANDARD_PARAMS = [
  'participant_id',
  'proto_screen',
  'device_profile',
  'scenario_preset',
  'session_timestamp',
];

const EVENT_CATALOG = [
  // §6.2 Navigation
  { name: 'proto_screen_view',      params: ['previous_screen'] },
  { name: 'rail_focus',             params: ['rail_id', 'rail_position'] },
  { name: 'card_focus',             params: ['card_id', 'card_title', 'rail_id', 'card_position'] },
  { name: 'card_select',            params: ['card_id', 'card_title', 'destination_screen'] },
  { name: 'nav_back',               params: ['from_screen', 'to_screen'] },
  { name: 'nav_exit',               params: ['from_screen'] },

  // §6.3 Content Interaction
  { name: 'pdp_view',               params: ['series_id', 'series_title'] },
  { name: 'pdp_episode_focus',      params: ['episode_id', 'episode_number', 'season_number'] },
  { name: 'pdp_episode_select',     params: ['episode_id', 'episode_number'] },
  { name: 'pdp_trailer_select',     params: ['series_id'] },
  { name: 'my_mix_rail_view',       params: ['content_count'] },
  { name: 'my_mix_card_focus',      params: ['card_id', 'card_type'] },

  // §6.4 Player
  { name: 'proto_video_start',      params: ['content_id', 'content_type', 'content_title'] },
  { name: 'video_pause',            params: ['content_id', 'elapsed_seconds'] },
  { name: 'video_resume',           params: ['content_id', 'elapsed_seconds'] },
  { name: 'video_seek',             params: ['content_id', 'direction', 'elapsed_seconds'] },
  { name: 'proto_video_complete',   params: ['content_id', 'total_duration_seconds'] },
  { name: 'video_exit',             params: ['content_id', 'elapsed_seconds', 'total_duration_seconds', 'percent_watched'] },
  { name: 'player_error',           params: ['content_id', 'error_code'] },

  // §6.5 Feedback & Research
  { name: 'feedback_triggered',     params: ['content_id'] },
  { name: 'feedback_submitted',     params: ['feedback_type', 'rating'] },
  { name: 'feedback_dismissed',     params: [] },
  { name: 'task_start',             params: ['task_id', 'task_name'] },
  { name: 'task_complete',          params: ['task_id', 'completion_time_seconds'] },
  { name: 'task_abandon',           params: ['task_id', 'abandon_reason'] },

  // §6.6 Session & Config
  { name: 'proto_session_start',    params: ['participant_id', 'device_profile'] },
  { name: 'proto_session_end',      params: ['participant_id', 'session_duration_seconds', 'total_events_fired', 'screens_visited'] },
  { name: 'debug_panel_open',       params: [] },
  { name: 'config_changed',         params: ['config_key', 'config_value'] },
  { name: 'scenario_applied',       params: ['scenario_id', 'scenario_name'] },
  { name: 'device_profile_changed', params: ['new_profile', 'previous_profile'] },
];

// Firebase reserved event names that MUST be prefixed (PRD §13, Issue 1)
const FIREBASE_RESERVED = [
  'screen_view', 'session_start', 'session_end',
  'video_start', 'video_complete', 'video_progress',
  'page_view', 'user_engagement', 'first_visit', 'first_open',
];

// Brand terms that must never appear in event names or param names
const BRAND_TERMS = [
  'localnow', 'local_now', 'local now',
  'anthropic', 'samsung', 'tizen', 'xumo', 'comcast',
];

// ── T5.1 ──────────────────────────────────────────────────────────────────
test('T5.1 all event names are ≤ 40 characters (Firebase limit)', () => {
  const violations = EVENT_CATALOG.filter(e => e.name.length > 40);
  expect(violations.map(e => `${e.name} (${e.name.length})`)).toEqual([]);
});

// ── T5.2 ──────────────────────────────────────────────────────────────────
test('T5.2 all event names are snake_case (lowercase + underscores only)', () => {
  const snakeCasePattern = /^[a-z][a-z0-9_]*$/;
  const violations = EVENT_CATALOG.filter(e => !snakeCasePattern.test(e.name));
  expect(violations.map(e => e.name)).toEqual([]);
});

// ── T5.3 ──────────────────────────────────────────────────────────────────
test('T5.3 all param names are ≤ 40 characters (Firebase limit)', () => {
  const violations = [];
  for (const event of EVENT_CATALOG) {
    const allParams = [...STANDARD_PARAMS, ...event.params];
    for (const param of allParams) {
      if (param.length > 40) violations.push(`${event.name}.${param}`);
    }
  }
  expect(violations).toEqual([]);
});

// ── T5.4 ──────────────────────────────────────────────────────────────────
test('T5.4 total params per event (standard + specific) do not exceed 25', () => {
  const violations = EVENT_CATALOG.filter(
    e => STANDARD_PARAMS.length + e.params.length > 25
  );
  expect(violations.map(e => `${e.name} (${STANDARD_PARAMS.length + e.params.length})`)).toEqual([]);
});

// ── T5.5 ──────────────────────────────────────────────────────────────────
test('T5.5 Firebase reserved event names are prefixed with proto_', () => {
  const unprefixed = EVENT_CATALOG
    .map(e => e.name)
    .filter(name => FIREBASE_RESERVED.includes(name));
  expect(unprefixed).toEqual([]);
});

// ── T5.6 ──────────────────────────────────────────────────────────────────
test('T5.6 standard params use proto_screen, not screen_name', () => {
  expect(STANDARD_PARAMS).toContain('proto_screen');
  expect(STANDARD_PARAMS).not.toContain('screen_name');
});

// ── T5.7 ──────────────────────────────────────────────────────────────────
test('T5.7 no event-specific params duplicate a standard param key', () => {
  const violations = [];
  for (const event of EVENT_CATALOG) {
    for (const param of event.params) {
      if (STANDARD_PARAMS.includes(param) && param !== 'participant_id' && param !== 'device_profile') {
        // participant_id and device_profile intentionally appear in proto_session_* events
        violations.push(`${event.name}.${param}`);
      }
    }
  }
  expect(violations).toEqual([]);
});

// ── T5.8 ──────────────────────────────────────────────────────────────────
test('T5.8 brand audit: no brand terms in event names or param names', () => {
  const allIdentifiers = [
    ...EVENT_CATALOG.map(e => e.name),
    ...EVENT_CATALOG.flatMap(e => e.params),
    ...STANDARD_PARAMS,
  ].map(s => s.toLowerCase());

  const violations = [];
  for (const term of BRAND_TERMS) {
    for (const id of allIdentifiers) {
      if (id.includes(term.toLowerCase())) violations.push(`"${term}" found in "${id}"`);
    }
  }
  expect(violations).toEqual([]);
});
