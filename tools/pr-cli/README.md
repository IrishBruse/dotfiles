# pr-cli

Launches [Cursor Agent](https://cursor.com) (`agent`) with injected markdown under **`skills/`**: **review** (`skills/review.md`) for every PR review flow, and **open PR** (`skills/create.md` + `gh pr create`) for **`pr open`** (same flow as **`pr add`**, **`pr new`**, and **`pr create`**). Requires **`gh`** and **`agent`** on `PATH`, and Node **24+**.

## Install

```bash
cd tools/pr-cli
npm install
npm link          # optional: global `pr` on PATH
```

Run without linking:

```bash
node /path/to/dotfiles/tools/pr-cli/bin/pr.js …
```

## Global flags

These apply to all subcommands. Order: flags first, then the PR or ticket (if any), then `--` and extra `agent` flags.

For **`pr open`** / **`pr add`** / **`pr new`** / **`pr create`**, the agent always runs with **`--print`** (a `-p` flag is redundant); after the run you get a TTY preview and **ENTER** runs **`gh pr create`** or **ESC** cancels.

| Flag | Meaning |
|------|---------|
| `-h`, `--help` | Print usage and exit |
| `-p`, `--print` | Pass `--print` to `agent` (non-interactive; not used for create-PR command capture) |
| `-w DIR`, `--workspace DIR` | Pass `--workspace DIR` to `agent` (default: current directory) |
| `-- …` | Everything after `--` is forwarded to `agent` before the generated prompt |

### Forwarding options to `agent`

```bash
pr 42 -- --model sonnet-4
pr review 42 -- --model gpt-5 --sandbox disabled
pr update --print 99 -- --trust
pr open -- --model sonnet-4
pr create -- --model sonnet-4
```

### Workspace other than cwd

```bash
pr -w ~/src/myrepo 12
pr review -w ~/src/myrepo 12
pr update -w ~/src/myrepo 12
pr open -w ~/src/myrepo
pr new -w ~/src/myrepo NOVACORE-456
```

### Non-interactive (`--print`)

```bash
pr -p 42
pr review -p 42
pr update -p 42
```

(`pr open` / `add` / `new` / `create` always use agent `--print` for capture; `-p` is not needed.)

### Help

```bash
pr -h
pr --help
```

## Environment

| Variable | Effect |
|----------|--------|
| `PR_TITLE_JIRA_KEY` | e.g. `NOVACORE`. For **review** with a PR: CLI checks the existing PR title matches `^KEY-\d+` before starting `agent`. Also injected into review and open prompts. |
| `XDG_STATE_HOME` | If set, review state is stored under `$XDG_STATE_HOME/pr-cli/last-head.json`; otherwise `~/.local/state/pr-cli/last-head.json`. |

Examples:

```bash
PR_TITLE_JIRA_KEY=NOVACORE pr 42
PR_TITLE_JIRA_KEY=NOVACORE pr review https://github.com/org/repo/pull/42
PR_TITLE_JIRA_KEY=NOVACORE pr open
PR_TITLE_JIRA_KEY=NOVACORE pr open NOVACORE-789
```

## Default command: `pr` (auto add vs update)

Uses `gh pr view` when you pass a PR. Compares `headRefOid` to the last successful run in state file; then starts `agent` with **`skills/review.md`** (review-and-approve style: verdict + merge readiness). Same skill as **`pr review`** / **`pr update`**.

### No PR (agent picks from `gh pr list`)

```bash
pr
pr -p
pr -w ~/src/myrepo
pr -w ~/src/myrepo -p
```

### PR as number (current repo)

```bash
pr 42
pr -p 42
pr -w ~/src/myrepo 42
pr 42 -- --model sonnet-4
```

### PR as `owner/repo#number`

```bash
pr myorg/myrepo#99
pr -p myorg/myrepo#99
```

### PR as GitHub URL (normalized internally)

```bash
pr https://github.com/org/repo/pull/3
pr https://www.github.com/org/repo/pull/3/files
pr https://github.com/org/repo/pull/3?tab=files
pr github.com/org/repo/pull/3
pr '(https://github.com/org/repo/pull/3/files)'
```

### Flags before / after PR (only valid order: flags, then one PR token)

```bash
pr -p -w ~/r 7
pr -w ~/r -p 7
```

## First-pass review: `pr review`

Same as default review, but **first-pass** is forced (no auto add/update from state). With a PR, `gh pr view` must succeed first.

```bash
pr review
pr review 42
pr review -p 42
pr review -w ~/src/myrepo 42
pr review https://github.com/org/repo/pull/42 -- --model sonnet-4
```

## Follow-up review: `pr update`

Forces **update**-style review. Same **`skills/review.md`** and verdict / merge-readiness expectations.

```bash
pr update
pr update 42
pr update -p 42
pr update -w ~/src/myrepo 42
pr update https://github.com/org/repo/pull/42
```

## Open PR from branch: `pr open` (aliases: `add`, `new`, `create`)

Use when there is **no PR yet** for the current branch: injects `skills/create.md` (Jira MCP, `git diff origin/main`, template, etc.). The agent is run **headlessly** (`--print`); it must end with a single fenced code block tagged `json` containing `{"title":"…","body":"…"}` (`body` is markdown). The CLI prints title and body, then waits for **ENTER** to run **`gh pr create --title … --body-file …`** or **ESC** to abort. Requires an **interactive TTY** for that step.

Optional **one** positional: Jira key or ticket id string.

```bash
pr open
pr add -w ~/src/myrepo
pr new NOVACORE-123
pr create -w ~/src/feature-branch NOVACORE-456
pr open -- --model sonnet-4
pr create NOVACORE-123 -- --model sonnet-4
```

## Combinations cheat-sheet

```bash
# Auto review, print mode, other repo, agent model
pr -p -w ~/src/app https://github.com/acme/app/pull/10 -- --model sonnet-4

# Force first-pass review with Jira title rule on existing PR
PR_TITLE_JIRA_KEY=NOVACORE pr review 55

# Force follow-up review
PR_TITLE_JIRA_KEY=NOVACORE pr update 55

# Open PR from branch (create skill), with ticket hint and title policy in prompt
PR_TITLE_JIRA_KEY=NOVACORE pr new NOVACORE-999 -w ~/src/app
```

## Skills on disk

| File | Used by |
|------|---------|
| `skills/review.md` | `pr`, `pr review`, `pr update` |
| `skills/create.md` | `pr open`, `pr add`, `pr new`, `pr create` |

## Prompt templates (`prompts/`)

Outer agent prompts load **`prompts/review.md`** or **`prompts/create.md`** and substitute **`{{name}}`** placeholders (for example `{{skillBody}}`, `{{mission}}`). Variable prose for PR context, missions, hints, and Jira rules is assembled in code; only the shared framing lives in those two files.

## State (review auto mode only)

After `agent` exits **0**, the CLI stores `owner/repo#PR` → `headRefOid` for the PR you reviewed. Next default `pr <same>` chooses **update** if `head` changed, **add** with a short hint if unchanged, **add** on first run for that key. **`pr open`** / **`add`** / **`new`** / **`create`** do not read or write this file.
