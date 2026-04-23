You are executing **`pr create`**: create a new GitHub PR from the **current branch** when none exists yet. Follow this document exactly.

{{branchLine}}

{{hintBlock}}

## Requirements

- The CLI prefetched local repo context into the **workspace root** below. Use those files — do not assume you can run `git` in this temp directory (except as noted).
- `gh` CLI must be installed on the machine (the CLI invokes `gh pr create` from your repo directory after you finish; you do not need to run `gh` yourself for content).

{{prefetchedContextSection}}

## What to produce

1. Base the description on **`diff.patch`** and **`PULL_REQUEST_TEMPLATE.md`** (if present).
2. Propose a clear PR title aligned with **`branch.txt`** and the diff.

## Final deliverable (required)

Write two files in the **workspace root**:

1. **`Title.md`** — PR title (trimmed).
2. **`Body.md`** — Full markdown PR description.

Both must exist and be **non-empty**. The CLI reads them, previews, then runs **`gh pr create`** from the **repository directory** you launched `pr` from (so the new PR uses **this branch** as the head).

### Output discipline (strict)

- **Only** deliver by **creating** **`Title.md`** and **`Body.md`**. Put every character of the title in **`Title.md`** and every character of the description in **`Body.md`**.
- **Do not** use your final assistant message for PR title, body, or long summaries. **Do not** emit JSON or fenced blocks with the PR payload in chat.
- **Do not** reply with anything substantive after the files are written. If the runtime still expects a final token, use at most a bare acknowledgment (e.g. `done`) with **no** PR content duplicated there.
