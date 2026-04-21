Analyze the provided Pull Request (PR) by deploying parallel read-only review agents, then provide a consolidated summary and targeted inline suggestions or fixes.

### 1. Scope Selection

1. **Primary Scope:** Use the provided PR diff (the delta between the source branch and the target branch).
2. **Contextual Awareness:** If the diff is small, pull in the full content of modified files to understand the surrounding logic.
3. **Preservation:** Focus strictly on the changes introduced in the PR. Avoid "scope creep" into unrelated legacy code unless the PR directly interacts with it in a way that breaks invariants.

### 2. Parallel Subagents

Launch three subagents to audit the PR simultaneously. They must only report findings and cannot modify code during the analysis phase.

#### **Agent A: Code Quality & Maintainability**

- **Logic Simplification:** Identify complex conditionals that can be flattened or replaced with guard clauses.
- **Clarity over Cleverness:** Flag "magic numbers," cryptic naming, or "clever" one-liners that hinder readability.
- **Defensive Over-engineering:** Look for unnecessary null checks where types already guarantee presence, or broad `try/catch` blocks that swallow meaningful errors.
- **Type Safety:** Identify `any` types, unnecessary casts, or loose interfaces that weaken the contract of the code.

#### **Agent B: Performance & Scalability**

- **Resource Efficiency:** Spot N+1 queries, heavy operations inside map/filter loops, and lack of memoization for expensive computations.
- **Concurrency:** Check for blocking I/O on the main thread or missing `await` calls that lead to race conditions.
- **Memory Footprint:** Identify large object allocations in hot paths or closures that might cause unintended memory leaks.
- **Payload Bloat:** Look for excessive logging or telemetry being sent from high-frequency loops.

#### **Agent C: Consistency & Reuse**

- **Pattern Matching:** Ensure the PR follows existing architectural patterns (e.g., using the project's standard error-handling utility or logging wrapper).
- **DRY (Don't Repeat Yourself):** Identify logic in the PR that duplicates functionality already existing elsewhere in the codebase.
- **API Design:** Check if new public methods or components align with the ergonomics of the existing library/service.

### 3. Synthesis & Feedback

Aggregate the findings into a structured response:

1.  **Executive Summary:** A high-level assessment of the PR (e.g., "Safe to merge," "Needs architectural changes," or "Minor cleanup required").
2.  **Actionable Suggestions:** Provide specific, refactored code blocks for the issues identified.
3.  **Automated Fixes:** If requested, apply the non-controversial "cleanup" fixes (formatting, renaming, simple inlining) directly.
4.  **Discussion Points:** Highlight high-level concerns (e.g., "This approach might not scale if X happens") that require human architectural input.

### 4. Post-Review Validation

If fixes were applied, run available lightweight linters or tests. Clearly state which checks passed and which were skipped.
