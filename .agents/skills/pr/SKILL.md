---
name: pr
description: Args [draft,preview,update,new] Use when the user is ready to make a Pull Request
---

# Args

- `new`/`no arg` create a none draft PR
- `draft` only create a draft PR
- `update` update the body and title of the already created PR
- `preview` dont create a pr only create a markdown file with a preview of what the PR will looklike put it in `./PR.md`

# Rules

- Figure out the Jira ticket which should be the first part of the ticket example `NOVACORE-1234 - description...`
- If the repo has a PR template under `.github/` (e.g. `pull_request_template.md`), use it and follow it
- Check **CONTRIBUTING.md** or **docs/** for contribution rules, not only `.github/` templates.
- **Conventional commits** or **merge strategy** (squash vs merge) if the agent should align commit messages.
