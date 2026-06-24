# Homepage

Local start page Vite app (React + TypeScript).
Run `npm run dev`, `build`, or `preview` from this directory.

## Theme

Colors come from the user's VS Code settings, not hardcoded palettes.

The `vscode-theme` Vite plugin reads `workbench.colorCustomizations` and markdown token colors from `~/.config/Code/User/settings.json` (macOS: `~/Library/Application Support/Code/User/settings.json`).
It injects them as CSS custom properties on `:root`.

Import `virtual:vscode-theme.css` in `src/style.css`.
Keys use dots replaced by hyphens: `editor.background` becomes `--vscode-editor-background`.

Always reference theme tokens in CSS.
Use fallbacks that match the One Dark Pro-style defaults in settings when a variable might be missing.

## Typography

- Font stack: `"Cascadia Code", system-ui, sans-serif` on `:root`.
- Body text: `0.8125rem` (13px) for list rows and panel content.
- Section labels: `0.6875rem` (11px), uppercase, `letter-spacing: 0.06em`, `font-weight: 700`.
- Group headings (Jira list): `0.7rem`, uppercase, `letter-spacing: 0.06em`, `font-weight: 600`.

## Color roles

| Role | Token | Typical use |
|------|-------|-------------|
| Page background | `--vscode-editor-background` | Main surfaces, Jira workspace |
| Body text | `--vscode-editor-foreground` | Summaries, markdown, default text |
| Muted text | `--vscode-descriptionForeground` | Meta labels, empty states, dock hints |
| Links and keys | `--vscode-textLink-foreground` | Ticket keys, nav links, section titles |
| Link hover | `--vscode-textLink-activeForeground` | Hovered links |
| Panel border | `--vscode-panel-border` or `--vscode-editorWidget-border` | Dividers between panes |
| Section header | `--vscode-sideBarSectionHeader-background` + `-border` | Widget and sidebar-style headers |
| List hover | `--vscode-list-hoverBackground` | Row hover |
| List selection | `--vscode-list-activeSelectionBackground` | Active ticket row |
| Focus ring | `--vscode-focusBorder` | Input focus, active row accent |
| Inputs | `--vscode-input-background`, `-border`, `-foreground` | Search fields |
| Errors | `--vscode-errorForeground` | Sync failures, validation |
| Primary button | `--vscode-button-background`, `-foreground`, `-hoverBackground` | Main actions (Sync, Commit-style) |
| Secondary button | `--vscode-button-secondaryBackground`, `-secondaryForeground`, `-secondaryHoverBackground` | Lower-emphasis actions |
| Toolbar actions | `--vscode-icon-foreground` on `--vscode-toolbar-hoverBackground` | Borderless icon buttons |

## Buttons

Primary actions use the VS Code Commit button pattern (green fill, white label).

- Background: `--vscode-button-background` (`#35a854` fallback).
- Text: `--vscode-button-foreground` (`#ffffff` fallback).
- Hover: `--vscode-button-hoverBackground` (`#35974f` fallback).
- `border-radius: 2px`, no border, `font-weight: 600`.
- Disabled: `opacity: 0.6`, default cursor.

Secondary actions use `--vscode-button-secondary*` tokens with the same shape.

Toolbar/icon-only controls stay borderless on `--vscode-toolbar-hoverBackground`.

## Layout

- Flat panels: no `border-radius` on cards or panes, no drop shadows.
- Borders are 1px solid panel/widget border tokens.
- Full-height layouts use `height: 100%` on `html`, `body`, `#app` and flex/grid with `min-height: 0` for scroll regions.

## Jira status dots

Fixed semantic colors (not theme tokens):

| Bucket | Class | Color |
|--------|-------|-------|
| Todo | `.dot-todo` | `#9d9d9d` |
| In progress | `.dot-in-progress` | `#cca700` |
| Code review | `.dot-code-review` | `#3794ff` |
| In test | `.dot-in-test` | `#b180d7` |
| Done | `.dot-done` | `#89d185` |

## Component classes

- `home-*` - landing page only (search, Jira widget).
- `jira-*` - shared Jira UI (list rows, detail, markdown, workspace).
- Reuse `jira-list-row`, `jira-list-key`, `jira-list-summary`, and `jira-status-dot` in the widget instead of duplicating row styles.

## Jira widget

Floating card at bottom-left on the home page.

- Container: `editor-background` + `editorWidget-border`.
- Header: `sideBarSectionHeader` background and border; title links to `/jira`.
- Rows: same list row classes as the full board; summaries use `editor-foreground`, keys use `textLink-foreground`.
- Sync: `POST /api/jira/sync` (dev server only) via a primary button (`button-background` / `button-foreground`).

## Dev plugins

- `vscode-theme` - CSS variables from VS Code settings.
- `jira-board` - virtual `jira-board` module from local sprint.json + ticket markdown; HMR on file changes; sync endpoint in dev.
- `duckduckgo-redirect` - `/?q=` redirects to DuckDuckGo.
