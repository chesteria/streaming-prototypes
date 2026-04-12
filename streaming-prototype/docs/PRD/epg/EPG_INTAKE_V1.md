# Feature Intake Template
> Fill this out before running the Claude Code orchestration workflow.
> Drop this file + your design images into the working directory, then invoke ORCHESTRATE.md.

---

## 1. Feature Identity

**Feature name:**
EPG (Electronic Program Guide)

**Screen or surface:**
This is a standalone screen, accessible from the main navigation by selecting "Live"

**One-sentence description:**
This feature facilitates live channel discovery by providing a grid of available channels to the user complete with channel logos, program meta data, and a genre selector. 

---

## 2. Context & Motivation

**Why are we building this now?**
This feature is being added as the next major item in this prototype so we can begin laying the foundation for more robust UX features. It also is the main driver in our production application for session time, TSV, and ad revenue.

**Who is the primary audience for this prototype?**
UX research participants and stakeholders are the primary users. However the decisions made by using this prototype will ultimately affect how we deliver this experience to our end users.

**What phase of the platform does this belong to?**
Phase 3. Phase 3 will encompass all features needed to deliver the "live" experience. EPG, full screen player for live content (same player we use now really, just with slightly altered player controls and functionality), and a PiP.

---

## 3. Design Assets

**Number of mockup images included:**
12

**What states are covered in the designs?**
<!-- Check all that apply -->
- [x] Default / idle state
- [x] Focus / d-pad hover states
- [x] Selected / active state
- [x] Picture in Picture player
- [ ] Loading / skeleton state
- [ ] Empty state
- [x] Error state
- [ ] Mobile variant
- [ ] Other: _______________

**Are there any states NOT covered by the designs that still need to be built?**
<!-- List them here so the PRD agent doesn't miss them -->

---

## 4. Functional Requirements

### Must Have (P0 — blocking)
<!--
These are non-negotiable. The feature is not shippable without them.
One per line, written as observable behaviors.
e.g., "User can navigate between episodes using d-pad left/right"
-->

- No Local Now IP whatsoever. Maintain current strategy of showing nothing branded.
- Guide goes 24 hours in the future.
- The guide does not increment by a set time frame. Rather, each program is constrained to a cell, and the next cell is the next program. 
- Cell size does not dictate content length. Each cell is a fixed size regardless of how long the content is playing for.
- Channels are grouped by genre
- Channels can exist in multiple genres, should the channel be configured as such.
- Genre rail is an anchor. As the user focusses downward, the genre rail reacts as the user enters a new genre.
- Selecting a genre will scroll the user to the first channel in the selected genre.
- Genres are configurable, as is the order in which they are presented
- There is no now line, and past programs cannot be accessed. Current + Future only.
- User can change focus left from the currently playing program in any given channel row to set focus to the channel icon. Selecting opens the more info panel for that channel.
- Each row focusses independently. If a user browses three hours in the future for a channel, it is the only channel to scroll.
- If there is a channel in multiple genres and they end up being stacked, each channel instance scrolls independently of any other instance that may exist.
- As the user focusses into another channel, the channel row they left animates back to its currently playing program tile.
- Build with hand authored, cheeky and humorous meta data. 
-  At least 30 rows, and 8 working genres.
- Navigation is already created and wired up. Add the ability to navigate to live from other existing screens (so far just the For you lander is created) and to other screens from live (so far just the For you lander is created.)
- User can focus up from top channel rail to genres
- User can focus up from genres to nav. Focus is set to the screen the user is on (in this case, the live option)
- Pressing the back button from anywhere in the genre rail or main channel grid will set focus to the top nav.
- The genre rail is wrapping. Focussing right from the last, goes to the first.
- Take a logical sweep through the debug panel feature. Add in any logical items that could fit in there, based on what currently exists. 

### Should Have (P1 — important)
<!--
High value but not blocking for the initial push.
-->

- currently watching indicator in the currently watching program tile
- Configuration elements in the existing debug.html application configuration.
- 

### Nice to Have (P2 — deferred is fine)
<!--
Would be great, but explicitly out of scope for this build.
-->

-
-
-

### Explicitly Out of Scope
<!--
Things that might seem related but are NOT being built.
Being explicit here prevents scope creep in the PRD.
-->

- Hooking the player up. Selecting a channel does not lead to playback for this release.
- the Picture in PIcture player and any depicted focus states with this feature.
- Anything authentication related. Favoriting from the more info panel, etc.
- Configuring anything that would necessitate storage. IE - uploading a new channel icon. 
- Any navigation element other than for you lander is static. 
-

---

## 5. Technical Dependencies

**Files / modules this feature touches or depends on:**
<!-- e.g., js/navigation.js, css/components.css, data/mock-content.json -->

- debug.html already exists, and needs to be updated in order to support the configuration of this feature. 
	- I want to be able to control genre naming and association with channels
	- I want to be able to edit channel meta data.
-
-

**New files that will need to be created:**

-
-
-

**External dependencies (APIs, data, config):**
<!-- e.g., "Reads rail order from config.json", "Uses placeholder poster URLs" -->

-  
-

**Known conflicts or risks:**
<!-- e.g., "Navigation module has an open bug with focus trapping" -->

-
-

---

## 6. Analytics Requirements
<!-- Per platform principle: instrumentation is mandatory, not optional -->

**Events that must be tracked:**
<!-- Format: event_name | trigger | payload fields -->
<!-- e.g., episode_selected | user confirms episode | { episode_id, position, rail_id } -->

- Author your own logical events that I will review before implementation. We can adjust in that stage.
-
-

**Any participant/session context needed?**
<!-- e.g., participant code (P-XXXX), session ID, scenario preset active -->



---

## 7. Acceptance Criteria

**The feature is considered complete when:**
<!--
Write these as testable, binary pass/fail conditions.
These will feed directly into the test plan.
e.g., "D-pad navigation cycles through all episodes without dropping focus"
-->

1. Realistically the AC is all based around the must have scope. Formulate AC based on testing and validating those items. We can review.
2. 
2.
3.
4.
5.

---

## 8. Branch & Delivery

**Target branch name:**
<!-- e.g., feature/series-pdp-episode-rail -->
<!-- Nothing merges to main. This is the branch Claude Code will create and push to. -->

`epg-initial`

**Repo:**
<!-- e.g., your-username/your-repo -->
chesteria/UTA

**Any files that should NOT be touched:**
<!-- e.g., "Do not modify index.html root structure" -->

- Do not modify any other files that does not imply a dependency to deliver. If unsure, ask.
-

---

## 9. Notes for the PRD Agent

**Anything unusual about this feature the agent should know?**
<!-- Design quirks, platform-specific behavior, prior decisions that constrain the build -->

**Preferred implementation approach (if you have one):**
<!-- Leave blank to let the agent decide -->

**Performance constraints:**
<!-- e.g., "Must not cause frame drops on lowest-tier device profile", "Keep JS under 50KB" -->

---
*Template version: 1.0*
