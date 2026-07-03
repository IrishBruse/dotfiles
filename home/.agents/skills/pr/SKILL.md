---
name: pr
description: Routes GitHub pull request work to the right PR skill. Use when opening or updating a pull request, or when the user says create PR or update PR.

---

# PR

Run `gh pr view` first. Its result picks exactly one sub-skill to read - read that one only.

1. Run `gh pr view` on the current branch.
2. No PR exists - read `pr-create` and follow it.
3. A PR exists - read `pr-update` and follow it.

The branch you did not take is irrelevant to this run, do not read it.

`pr-create` and `pr-update` share the body layout in `~/.agents/skills/pr/body-format.md`.

`pr-fix` (red CI or unresolved review comments) is not part of `/pr`. Reach for it only when the user asks to fix a PR.
