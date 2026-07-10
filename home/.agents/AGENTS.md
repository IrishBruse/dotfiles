# Agents

## Skills

Skills live at `~/.agents/skills/<name>/SKILL.md` (repo source: `home/.agents/skills/<name>/SKILL.md` after stow).
Each skill has YAML frontmatter with at least `name` and `description`.

### Description field

The `description` is how the agent decides whether to apply a skill. Write it in third person and cover both:

1. **What** the skill does (specific capabilities)
2. **When** to use it (trigger scenarios and keywords the user might say)

Good:

```yaml
description: Creates a new GitHub pull request with title and body from the current branch. Use when opening a PR or when the user asks to create a pull request.
```

Avoid descriptions that only say when to use the skill, only say what it does, or use second person ("you can use this to...").

Optional frontmatter: `paths` (glob patterns to scope the skill to matching files), `disable-model-invocation: true` (only load when explicitly invoked via `/skill-name`), and `metadata`.

## Atlassian access

Agents use the `jira` and `confluence` CLIs or **Atlassian MCP** for live Jira and Confluence data and writes.

- Never run `acli` or other Atlassian shell wrappers.
- The `atlassian-cli` skill documents the CLIs and how MCP maps to each need.
- Jira ticket workflow gates live in the `jira` skill under `~/.agents/jira/`.
