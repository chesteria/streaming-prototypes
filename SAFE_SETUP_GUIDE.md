# Safer multi-agent setup guide

## Files to add

Place these in the repo root:
- `AGENTS.md`
- `SHARED_CORE_RULES.md`

Keep your existing:
- `CLAUDE.md`

Optional:
- `.git/hooks/pre-commit`

## Recommended layout

- `CLAUDE.md` = fuller project context for Claude
- `AGENTS.md` = tighter execution rules for Codex
- `SHARED_CORE_RULES.md` = canonical block both files copy from

## One-time steps

### 1) Replace AGENTS.md
Copy the provided `AGENTS.md` into the repo root.

### 2) Add the shared block to CLAUDE.md
Paste the `CLAUDE_shared_block.md` content near the top of `CLAUDE.md`, after the project overview or architecture intro.

### 3) Install the pre-commit hook
From the repo root:

```bash
mkdir -p .git/hooks
cp tooling/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

Or, if you do not want to add a tracked `tooling/` file, copy the hook body directly into `.git/hooks/pre-commit`.

## Best workflow when switching agents

1. Commit or stash first.
2. Start a fresh task with a narrow scope.
3. Ask the agent to inspect first and propose files to edit.
4. Keep one agent per branch for non-trivial work.
5. Merge through Git instead of letting both agents live-edit the same branch.

## Suggested first prompts

### For Codex
"Read AGENTS.md and inspect the relevant files before editing. Propose the minimal change surface, then implement."

### For Claude
"Follow CLAUDE.md and the shared core rules. Inspect first, name the files you plan to touch, then make the smallest safe change."

## Why this setup is safer

- Shared truths reduce instruction drift.
- The pre-commit hook blocks the most expensive accidental changes.
- Separate branch discipline reduces edit collisions.
- The shorter AGENTS file improves compliance on execution tasks.
