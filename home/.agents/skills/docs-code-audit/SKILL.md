---
name: docs-code-audit
description: >-
  Spec framework: audits code against user-facing docs (dead code, drift, untested surface, optional consumer rewrite).
  Invoke explicitly (/spec-docs-code-audit). Use when aligning code with docs or making docs consumer-facing.
---

# Spec docs-code audit

Treat documented behavior as the supported contract. Shrink code to match, or update docs when the code is intentionally ahead of the docs.

## Process

1. **Discover** - Read `spec-repo-shape` for **user docs** path; read **agents** (`AGENTS.md`) for verify commands and style rules.
2. **Inventory docs** - Scan **user docs** (see `spec-repo-shape`). Do not treat **main design** as the consumer contract. List documented features, APIs, syntax, and stated limitations.
3. **Map to code** - For each documented item, confirm implementation exists and is reachable from entrypoints or public API.
4. **Find dead surface** - Grep for tokens, AST nodes, opcodes, modules, or flags with no doc mention and no test/reference. Mark as candidate removal; do not delete without user confirmation on large cuts.
5. **Find doc drift** - Documented items missing or stubbed in code go to limitations/status (or user confirms docs are aspirational).
6. **Coverage notes** - List documented or implemented paths with no matching test (or `.skip`). No test churn unless asked.
7. **Consumer pass** (only if requested) - Rewrite user docs: no monorepo paths, no "run the internal test suite" in end-user guides, second person or neutral tone per existing doc style.

## Output format

```markdown
## Documented surface

- ...

## Remove or narrow (confirmed dead)

- <path> - <reason>

## Needs doc update

- ...

## Untested (keep, document risk)

- ...

## Consumer doc edits

<only if that pass was requested>
```

## Rules

- Read before deleting. Prefer narrowing (feature flag, explicit error) over silent removal when unsure.
- One PR-sized scope: do not refactor unrelated modules.
- Run the project's verify command after code removals.
- Match existing doc file structure and heading style.

## Edge cases

- **Docs aspirational:** report as gaps; do not delete working code to match outdated docs without explicit user direction.
- **Generated docs:** exclude from "source of truth" unless user says otherwise.
- **Only consumer rewrite:** skip code deletion; only edit markdown under **user docs**.

## Related skills

- `spec-repo-shape` - paths and layout (read first).
