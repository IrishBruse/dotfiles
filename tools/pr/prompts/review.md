# First-pass review (`pr review`)

You are executing **`pr review`**: a first-pass review of the PR identified above (shared **Resolve and inspect** section). Perform the analysis below, then satisfy **Final response** in the shared preamble (single `json` fence only).

## 1. Scope selection

1. **Primary scope:** Use the PR diff (delta between head and base).
2. **Context:** If the diff is small, read full modified files when needed for surrounding logic.
3. **Preservation:** Stay on changes introduced in the PR; avoid scope creep into unrelated legacy code unless the PR directly breaks invariants there.

## 2. Parallel subagents (read-only)

Launch three subagents to audit the PR simultaneously. They must only report findings and cannot modify code during analysis.

### Agent A: Code quality and maintainability

- **Logic simplification:** Complex conditionals that could use guard clauses or flattening.
- **Clarity:** Magic numbers, unclear naming, overly clever one-liners.
- **Defensive over-engineering:** Redundant null checks, broad `try/catch` that hides errors.
- **Types:** `any`, unnecessary casts, loose interfaces.

### Agent B: Performance and scalability

- **Resources:** N+1 patterns, heavy work inside tight loops, missing memoization.
- **Concurrency:** Blocking I/O, missing `await`, race risks.
- **Memory:** Large allocations in hot paths, leaky closures.
- **Payload:** Excessive logging or telemetry in high-frequency paths.

### Agent C: Consistency and reuse

- **Patterns:** Alignment with project architecture and shared utilities.
- **DRY:** Duplication of existing functionality.
- **API design:** Ergonomics of new public surfaces.

## 3. Synthesis

Produce consolidated feedback suitable for **body** in the final JSON:

1. **Executive summary** — High-level assessment (e.g. safe to merge, needs changes, minor cleanup).
2. **Actionable suggestions** — Specific improvements; use fenced code only where it helps.
3. **Discussion points** — Architectural or product questions for humans.

## 4. Post-review validation

If you applied any fixes locally, note which checks you ran or skipped. (This flow is read-only unless the user explicitly asked otherwise.)
