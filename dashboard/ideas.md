# Dashboard ideas

Proposals from a review of ~96 dotfiles agent sessions (Jun 3 through Jun 25, 2026) plus recent work in design-to-code-shell and ui-platform-workspace.

The dashboard already covers two strong daily loops: Jira tickets and local dev ports.
The logs show several other recurring loops that are not surfaced yet.

## What agent work looks like

| Theme | Frequency | Example from logs |
|-------|-----------|-------------------|
| Dotfiles / CLI tooling | Very high | `memory`, `sprint`, `cron`, `start`, `endpoint`, skills authoring |
| Jira sync reliability | High (recent spike) | Cron not running, `acli` auth failures, "where are cron logs" |
| PR / CI triage | High (design-to-code) | Speed up SAM deploy, fix Sonar, review Actions runs |
| Skills and memory | Medium | docsify skill, memory `rm`, skill newline fixes |
| Sprint context | Medium | Sprint CLI, ticket scoping, NOVACORE tickets |
| Auth / tokens | Medium | `ARTIFACT_AUTH_TOKEN`, SSO refresh |
| Agent session continuity | Emerging | "Review agent logs" |

The dashboard is strong on **read Jira** and **manage local ports**.
It is weak on **operational health**, **PR/CI state**, and **agent workflow glue**.

---

## Proposed additions (ranked)

### 1. Sync health strip (highest ROI)

Jira sync / cron issues show up repeatedly in agent logs.
Extend the existing Jira widget header (or add a thin strip above it) with:

- **Last sync time** (max mtime of `~/.agents/skills/jira-board/references/**/*.md` or a small `sync-state.json` written by `jira sync`)
- **Stale warning** if older than cron interval (e.g. >6h)
- **Last error** from cron log or last failed sync
- **Auth hint** when error matches `unauthorized` / `acli ... auth login`

Keeps the existing **Sync** button.
Surfaces the failure mode before opening Cursor and wondering why the board is empty.

**Plugin:** extend `jira-board` with `GET /api/jira/health`.

---

### 2. Sprint context bar

`sprint` CLI and NOVACORE sprint work are constant.
The board has ticket data but no sprint framing.

Add a compact top-center bar (or Jira widget subtitle):

```
Sprint 147 · Jun 16 - Jun 29 · 4 days left
```

Reuse `tools/sprint/sprint.ts` logic in a small Vite plugin or import from tools.
Click opens a `/sprint` page or copies sprint dates.

Low effort, high context every morning.

---

### 3. Open PRs widget

A large share of design-to-code work is PR + Actions triage.
A bottom-center or right-side widget (alongside ports):

| Repo | PR | CI | Updated |
|------|----|----|---------|
| design-to-code-shell | NOVACORE-44310: ... | failing | 2h ago |
| ui-platform-workspace | ... | passing | 1d ago |

Data: `gh pr list --author @me --json number,title,url,headRefName,updatedAt` per watched repo, plus `gh pr checks` or `gh run list` for status.

Matches the actual workflow: open dashboard, see red CI, jump to the run.

**Plugin:** `open-prs` with configurable repo list in `~/.config/dashboard/repos.json`.

---

### 4. Recent agent sessions panel

A center or left widget listing last ~10 Cursor sessions:

- First user message (truncated)
- Project (dotfiles, design-to-code-shell, etc.)
- Date
- Optional: inferred topic tag (jira, pr/ci, skill, keybind)

Data: read `~/.cursor/projects/*/agent-transcripts/*/*.jsonl`.
No new tooling needed.

Could add **"Resume topic"** copy: paste the first query back into Cursor.

Turns the dashboard into a **session inbox**, not just a start page.

---

### 5. Memory peek widget

Small widget showing:

- Latest 3-5 entries for repos that matter (`dotfiles`, `design-to-code-shell`, `ui-platform-workspace`)
- Global lessons count
- Link to `memory view` output or a `/memory` page

Reads `~/.agents/memory/**/*.json` via a `memory-board` plugin.
Reuses existing memory scope logic.

---

### 6. Skills quick index

Many skills live under `~/.agents/skills/` and `~/.cursor/skills-cursor/`.
Add to command palette (and optionally a `/skills` page):

- Search skill names and descriptions from each `SKILL.md` frontmatter / first heading
- Open skill path in editor (`cursor://` or `vscode://file/...`)

Fits the pattern of manually attaching skills in ui-platform sessions.
Finding the right skill faster reduces friction.

---

### 7. Cron status widget

`dotfiles cron` and `home/.config/cron/jobs.cron` exist but debugging cron was painful.

Widget showing:

- Installed jobs (parsed from `jobs.cron`)
- Whether managed block is in crontab (`crontab -l` grep)
- Tail of last run log (if jobs write to `~/.local/log/cron/jira-sync.log` or similar)

Pair with proposal #1 so Jira sync health is end-to-end visible.

---

### 8. Endpoint request tail

The `endpoint` tool is for local HTTP catch-all debugging.
When an endpoint process is listening (piggyback on `local-ports`):

- Tail last N lines from the JSONL log file
- Show `GET /foo`, `POST /bar` in a small live panel

Useful when prototyping webhooks or MFE bootstrap issues.

---

### 9. Command palette extensions

Extend the palette beyond Home / Jira / tickets:

| Query type | Action |
|------------|--------|
| `pr:` or open PR title | Jump to PR URL |
| `skill:docsify` | Open skill file |
| `mem:incremental` | Show memory entry |
| `sprint` | Show current sprint block |
| `port:54321` | Focus ports widget row |

Keeps the dashboard minimal while making it the universal launcher.

---

### 10. Full pages (second phase)

If widgets get crowded, add routes:

| Route | Purpose |
|-------|---------|
| `/prs` | All open PRs, filters, CI deep links |
| `/agents` | Full session history with search |
| `/memory` | Browse scoped lessons (lighter than terminal `memory` TUI) |
| `/skills` | Skill catalog |
| `/health` | Cron, sync, token expiry, dotfiles stow drift |

---

## Suggested layout

```
+----------------------------------------------------------+
|  [Cmd+K] Command palette                                  |
|              Sprint 147 · Jun 16-29 · 4d left             |
+----------------------------------------------------------+
|                                                          |
|     [ Recent agent sessions - optional center column ]    |
|                                                          |
+---------------+                              +-----------+
| Jira (+ sync  |                              | Local     |
| health)       |                              | ports     |
+---------------+                              +-----------+
| Open PRs (new)|                              | Memory    |
|               |                              | peek (new)|
+---------------+                              +-----------+
```

---

## Build first

Smallest set with the biggest impact on actual logs:

1. **Sync health strip** (fixes a recurring pain)
2. **Sprint bar** (trivial, always useful)
3. **Open PRs widget** (matches design-to-code work volume)
4. **Recent agent sessions** (session continuity)

Items 5-9 can follow without restructuring the app.

---

## Implementation notes

All of these fit existing patterns:

- Vite plugins + `GET /api/*` middleware (like `jira-board`, `local-ports`)
- `homedir()` paths to `~/.agents/`, `~/.cursor/`
- Reuse `jira-list-row` / `dashboard-*` CSS classes
- VS Code theme tokens only
- Dev-only APIs where shelling out to `gh` / `crontab` is needed

The main new config surface would be a small `~/.config/dashboard/config.json` for watched repos and cron log paths.
