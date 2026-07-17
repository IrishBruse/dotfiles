---
name: code-review-swarm
description: Parallel subagent variant of the code-review maintainability pass.
disable-model-invocation: true
---

# Code Review Swarm

Orchestration variant of `code-review`. Splits the audit across focused subagents, then synthesizes one verdict using `code-review` priority and approval bar.

Invoke when the user runs `/code-review-swarm` or asks for a parallel or subagent thermo-nuclear review.

## Dependency

Read and follow `code-review` before launching subagents or writing the final synthesis.
Subagents must do the same.
Do not duplicate its concern definitions here, reference the concern names from `code-review` in prompts and synthesis.

## Review scope

Default target is the active workspace repository root.

- Default diff: `branch changes` (merge-base with default/base branch, including committed, staged, and unstaged work).
- Use `uncommitted changes` only when the user asks for local or dirty-tree review only.
- If the user names a PR, branch, or link, resolve and check out that target before launching subagents.
  Stash only after the user confirms when checkout would overwrite local changes.
- Record `Full Repository Path`, `Diff`, and optional `Base Branch` for every subagent prompt.

## Subagent rules

Launch all review subagents in one parallel batch unless a prior batch failed and you are retrying.
Use the Subagent tool directly, not shell commands.

Every review subagent:

- `subagent_type: "generalPurpose"`
- `model: "composer-2.5"` (required, no substitute)
- `readonly: true`
- `run_in_background: false` unless the user asked for background

Return only **high-conviction** findings: file or symbol reference, what is wrong, why it matters, and the remedy from `code-review`.
Skip cosmetic nits and low-confidence guesses.
Empty findings are valid.

Shared prompt prefix for each subagent:

```text
Read and follow the code-review skill in this repo's agent skills.

Repository: <Full Repository Path>
Diff: <branch changes | uncommitted changes>
Base Branch: <only when reviewing branch changes against a known non-default base>
Your lane: <lane name from table below>

Hunt only the concerns listed for your lane. Apply code-review triggers and remedies.
Return a bullet list of high-conviction findings only.
Each bullet: severity (blocker | major | minor), location (file:line or file + symbol), finding, why it matters, suggested remedy.
If nothing fires in your lane, return exactly: No findings in this lane.
```

## Lanes

Launch one subagent per lane. Map lanes to `code-review` concerns:

| Lane | Subagent description | Concerns |
|------|---------------------|----------|
| structure-judo | Code review: structure and judo | Code judo, File size, Spaghetti growth |
| boundaries-abstractions | Code review: boundaries and abstractions | Magic and thin abstractions, Type and boundary cleanliness |
| locality-reuse | Code review: locality and reuse | Canonical layer and reuse, Locality and component extraction |
| performance-orchestration | Code review: performance and orchestration | Performance, Orchestration and atomicity |
| dead-code-comments | Code review: dead code and comments | Comments and dead code |

Set each subagent `description` to the table value.

## Failure handling

If a subagent fails:

- Fix invocation mistakes (missing path, diff, model, or lane) and retry that lane once.
- For other failures, retry the same prompt once.
- After two failures on a lane, stop and report the blocker. Do not claim a full swarm review completed.

## Synthesis

When all lanes finish:

1. Collect findings. Drop lanes that returned no findings.
2. Dedupe overlaps (same file, symbol, and root cause). Keep the clearest wording.
3. Order by `code-review` output priority.
   Use this order:
   - Structural regressions and missed code-judo simplifications
   - Spaghetti / branching complexity
   - Boundary, abstraction, and type-contract problems
   - Folder locality, component extraction, and reuse problems
   - Performance issues on hot paths
   - File-size and decomposition
   - Dead code, low-information comments, and remaining legibility concerns
4. Within the same priority tier, sort blocker before major before minor.
5. Apply the `code-review` **Approval bar**.
   Do not approve because behavior looks correct.
   Approve only when no `code-review` concern remains unjustified.
6. Use the `code-review` **Tone** for feedback wording.

### Empty diff

If every lane reports no diff or empty changes, say so in one sentence and stop.

### No findings

If all lanes report clean, state that the swarm found no high-conviction maintainability issues and that approval passes the `code-review` bar.

### With findings

Print:

1. **Verdict**: Approve or Request changes (never approve if any unjustified concern remains).
2. **Findings table**: one row per deduped finding, columns Severity, Location, Finding, Remedy. Sort per priority above.
3. **Summary**: 2-4 sentences on the largest structural risks.

Do not fix code or rerun the swarm unless the user asks.
