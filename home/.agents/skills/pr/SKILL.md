---
name: pr
description: >
  Routes GitHub pull request work to the right PR skill.
  Use when opening, updating, or fixing a pull request, or when the user says create PR, update PR, or fix PR CI.
---

# PR

Pick one PR skill, then read its `SKILL.md` and follow it.

- `pr-create` - no PR exists for the branch yet, or the user asks to open one.
- `pr-update` - a PR already exists and its title or body should match the branch now.
- `pr-fix` - CI checks are red or review comments are unresolved on the current PR.

When unsure between create and update, run `gh pr view`: edit the existing PR if one exists, otherwise create.

`pr-create` and `pr-update` share the body layout in `~/.agents/skills/pr/body-format.md`.
