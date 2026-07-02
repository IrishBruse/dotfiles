# dotfiles

Personal machine config and small TypeScript CLIs.

`home/` mirrors `~` - shell, Hyprland, Cursor, VS Code settings, and related dotfiles, stowed into the real home directory via the `dotfiles` CLI.

`linux/` holds Linux Mint bootstrap: `apt.csv` (generated on workspace open), `flatpaks.csv`, and workspace-open sync (`open.ts`).

`macos/` holds Homebrew `Brewfile` and workspace-open sync (`open.ts`), including the `/jira` agent skill from ui-platform-workspace.

`tools/` is a shared Node package of command-line helpers for Jira, GitHub PRs, sprint dates, markdown, and agent workflows.

`dashboard/` is a local browser start page (React + Vite) with dashboard search and a Jira board widget.
Run `npm run dev`, `build`, or `preview` from that directory.

`vscode/` holds generated keybindings and custom UI theme CSS.

