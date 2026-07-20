# Skills lint rules

`skills lint` checks agent skill markdown the way ESLint checks JavaScript:
each rule has a stable code, a severity, and (sometimes) an auto-fix.

Rules live under `tools/skills/rules/`, grouped by what they care about.
This page is the index. Each category folder has its own README with
incorrect / correct examples for every rule.

## Getting started

```bash
skills lint                         # scan default skill roots under ~
skills lint path/to/skill-folder/   # one skill tree
skills lint path/to/SKILL.md --fix  # apply safe fixes, then report the rest
```

Diagnostics look like ESLint:

```text
~/skills/demo/SKILL.md
  12:1  warning  Line exceeds 160 characters (201).  @skills/long-line
```

Exit code is `1` when any warning or error remains.

## Categories

| Category | What it covers |
| --- | --- |
| [frontmatter](frontmatter/README.md) | `SKILL.md` YAML: `name`, `description`, shape |
| [prose](prose/README.md) | Body text: line length, punctuation, filler |
| [paths](paths/README.md) | How file and skill paths are written |
| [reference](reference/README.md) | Linked reference files, scripts, orphans |
| [budget](budget/README.md) | `SKILL.md` length and token limits |
| [core](core/README.md) | Shared types and helpers (not rules) |
| [engine](engine/README.md) | How rules are run and fixed |

## Rule reference

| Code | Severity | Fixable | Category | Summary |
| --- | --- | --- | --- | --- |
| `frontmatter-orphan` | error | yes | frontmatter | Frontmatter lines that are not `key: value` |
| `frontmatter-description` | error | yes | frontmatter | Empty or broken `description` field |
| `frontmatter-name` | error | | frontmatter | Missing or invalid `name` |
| `description-block` | warning | yes | frontmatter | Block scalar (`>` / `\|`) for `description` |
| `description-triggers` | warning | | frontmatter | Model-invoked skill missing "use when/for" |
| `description-voice` | warning | | frontmatter | Second-person phrasing in the description |
| `vague-skill-name` | warning | | frontmatter | Generic names like `helper` or `utils` |
| `name-folder-mismatch` | error | | frontmatter | `name` does not match the skill folder |
| `long-line` | warning | yes | prose | Prose line longer than 160 characters |
| `prose-semicolon` | warning | yes | prose | Semicolon joining English clauses |
| `non-ascii` | warning | yes | prose | Non-ASCII characters in prose |
| `em-dash` | warning | yes | prose | Em or en dashes in prose |
| `generic-advice` | warning | | prose | Filler phrases like "best practices" |
| `tool-menu` | warning | | prose | "use A, B, or C" without a default |
| `negation-steering` | warning | | prose | "Do not / Never" without what to do instead |
| `time-sensitive` | warning | | prose | Dated guidance that will go stale |
| `windows-path` | warning | | paths | Backslash paths in prose |
| `skill-by-path` | warning | | paths | Skill referenced by filesystem path |
| `nested-reference` | warning | yes | reference | Reference file linking to another reference |
| `reference-toc` | warning | yes | reference | Long reference file without a contents list |
| `skill-backlink` | warning | | reference | Reference file pointing back at `SKILL.md` |
| `orphan-reference` | warning | | reference | Reference file never linked from the skill |
| `vague-pointer` | warning | | reference | Vague "see references" without a file or trigger |
| `broken-link` | error | | reference | Relative link that does not resolve |
| `missing-script` | error | | reference | `scripts/...` path that does not exist |
| `skill-length` | error | | budget | `SKILL.md` longer than 500 lines |
| `skill-token-budget` | warning | | budget | Body larger than ~5000 estimated tokens |

## What lint does not check

Lint enforces structure, resolvable paths, and known anti-patterns.
It cannot judge whether a description fires on real prompts, whether the
domain advice is correct, or whether a section is the right level of detail.

For authoring principles beyond what lint can enforce, see `writing-great-skills`.
For running the CLI, see `skills-linting`.

Agent Skills docs:

- [Specification](https://agentskills.io/specification): `name`, `description`,
  progressive disclosure, file references
- [Writing effective descriptions](https://agentskills.io/skill-creation/optimizing-descriptions#writing-effective-descriptions)
- [Testing whether a description triggers](https://agentskills.io/skill-creation/optimizing-descriptions#testing-whether-a-description-triggers)
- [Best practices](https://agentskills.io/skill-creation/best-practices):
  progressive disclosure, defaults over menus, specificity to fragility
- [Using scripts in skills](https://agentskills.io/skill-creation/using-scripts)

## Adding a rule

1. Create `category/rule-name.ts` exporting `lint(content, filePathOrContext?)`.
2. Add `rule-name.test.ts` beside it.
3. Register the rule in [engine/run.ts](engine/run.ts).
4. Optional: add `rule-name.fix.ts` and register it in [engine/fix.ts](engine/fix.ts).
5. Document the rule in the category README and add a row to the table above.

Convention: one diagnostic code per file, matching the filename.
Prefer helpers from [core/shared.ts](core/shared.ts) (`forEachProseLine`, `isSkillMd`).
Use `LintContext` when the rule needs other files in the skill folder.

## Tests

```bash
cd tools
node --test skills/rules/**/*.test.ts skills/commands/lint.test.ts
```
