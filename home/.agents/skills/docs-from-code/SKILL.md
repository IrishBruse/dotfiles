---
name: docs-from-code
description: Audits and aligns user-facing docs to match code as the source of truth. Use when checking doc drift, filling doc gaps.
---

# Docs from code

**Source of truth:** code.
Public behavior in the repo defines what user docs should say.

## Setup

1. **Discover layout**
   - **Agents / conventions:** `AGENTS.md`, `CLAUDE.md`, `.cursor/rules/`, or similar
   - **User docs:** `README.md`, `docs/` (exclude internal-only subtrees marked design-only), `doc/`, `documentation/`, package READMEs the user names
   - **Verify:** `AGENTS.md`, `package.json`, `Makefile`, `Justfile`, `Cargo.toml`, CI workflows, or ask once
   - **Spec-shaped repos:** if `spec-repo-shape` applies, read it for path roles.
     Not required otherwise.
2. **Scope** - Package, app, or path the user named.
  In monorepos, do not audit siblings unless asked.
3. **Contract set** - List entrypoints and packages in scope.
  Say so in the report header.

## Process

1. **Inventory code surface** - From entrypoints and public API: commands, exports, config, flags, and user-visible behavior.
  Use tests and examples as hints, not as the contract by themselves.
2. **Map to docs** - For each implemented user-facing item, find matching doc coverage.
  Note missing, wrong, or outdated sections.
3. **Find doc drift (Fixes & Removals)** - Identify docs describing removed, renamed, or never-shipped behavior.
  Check for `@deprecated` tags or `TODO` comments in code to verify if drift is intentional deprecation.
  Propose edits or removals.
4. **Find doc gaps (Additions)** - Identify implemented behavior with no doc mention.
  Propose explicit additions or limitations entries.
5. **Leakage guard** - Ensure internal file paths, variable names, or internal architectural terms do not leak into user-facing guides.
6. **Coverage notes** - Implemented paths with no matching test (or skipped).
  No test churn unless asked.
7. **Consumer pass** (only if requested) - Rewrite user docs for external readers: no repo-internal paths, no dev-only commands in end-user guides, tone matches existing style.

## Output format

```markdown
## Contract (code surface)

- <entrypoints / packages scoped>

## Implemented surface

- ...

## Doc Drift (Fixes & Removals)

- <doc path> - <fix | remove section> - <reason / verification of intentionality>

## Doc Gaps (Additions)

- <doc path> - <add section> - <proposed content / reason>

## Untested (keep, document risk)

- ...

## Consumer doc edits

<only if that pass was requested>
```

## Rules

- One PR-sized scope.
  No unrelated refactors.
- Do not reference docs on other branches or that have been removed in git history.
- Do not delete or narrow code unless the user explicitly asks.
- Prefer minimal doc edits: patch sections, do not rewrite whole trees unless needed.
- Match existing doc structure and heading style.
- If docs describe future work the user still wants documented, add or update limitations or status sections instead of changing code.
- **Generated docs:** update source or hand-written docs the user names, not stale generated output, unless they say generated docs are published.
