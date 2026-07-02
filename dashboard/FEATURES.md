# Dashboard features

Local start page built with React, TypeScript, and Vite.
Dev and preview listen on port `54321`.
Run `npm run dev`, `build`, or `preview` from this directory.

The app has three routes: `/` (landing), `/jira` (full board), and `/versions` (GitHub env versions).
A command palette spans all pages.
Four Vite plugins supply theme colors, Jira data, GitHub version fetching, and local port scanning.

---

## VS Code theme

Colors and typography follow the user's VS Code settings instead of a hardcoded palette.

The `vscode-theme` plugin reads `workbench.colorCustomizations` and markdown token colors from `~/.config/Code/User/settings.json` (macOS: `~/Library/Application Support/Code/User/settings.json`).
It injects them as CSS custom properties on `:root`.
Keys use dots replaced by hyphens: `editor.background` becomes `--vscode-editor-background`.

`src/main.tsx` imports `virtual:vscode-theme.css`.
`src/style.css` references those tokens everywhere.
Fallback values match the One Dark Pro-style defaults when a variable is missing.

Markdown rendering also picks up theme colors.
The plugin maps `markdownInlineEditor.colors.*` and selected TextMate scopes to `--markdown-*` variables for list markers, links, blockquotes, and code spans.

Changes to VS Code settings hot-reload in dev.

---

## Command palette

A fixed search bar at the top of every page.
`Ctrl+K` (`Cmd+K` on macOS) focuses it from anywhere.
On `/jira`, `/` also focuses the bar and clears any existing query.

### Behavior by route

**On `/jira`**

The palette filters the board live.
There is no dropdown.
Typing narrows the ticket list in the left pane.
The placeholder reads "Search or Filter...".

**Elsewhere**

Focus opens a dropdown below the bar.
With an empty query, navigation items appear (Home, Jira board, GitHub versions).
With text, up to eight Jira ticket matches are shown.
Each match shows a status dot, key, and summary.

### Keyboard and interaction

- `ArrowDown` / `ArrowUp` move the highlighted row in the dropdown.
- `Enter` on a highlighted row navigates (nav item or `/jira?ticket=<key>`).
- `Enter` with no row selected but text typed navigates to `/jira`.
- `Escape` clears the query and blurs the input.
- Clicking a dropdown row navigates the same way as `Enter`.
- No backdrop dimming.

State is shared via `CommandPaletteProvider`.
`JiraWorkspace` reads the same `query` to filter tickets.

---

## Landing page (`/`)

The landing page is a minimal shell with three floating widgets.
No other content occupies the main area.

### Versions widget

Bottom-left stack (above Jira), labeled "Versions".

- Header title links to `/versions`.
- **Refresh** button calls `POST /api/github-versions` (dev and preview).
- Tabs switch between repo groups when multiple groups are configured.
- Shows one row per repo in the active group (prod env when configured).
- Rows link to `/versions?group=<id>`.
- Fetches on mount via the same API.

Repo groups are defined in `dashboard/github-versions.json`.

### Jira widget

Bottom-left stack (below versions), labeled "Jira".

- Header title links to `/jira`.
- **Sync** button calls `POST /api/jira/sync` (dev server only).
  On success the widget refreshes its ticket list.
  Errors show inline in `--vscode-errorForeground`.
- Shows up to five tickets in board order (status groups flattened).
- Each row uses shared `jira-list-row` styles: status dot, key link, summary.
- Rows link to `/jira?ticket=<key>`.

Ticket data comes from the virtual `jira-board` module at build/dev time.

### Local ports widget

Bottom-right floating card labeled "Local ports".

- Polls `GET /api/ports` every 3 seconds (dev and preview).
- **Refresh** button triggers an immediate poll.
- Each row shows:
  - Port number as a link to the local URL (`http://127.0.0.1:<port>` when bound to all interfaces).
  - Project folder name (basename of the process cwd).
  - Kill button (bin icon) that sends `POST /api/ports/kill` with `{ pid }`.
- Kill sends `SIGTERM` only to listed dev listeners owned by the current user.
- Empty state: "No dev servers listening".
- Errors (scan or kill failure) show inline.

The `local-ports` plugin uses `lsof` to find TCP listeners and filters to common dev runtimes (node, vite, python, go, etc.).

---

## GitHub versions (`/versions`)

Full-page view of deployed GitHub Environment versions for configured repo groups.

### Configuration

`dashboard/github-versions.json` defines one or more groups.
Each group has:

- `id` and `label` (tab name)
- `org` (GitHub org)
- `environments` (deployment env names, in display order)
- `repos` (deployment repos)
- Optional `devVersionFromRelease` (use latest release tag for dev)
- Optional `compare` map (env name to another env or `"main"` for compare links)
- Optional `infoRepos` (non-deployment repos with `latestRelease` or `workflowBranch` rows)

Example: the default `dynamic-forms` group matches the `dfv` CLI in `dynaform-raptor-utilities`.

The `github-versions` plugin exposes `virtual:github-versions-config` and `GET` / `POST /api/github-versions`.
Requires authenticated `gh` for the configured orgs.

### Layout

- Tab bar switches between groups (`?group=<id>` in the URL).
- Scrollable workspace with one block per deployment repo plus any `infoRepos`.
- Each environment line shows PR link, version, compare link, and relative deploy time.
- Env labels use fixed semantic colors for common names (dev, test, prod, demo).
- **Refresh** button re-fetches all groups.

---

## Jira board (`/jira`)

Full-height split-pane workspace for browsing local Jira tickets.

### Data source

Tickets load from `~/.agents/skills/jira-board/`:

- `sprint.json` defines sprint sections and ticket keys per status bucket.
- Per-ticket markdown under `references/{me,team,unassigned,misc}/<KEY>.md` enriches description, URL, priority, subtasks, and updated time.

If the skill directory is missing, a fixture `sprint.json` is used instead.

The `jira-board` plugin exposes a virtual module `virtual:jira-board` with parsed `BoardTicket[]`.
File changes under the skill directory trigger HMR.

### Layout

- **Left pane**: `TicketList` grouped by status (In Progress, Code Review, In Test, Todo, Done).
- **Right pane**: `TicketDetail` for the selected ticket.

Selection syncs to the URL as `?ticket=<KEY>`.
If the param is missing or invalid, the first visible ticket is selected.
If filtering removes the selected ticket, the param is cleared.

### Ticket list

- Group headings are uppercase status labels.
- Rows are buttons with status dot, key, and summary.
- Active row uses list selection background and focus border.
- Clicking a row updates `?ticket=`.

### Ticket detail

Shows metadata and body for the selected ticket.

**Header**

- Assignee
- Priority (from frontmatter or inferred from issue type)
- Relative updated time (from markdown file mtime)

**Body**

- Description rendered as markdown via `react-markdown`.
  Links open in a new tab.
- Subtasks section when the markdown body contains `- [ ]` / `- [x]` checklist items.
  Shows progress as `Subtasks (done/total)`.

**Footer dock**

Keyboard hint labels: `[Enter] Open`, `[B] Branch`, `[C] Msg`, `[M] Link`.

### Jira keyboard shortcuts

Active on `/jira` when focus is not in the search input (except where noted).

| Key | Action |
|-----|--------|
| `/` | Focus search and clear query |
| `Escape` | Clear search if typing, else navigate to `/` |
| `ArrowDown` / `j` | Select next ticket |
| `ArrowUp` / `k` | Select previous ticket |
| `ArrowDown` (in search) | Blur search and focus selected list row |
| `Enter` | Open ticket URL in a new tab |
| `B` | Copy branch name: `feature/<KEY>-<slugified-summary>` |
| `C` | Copy commit prefix: `feat(<KEY>): <summary>` |
| `M` | Copy markdown link: `[KEY: summary](url)` |

Clipboard actions use `navigator.clipboard.writeText`.

### Search and filter

The command palette query filters tickets by key, summary, description, and status (case-insensitive substring).
Filtered tickets are re-grouped by status bucket.
Empty filter shows all tickets.

---

## Jira sync (dev only)

`POST /api/jira/sync` runs `dashboard/jira-sync.ts` via the `jira-board` plugin middleware.

- Returns `{ ok: true, tickets: [...] }` on success.
- Returns 409 if a sync is already in progress.
- Returns 500 with an error message on failure.
- On success, reloads the virtual board module so all consumers pick up new data.

Used by the Jira widget **Sync** button.
Not available in a static production build (no middleware).

---

## Status dots

Jira status buckets map to fixed semantic colors (not VS Code theme tokens).

| Bucket | Class | Color |
|--------|-------|-------|
| Todo | `.dot-todo` | `#9d9d9d` |
| In progress | `.dot-in-progress` | `#cca700` |
| Code review | `.dot-code-review` | `#3794ff` |
| In test | `.dot-in-test` | `#b180d7` |
| Done | `.dot-done` | `#89d185` |

Used in the Jira widget, command palette results, ticket list, and anywhere else a ticket row appears.

---

## Vite plugins summary

| Plugin | Virtual module / API | Purpose |
|--------|---------------------|---------|
| `vscode-theme` | `virtual:vscode-theme.css` | CSS variables from VS Code settings |
| `jira-board` | `virtual:jira-board` | Sprint + ticket markdown; `POST /api/jira/sync` in dev |
| `github-versions` | `virtual:github-versions-config`, `GET /api/github-versions`, `POST /api/github-versions` | Config-driven GitHub env versions via `gh` |
| `local-ports` | `GET /api/ports`, `POST /api/ports/kill` | List and kill user-owned dev TCP listeners |

---

## UI conventions

See `AGENTS.md` for typography, color roles, button styles, layout rules, and CSS class prefixes (`dashboard-*`, `command-palette-*`, `jira-*`).
