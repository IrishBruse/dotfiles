# Skills linting

Invoke the `skill` CLI directly. Prefer it over hand-checking the same rules.

## Lint after edits

Run once against the skill you changed:

```bash
skill lint <skill-id> --fix
```

Prefer a skill id or name when the skill lives under a standard root
(for example `~/.agents/skills`, `~/.cursor/skills`, or project skill paths).
Ids match `skill ls` entries: nested ids use slashes (`github/pr`), and a
short name matches when it is unique (`jira`).

Use a folder or file path when the skill is not under a standard root:

```bash
skill lint path/to/skill-folder/ --fix
skill lint path/to/SKILL.md --fix
```

`<skill-folder>` is the skill directory you edited.
The command scopes to every `.md` and `.mdc` file there.

Passing the skill entry path lints every markdown file in that skill directory.
A directory path lints that tree.
With no argument, lint scans default skill roots under `~`.

### `--fix`

Auto-applies fixes that can be done safely.
Anything left has to be fixed by hand, then re-run lint.

Typical auto-fixes: block-scalar descriptions, orphan frontmatter lines,
nested reference links, prose semicolons,
and non-ASCII.

### `--show-fixable`

By default, auto-fixable warnings are hidden from lint output.
Pass `--show-fixable` to include them.
Use `skill lint --fix` to apply those fixes instead of only listing them.

### Exit and diagnostics

- Exit `0`: clean.
- Exit `1`: warnings or errors remain. Report every stderr diagnostic before finishing.

Diagnostics look like:

```text
~/skills/demo/SKILL.md
  3:14     warning  Model-invoked descriptions should include when to use the skill.  @skill/description-triggers
```

## List skills

```bash
skill ls
```

Scans global roots under `~` (for example `~/.agents/skills`, `~/.cursor/skills`)
and skills.sh-compatible project paths.
`~/.cursor/skills-cursor` is omitted unless you pass `--cursor-builtin`.

Exit `1` when no skills are found.

## Help

```bash
skill --help
skill lint --help
```
