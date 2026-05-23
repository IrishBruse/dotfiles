---
name: code-from-docs
description: >-
  Audit and align code to user-facing docs (docs are the contract). Dead code, code drift, untested surface.
  Invoke explicitly (/code-from-docs). Use when implementation should match documented behavior.
---

# Code from docs

**Source of truth:** user docs. Documented behavior is the supported contract.

## Setup

1. **Discover layout**
   - **Agents / conventions:** `AGENTS.md`, `CLAUDE.md`, `.cursor/rules/`, or similar
   - **User docs:** `README.md`, `docs/` (exclude internal-only subtrees marked design-only), `doc/`, `documentation/`, package READMEs the user names
   - **Verify:** `AGENTS.md`, `package.json`, `Makefile`, `Justfile`, `Cargo.toml`, CI workflows, or ask once
   - **Spec-shaped repos:** if `spec-repo-shape` applies, read it for path roles. Not required otherwise.
2. **Scope** - Package, app, or path the user named. In monorepos, do not audit siblings unless asked.
3. **Contract set** - List which files count as user docs for this run. Say so in the report header.

## Process

1. **Inventory docs** - Scan user docs from setup. Skip internal design, ADRs, and generated reference unless the user named them as contract. List features, APIs, CLI, config, and stated limitations.
2. **Map to code** - For each documented item, confirm implementation exists and is reachable from entrypoints or public API.
3. **Isolate undocumented surface vs dead code**
   - **Undocumented Public Surface:** Code is active and reachable but missing from docs. Do NOT delete. Flag as a doc issue (aspirational docs or missing docs).
   - **Dead Code:** Exports, modules, commands, config keys, or flags with no doc mention AND no test or in-repo reference. Mark as candidate for removal or narrowing.
4. **Find code drift (Fixes)** - Documented items that exist in code but behave differently than documented (e.g., wrong flag name, wrong default value). Propose code fixes.
5. **Find implementation gaps (Missing Features)** - Documented items entirely missing or stubbed in code. Report these clear gaps. Do not write net-new features without explicit user confirmation.
6. **Coverage notes** - Documented paths with no matching test (or skipped). No test churn unless asked.

## Output format

```markdown
## Contract (user docs)

- <paths used>

## Documented surface

- ...

## Dead Code Candidates (Remove or Narrow)

- <path> - <reason code is considered dead/unreachable>

## Code Drift (Required Fixes)

- <path or area> - <what docs require vs what code does> - <proposed fix>

## Implementation Gaps (Missing Features)

- <area> - <documented feature missing from code> - <risk/status>

## Untested (keep, document risk)

- ...
```

## Rules

- One PR-sized scope. No unrelated refactors.
- Read before deleting. Prefer narrowing (feature flag, explicit error) over silent removal when unsure.
- Run the project verify command after code changes.
- Do not rewrite user docs unless the user invokes **docs-from-code**.
- **Docs aspirational:** If docs describe future intent, report the gaps. Do not delete working code to match outdated docs without explicit user direction.
- **Generated docs:** not the contract unless the user says otherwise.
- Use `questions` when scope or delete vs update is unclear.

## Related skills

- `docs-from-code` - opposite direction (code is contract).
- `spec-repo-shape` - optional path map for spec-shaped repos.
