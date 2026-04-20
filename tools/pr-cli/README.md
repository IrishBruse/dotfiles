# pr-cli

Runs [Cursor Agent](https://cursor.com) (`agent`) with markdown prompts from this package (`prompts/review.md` and `prompts/open.md`). Needs **`gh`** and **`agent`** on `PATH`, and Node **24+**.

## Install

```bash
cd tools/pr-cli
npm install
npm link
```

Run without linking: `node /path/to/tools/pr-cli/bin/pr.js …`

## Flag

| Flag           | Description                                 |
| -------------- | ------------------------------------------- |
| `-h`, `--help` | Print usage to stderr and exit with code 2. |

You can pass `-h` or `--help` as the first argument, or after a subcommand (e.g. `pr review --help`). Any other option starting with `-` is rejected.

## Forwarding to `agent`

Put `--` after the PR or ticket (if any). Everything after `--` is passed to `agent` before the generated prompt, for example: `pr 42 -- --model sonnet-4`.

## Environment

| Variable            | Description                                                                                                                                                                                                                             |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PR_TITLE_JIRA_KEY` | Optional project key (e.g. `NOVACORE`). When set and you pass a PR for a review command, the CLI checks the PR title starts with `KEY-<digits>` before starting `agent`. The same variable is reflected in the prompts for title rules. |

Review auto add/update state is always stored at **`~/.local/state/pr-cli/last-head.json`** (created on first successful review).

## Commands

### `pr` (default)

**What it does:** Review flow using `prompts/review.md`. If you pass a PR, `gh pr view` runs in the **current working directory**; the CLI compares `headRefOid` to the last successful run in the state file and chooses an **add**-style or **update**-style mission. If you omit the PR, the agent is supposed to use `gh pr list` per the prompt.

**Forms:**

- `pr` — no PR; agent picks from listed PRs.
- `pr <pr>` — PR as number, `owner/repo#n`, or GitHub PR URL (normalized like the old CLI).

**State:** On success (exit 0), stores `owner/repo#PR` → `headRefOid` for the PR you reviewed. Create-PR commands do not use this file.

---

### `pr review`

**What it does:** Same review prompt as default `pr`, but **always** first-pass style (no add/update choice from state).

**Form:** `pr review [<pr>]` — optional PR token; with a PR, `gh pr view` must succeed first.

**Aliases:** none (only `review`).

---

### `pr update`

**What it does:** Same `prompts/review.md` path, but **always** follow-up / update-style mission (no state-based add vs update).

**Form:** `pr update [<pr>]`

---

### `pr open`

**What it does:** Create-PR flow: loads `prompts/open.md`, runs `agent` with `--print`, expects a final fenced `json` block with `title` and `body`, prints a TTY preview, then **Enter** runs `gh pr create` or **Esc** cancels. Requires an interactive TTY for that step.

**Form:** `pr open [<jira-key>]` — at most one optional ticket hint (e.g. `NOVACORE-123`).

**Aliases:** `pr add`, `pr new`, and `pr create` behave the same as `pr open`.

---

## Prompt files

| File                | Used by                                    |
| ------------------- | ------------------------------------------ |
| `prompts/review.md` | `pr`, `pr review`, `pr update`             |
| `prompts/open.md`   | `pr open`, `pr add`, `pr new`, `pr create` |
