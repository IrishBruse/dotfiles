---
name: pr
description: >-
  Automates Pull Request creation from the branch (Jira, template, gh). Prefer
  the dotfiles pr-cli (`pr open`, or `pr add` / `pr new` / `pr create`, tools/pr-cli); it injects tools/pr-cli/skills/create.md.
disable-model-invocation: true
---

Full workflow: `tools/pr-cli/skills/create.md` in this repository (injected by `pr open` and aliases).

```bash
cd tools/pr-cli && npm install && npm link
pr open              # same flow: pr add | pr new | pr create; optional ticket, e.g. NOVACORE-123
```
