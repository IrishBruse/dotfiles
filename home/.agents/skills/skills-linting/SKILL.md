---
name: skills-linting
description: "Lints agent skills with the `skills` CLI. Use when validating with `skills lint`, after editing a SKILL.md, or listing skills with `skills ls`."
user-invocable: false
---

# Skills linting

Invoke the `skills` CLI directly. Prefer it over hand-checking the same rules.

Authoring principles live in `writing-great-skills`. This skill is the lint CLI.

## Lint after edits

Run once against the skill folder you changed:

```bash
skills lint <skill-folder>/ --fix
```

`<skill-folder>` is the directory of the `SKILL.md` you edited.
The command scopes to every `.md` and `.mdc` file there.

Passing a `SKILL.md` path lints every markdown file in that skill directory.
A directory path lints that tree.
With no path, lint scans default skill roots under `~`.

### `--fix`

Auto-applies fixes that can be done safely.
Anything left has to be fixed by hand, then re-run lint.

Typical auto-fixes: block-scalar descriptions, orphan frontmatter lines,
nested reference links, reference TOCs, long prose lines, prose semicolons,
and non-ASCII.

### Exit and diagnostics

- Exit `0`: clean.
- Exit `1`: warnings or errors remain. Report every stderr diagnostic before finishing.

Diagnostics look like:

```text
SKILL.md:12:1 - warning long-line: Line exceeds 160 characters (201).
```

## List skills

```bash
skills ls
```

Scans global roots under `~` (for example `~/.agents/skills`, `~/.cursor/skills`)
and skills.sh-compatible project paths.
`~/.cursor/skills-cursor` is omitted unless you pass `--cursor-builtin`.

Exit `1` when no skills are found.

## Help

```bash
skills --help
skills lint --help
```
