# Dotfiles

### home/

Files here mirror `~` and are manually stowed by the user. You can assume that any path in this will be mirrored to its `~/` equivalent.

In docs and tool code, use the **runtime** path under `~/`, not the repo path under `home/`.

### home/.config/Code/User/settings.json

Linux vscode settings

### home/Library/Application Support/Code/User/settings.json

Macos vscode settings

### vscode/keybindings

TypeScript and JSON used to generate VS Code keybindings.
`gen.ts` is running in a watcher skip running.

### Skills

Agent skills live in two stowed locations under `home/`, mirrored to `~/`.

- `home/.agents/skills/` -> `~/.agents/skills/` - general-purpose, cross-project skills
- `home/.cursor/skills/` -> `~/.cursor/skills/` - **Work only skills**

Group related skills under category folders.
User-invoked skills (`disable-model-invocation: true`) live under a `_command/`
folder: top-level `_command/<skill>` for meta skills, or
`<category>/_command/<skill>` when they belong to a domain category.
Nesting can be deeper, discovery walks until it finds a `SKILL.md`.

**Hard rule:** the `jira` skill (`home/.agents/skills/atlassian/jira/`) must stay generic.
Do not mention the `jira` CLI, `acli`, Atlassian MCP, or any other CLI or MCP in that skill or its references.
CLI and MCP usage belongs in other skills and rules (`jira-cli`, workspace rules). Keep `/jira` skill routes and `~/jira` local paths.