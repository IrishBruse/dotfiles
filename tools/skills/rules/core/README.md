# Core

Shared building blocks for `skills lint`.
This folder does not define lint rules. Rules import from here.

## Types (`types.ts`)

Every rule returns a list of diagnostics:

```ts
interface Diagnostic {
  line: number;
  column: number;
  code: string;
  message: string;
  severity?: "warning" | "error"; // defaults to warning
}
```

`compareDiagnostics` sorts by line, then column.
The engine uses it after merging output from every rule.

## Shared helpers (`shared.ts`)

Common utilities for line-based checks:

| Helper | Use it when |
| --- | --- |
| `MAX_LINE` (160) | Enforcing or wrapping line length |
| `isSkillMd(filePath)` | The rule only applies to `SKILL.md` |
| `extractFrontmatter(content)` | You need the YAML between `---` fences |
| `stripCodeSections(text)` | Matching patterns outside code |
| `forEachProseLine(content, fn)` | Walking non-code-block lines |

Prefer `forEachProseLine` for prose rules.
Prefer `isSkillMd` over hard-coding the filename.

## Fix helpers (`fix-shared.ts`)

Utilities for auto-fixers:

- YAML scalar quoting
- Mapping a diagnostic back to a physical file line
- Replacing text while leaving inline `` `code` `` alone

## Lint context (`context.ts`)

Some rules need the whole skill tree, not just the current file
(broken links, orphans, missing scripts).

`commands/lint.ts` builds a `LintContext` per skill root:

| Field | Meaning |
| --- | --- |
| `filePath` | File currently being linted |
| `skillRoot` | Directory that contains `SKILL.md` |
| `relativeFiles` | Every file under the skill folder |
| `markdownContents` | Relative path to content for each `.md` / `.mdc` |
| `skillMdContent` | `SKILL.md` body when available |

Pass a `LintContext` into `lintSkillContent` for context-aware rules.
`resolveSkillRelativePath` and `resolveRelativeLink` normalize targets
inside a skill folder. `buildLintContexts` walks roots and preloads
markdown for those rules.
