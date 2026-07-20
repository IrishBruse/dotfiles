# Engine

How `skills lint` runs rules and applies fixes.

`run.ts` is the only module that imports rules.
`fix.ts` is the only module that imports fixers.
That keeps registration in one place.

## Files

| File | Role |
| --- | --- |
| `run.ts` | Call every rule, merge diagnostics, sort |
| `fix.ts` | Run fixers in a fixed order, then re-lint |
| `format.ts` | Print `path:line:column - severity code: message` |
| `color.ts` | TTY colors via `dotfiles/api.ts` `paint` |
| `discover.ts` | Re-exports from `skills/discover.ts` |

## Running rules

`lintSkillContent(content, filePathOrContext?)` calls each rule in a fixed
order (see `run.ts` for the list).

Rules that need other files in the skill receive a `LintContext` built by
`commands/lint.ts` through `buildLintContexts` in [core/context.ts](../core/context.ts).

## Auto-fix order

`skills lint --fix` runs fixers in this order:

1. `frontmatter/description-block.fix`
2. `frontmatter/frontmatter-description.fix`
3. `prose/prose-semicolons.fix`
4. `prose/em-dash.fix`
5. `prose/non-ascii.fix`
6. `reference/nested-references.fix`
7. `reference/reference-toc.fix`
8. `prose/long-lines.fix`

Fixers must be idempotent: running `--fix` twice should not keep changing
the file.

Line-based fixers use `mapDocumentLines` in [core/fix-shared.ts](../core/fix-shared.ts),
which skips every line inside fenced ` ``` ` code blocks. Structural fixers
such as `reference-toc.fix` use `getCodeBlockLineRanges` for the same rule.

## Registering a rule

1. Import `lint` in `run.ts` and spread its diagnostics into the result.
2. If the rule is auto-fixable, import `fix` in `fix.ts` at the right
   position in the pipeline above.
3. Document the rule in its category README and on the
   [rules index](../README.md).
