# Shared: GitHub PR review (pr-cli)

This block is prepended to command-specific instructions. Follow it for any review flow the CLI launches.

{{prLine}}

{{hintBlock}}{{workJiraTitleSection}}

## Requirements

- The CLI already prefetched PR data into the **workspace root** (`view.json`, `commits.txt`, `checks.json`, `comments.txt`, `files.json`, `diff.patch`, and optionally **`KEY-123.md`** Jira ticket copies such as `NOVACORE-39309.md`). Base your review on those files only (no `gh` or GitHub API tool calls for PR content).

{{prefetchedContextSection}}

Avoid duplicating feedback that is already under discussion (see `comments.txt`).

## Final deliverable (required)

When your review is ready, you **must** write two files in the **workspace root** (same directory as this prefetch data). The CLI reads them after you finish — do not rely on chat output for posting.

1. **`Title.md`** — Short line for the review comment (shown in the terminal preview). Plain text or minimal markdown; trimmed.
2. **`Body.md`** — Full markdown for the GitHub review comment, including `> Reviewed by Cursor` at the top unless policy says otherwise.

Both files must exist and be **non-empty**. The human approves in the terminal preview, then the CLI runs `gh pr review --comment`.

# First-pass review (`pr review`)

You are executing **`pr review`**: a first-pass review of the PR identified above (shared **Resolve and inspect** section). Perform the analysis below, then satisfy **Final deliverable** in the shared preamble (`Title.md` + `Body.md` only).

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

Produce consolidated feedback suitable for **`Body.md`**:

1. **Executive summary** — High-level assessment (e.g. safe to merge, needs changes, minor cleanup).
2. **Actionable suggestions** — Specific improvements; use fenced code only where it helps.
3. **Discussion points** — Architectural or product questions for humans.

Put a short summary line in **`Title.md`** (mirrors the gist of the review).

## 4. Post-review validation

If you applied any fixes locally, note which checks you ran or skipped. (This flow is read-only unless the user explicitly asked otherwise.)
