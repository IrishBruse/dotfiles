# Skills lint rules

Markdown lint rules for the `skills lint` command. Each rule lives in a category folder under `tools/skills/rules/`.
Rules encode [writing-great-skills](~/.agents/skills/writing-great-skills/SKILL.md) conventions and `global.mdc` prose style.

## Usage

```bash
skills lint                         # scan default skill roots
skills lint path/to/skill-folder/   # scope to one skill tree
skills lint path/to/SKILL.md --fix  # auto-fix, then report remaining issues
```

Diagnostics use compiler-style output: `file:line:column - severity code: message`.
Exit code 1 when any warnings or errors remain.

## Layout

```
rules/
  core/         Shared types, helpers, and skill-folder context
  engine/       Orchestration (run all rules, apply fixes, format output)
  frontmatter/  SKILL.md YAML frontmatter
  prose/        Body prose style (global.mdc)
  paths/        File and skill path conventions
  reference/    Progressive disclosure and reference-file structure
  budget/       SKILL.md size limits
```

Co-locate each rule with its tests: `rule-name.ts`, `rule-name.test.ts`, and optionally `rule-name.fix.ts` + `rule-name.fix.test.ts`.

## Engine

| File | Role |
| --- | --- |
| `engine/run.ts` | Runs every rule, merges diagnostics, sorts by line/column |
| `engine/fix.ts` | Applies safe auto-fixes in a fixed order, then re-lints |
| `engine/format.ts` | Prints diagnostics and summary to stderr |
| `engine/color.ts` | Terminal color for lint output |
| `engine/discover.ts` | Re-exports skill discovery helpers from `skills/discover.ts` |

`engine/run.ts` is the only place that imports rules. Add new rules there.
`engine/fix.ts` is the only place that imports fixers.

### Auto-fix pipeline

`skills lint --fix` runs fixers in this order:

1. `frontmatter/description-block.fix` - block scalars (`>`, `|`) to plain quoted strings
2. `frontmatter/frontmatter-description.fix` - merge orphan/indented description lines, wrap long descriptions
3. `paths/home-repo-paths.fix` - `home/.agents/...` to `~/.agents/...`
4. `prose/prose-semicolons.fix` - `word; next` to `word, next` in prose
5. `prose/em-dash.fix` - em dashes to hyphens or commas
6. `prose/non-ascii.fix` - common Unicode punctuation to ASCII
7. `reference/nested-references.fix` - `[text](file.md)` to `` `file.md` `` in reference files
8. `reference/reference-toc.fix` - insert `## Contents` in long reference files
9. `prose/long-lines.fix` - wrap prose over 160 characters

Rules without a `.fix.ts` counterpart are lint-only.

### Skill-folder context

Several reference rules need the full skill tree, not just the current file.
`commands/lint.ts` builds a `LintContext` per skill root (`core/context.ts`) with:

- `skillRoot` - directory containing `SKILL.md`
- `relativeFiles` - every file under the skill folder
- `markdownContents` - relative path to content for each `.md`/`.mdc` file
- `skillMdContent` - `SKILL.md` body when available

Pass `LintContext` (not just a path string) to `lintSkillContent` for rules that resolve links, scripts, or orphans.

## Groups

### core/

Shared infrastructure. Not lint rules themselves.

| File | Purpose |
| --- | --- |
| `types.ts` | `Diagnostic` type, severity helpers |
| `shared.ts` | `MAX_LINE` (160), `isSkillMd`, frontmatter extraction, prose line iteration |
| `fix-shared.ts` | YAML quoting, line mapping, inline-code-aware text replacement |
| `context.ts` | `LintContext`, link resolution, `buildLintContexts` |

### frontmatter/

Rules for `SKILL.md` YAML frontmatter only.

| Code | Severity | Fix | Rule |
| --- | --- | --- | --- |
| `frontmatter-orphan` | error | yes | Lines after `description:` that are not valid key/value pairs |
| `frontmatter-description` | error | yes | Invalid description format (indented continuations, empty) |
| `frontmatter-name` | error | | Missing, empty, overlong, or invalid `name` |
| `description-block` | warning | yes | `description` uses YAML block scalar (`>`, `|`) |
| `description-triggers` | warning | | Model-invoked skills missing "Use when..." in description |
| `description-voice` | warning | | Second-person description ("I can help", "You can use this") |
| `vague-skill-name` | warning | | Generic names like `helper`, `utils` |
| `name-folder-mismatch` | error | | `name` must match the skill folder name |

### prose/

Body prose style. Applies to all markdown files unless noted. Skips fenced code blocks.

| Code | Severity | Fix | Rule |
| --- | --- | --- | --- |
| `long-line` | warning | yes | Prose lines over 160 characters |
| `prose-semicolon` | warning | yes | `word; next` in English prose (prefer commas) |
| `non-ascii` | warning | yes | Non-ASCII characters outside code |
| `em-dash` | warning | yes | Em/en dashes in prose |
| `generic-advice` | warning | | Vague filler ("handle errors appropriately", "as needed") |
| `tool-menu` | warning | | Multiple equal-weight tool options without a default |
| `negation-steering` | warning | | `SKILL.md` only: "Do not..." without paired positive guidance |
| `time-sensitive` | warning | | Dated guidance that will go stale |

### paths/

Path conventions in prose.

| Code | Severity | Fix | Rule |
| --- | --- | --- | --- |
| `home-repo-path` | warning | yes | `home/.agents/...` instead of runtime `~/.agents/...` |
| `windows-path` | warning | | Backslash file paths |
| `skill-by-path` | warning | | Reference skills by `` `skill-name` ``, not file path |

### reference/

Progressive disclosure and reference-file structure. Most rules skip `SKILL.md`.

| Code | Severity | Fix | Rule |
| --- | --- | --- | --- |
| `nested-reference` | warning | yes | `.md` links between reference files (link from `SKILL.md` only) |
| `reference-toc` | warning | yes | Reference files over 100 lines need `## Contents` near the top |
| `skill-backlink` | warning | | Reference files must not link or point back to `SKILL.md` |
| `orphan-reference` | warning | | Every `references/*.md` must be linked from `SKILL.md` |
| `vague-pointer` | warning | | `SKILL.md` only: "see references" without naming a specific file |
| `broken-link` | error | | Relative markdown/script links must resolve in the skill folder |
| `missing-script` | error | | `scripts/...` references must exist on disk |

### budget/

`SKILL.md` size limits.

| Code | Severity | Fix | Rule |
| --- | --- | --- | --- |
| `skill-length` | error | | `SKILL.md` over 500 lines |
| `skill-token-budget` | warning | | `SKILL.md` body over ~5000 estimated tokens |

## Adding a rule

1. Pick the category folder (or add a new one if the concern is genuinely distinct).
2. Export `lint(content, filePathOrContext?)` returning `Diagnostic[]` from `core/types.ts`.
3. Add co-located `rule-name.test.ts`.
4. Register the rule in `engine/run.ts`.
5. If auto-fixable, add `rule-name.fix.ts`, `rule-name.fix.test.ts`, and register in `engine/fix.ts`.
6. Document the code in [writing-great-skills](~/.agents/skills/writing-great-skills/SKILL.md) under **Lint rules**.

Convention for rule files:

- One diagnostic code per file (matches the filename).
- Use `isSkillMd(filePath)` when the rule applies only to `SKILL.md`.
- Use `forEachProseLine` from `core/shared.ts` for line-by-line prose checks.
- Use `LintContext` when resolving paths relative to a skill folder.
- Fixers are idempotent: running `--fix` twice should not keep changing the file.

## Tests

```bash
cd tools
node --test skills/rules/**/*.test.ts skills/commands/lint.test.ts
```
