# Paths

Rules for how file and skill paths appear in prose.
There are no auto-fixers here. Rewrite the path by hand.

## `windows-path`

Use forward slashes in file paths.

Backslash paths look like Windows paths and break on Unix tools the agent
often runs. Prefer `foo/bar`.

### Incorrect

```markdown
Open `src\config\settings.json` and update the port.
```

### Correct

```markdown
Open `src/config/settings.json` and update the port.
```

## `skill-by-path`

Reference other skills by name, not by filesystem path.

Paths like `~/.agents/skills/foo/SKILL.md` or `.cursor/skills/foo` tie the
skill to one machine layout. Backtick the skill name instead so any
checkout can resolve it.

### Incorrect

```markdown
After the PR is open, follow ~/.agents/skills/pr/SKILL.md.
```

### Correct

```markdown
After the PR is open, follow `pr`.
```

## Related

Both rules report at most three diagnostics per file.

Further reading:

- [File references](https://agentskills.io/specification#file-references):
  use relative paths from the skill root, not machine-specific layouts
