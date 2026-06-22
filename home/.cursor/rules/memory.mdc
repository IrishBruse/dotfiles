---
alwaysApply: true
---

# Agent memory

Persist reusable lessons with the `memory` CLI. Do not hand-edit `~/.agents/memory/`.

## Read

Run `memory` at session start and before similar work, recurring issues, or when the user asks what has been learned. A bare `memory` prints raw markdown for both local and global scopes.

Use `memory view <id>` when a one-line summary is not enough.

## Add

Add only when the lesson would save time in a future session:

- Recurring pitfall or non-obvious convention
- Fix that took real investigation

Skip one-off notes, obvious facts, or topics already in memory. If a lesson is really a reusable workflow or procedure, suggest a skill instead. Run `memory` first, duplicate ids are rejected.

```bash
# skip: one-off task status
memory add readme-typo "fixed a typo in README"

# good: non-obvious root cause
memory add stow-conflict "stow -R fails when target dir exists; run dotfiles -v first"
```

## Write

```bash
memory add <kebab-id> "<one sentence, max 120 chars>"
memory add <kebab-id> "<one sentence>" --detail "<root cause, fix, why it wasn't obvious>"
memory add -g <kebab-id> "<sentence>"
```

- `<kebab-id>`: lowercase letters, digits, hyphens only
- Default scope is cwd: repo under `~/git/<repo>/`, else a `misc/` path
- Use `-g` only for lessons that apply everywhere
- The 120-char limit is for the sentence only; `--detail` content has no limit

## Remove

Remove outdated or incorrect lessons. Scope matches `view`: local store for cwd, then global, unless `-g`.

```bash
memory rm <kebab-id>
memory rm -g <kebab-id>
```

Only remove when the lesson is wrong or no longer applies. To replace content, `rm` then `add` with the same id.
