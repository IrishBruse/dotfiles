---
name: spec-gap-analysis
description: >-
  Spec framework: analyzes why a build target fails (compile errors, doc cross-check, nearest passing example).
  Invoke explicitly (/spec-gap-analysis). Use when asking what is missing to compile or support a feature.
disable-model-invocation: true
---

# Spec gap analysis

Find what the current codebase still lacks for a user-named build target. Report gaps only unless the user asks to implement.

## Process

1. **Discover** - Read `spec-repo-shape` for doc paths and optional status/limitations files; read **agents**, `README`, `Justfile`, or package scripts for build/test CLI.
2. **Target** - Use the path or entry the user named (file, example, app, milestone). If unclear, ask once.
3. **Reproduce** - Run the documented build/compile command on that target. Capture full errors and warnings that block success.
4. **Classify** each blocker:
   - Lexer / parser (syntax not accepted)
   - Types / semantics (rejected but parses)
   - Codegen / backend (unsupported construct)
   - Link / package / runtime (missing tool or env)
   - External / platform (not a compiler gap)
5. **Cross-check** - Compare against status or limitations docs and the closest **passing** test or example in the repo.
6. **Output** - Short prioritized list. Per gap: category, symptom, likely owner area in tree (no need for exact line unless obvious), suggested minimal test or doc update. Do not implement unless asked.

## Output format

```markdown
## Target

<what was built>

## Result

<pass | fail + one-line summary>

## Gaps

1. **<category>** - <symptom> - nearest passing reference: <path or "none">
   ...

## Suggested next step

<one minimal test, doc line, or spike>
```

## Rules

- Prefer the repo's real CLI over guessing commands.
- If the target mixes layers (e.g. embedded asm inside a high-level file), note which layer failed first.
- Separate "not implemented" from "implemented but buggy".
- Stop after the gap list when that answers the question.

## Edge cases

- **Already builds:** say so and list optional polish or missing tests only if relevant.
- **Environment missing:** say which tool or SDK is absent; do not blame the compiler.
- **Huge error spam:** fix the first root error, re-run once, then report.

## Related skills

- `spec-repo-shape` - paths and layout (read first).
