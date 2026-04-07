I'm going to bed. I want you to do a thorough bug hunt and fix session 
overnight. Scope: Phase 1, Phase 1.5, and the Big Buck Bunny stream 
integration. Do NOT touch Phase 2 or Phase 3 — they aren't built yet.

Reference /Users/chris/Documents/Claude/Projects/UTA/uta/streaming-prototype/prd as the source of truth. You have made fixes and changes to the PRD as well, they are documented here: /Users/chris/Documents/Claude/Projects/UTA/uta/streaming-prototype/change-log.md

WORKFLOW:

Step 1 — Discovery
Walk through every screen and the debug system. Check for:
- Missing features per the PRD
- Broken d-pad navigation, focus memory, BACK behavior, dead-ends
- Big Buck Bunny stream playback, pause, seek, resume issues
- Debug panel controls that don't actually work
- localStorage persistence issues
- Console errors or warnings during normal use
- Modular architecture violations (cross-screen imports, hardcoded values)
- Memory leaks (uncleaned listeners, uncleared intervals)
- Visual issues vs the reference mockups

Step 2 — Write the report
Save a written bug report to /Users/chris/Documents/Claude/Projects/UTA/uta/streaming-prototype/Feedbackbug-hunt-report.md organized by 
severity (CRITICAL / HIGH / MEDIUM / LOW). For each issue include:
- What's broken
- File location
- What the PRD says should happen
- Your proposed fix
- Whether you classified it as "bug" or "intentional deviation"

Step 3 — Auto-fix CRITICAL and HIGH only
Without waiting for approval, fix everything you classified as CRITICAL 
or HIGH. As you fix each one, append a note to docs/bug-hunt-report.md 
under that issue saying "FIXED" with a brief description of what you did.

Step 4 — Stop and wait for MEDIUM and LOW
Do NOT fix MEDIUM or LOW issues. Leave those for me to review in the 
morning. I'll decide which ones to address.

Step 5 — Write a session log
Save docs/bug-hunt-session-log.md with:
- Total issues found by severity
- Total fixed
- Total remaining for my review
- Any issues you found but couldn't classify (need my input)
- Any places where you were uncertain about the right fix
- Any new bugs introduced by your fixes that you then had to fix
- A "things to verify in the morning" checklist for me

SAFETY RULES:

- If you encounter something destructive or risky (deleting files, 
  major refactors, anything affecting more than 3 files), STOP and 
  add it to the session log under "needs my approval" instead of 
  proceeding
- If you get stuck in a loop trying to fix something, stop after 3 
  attempts and document it in the session log
- Be honest in the report — flag intentional deviations as such, 
  don't "fix" things that are working correctly

Update the changelog with all changes.

DO NOT PUSH ANYTHING TO GITHUB AUTOMATICALLY