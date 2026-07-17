---
name: code-review
description: Runs an extremely strict maintainability review for abstraction quality, giant files, and spaghetti conditions. Use for a thermo-nuclear or especially harsh code-quality review.
---

# Thermo-Nuclear Code Quality Review

An unusually strict review of implementation quality, maintainability, abstraction quality, and codebase health on the current branch's changes.

Above all, be **ambitious** about structure.
Do not merely identify local cleanup.
Actively hunt for **code judo**: a restructuring that preserves behavior while making the implementation dramatically simpler, smaller, more direct, and more elegant.
Prefer deleting complexity over rearranging it, and prefer the solution that makes the code feel inevitable in hindsight.

## Core prompt

Start from this baseline:

> Perform a deep code quality audit of the current branch's changes.
> Rethink how to structure / implement the changes to meaningfully improve code quality without impacting behavior.
> Work to improve abstractions, modularity, reduce spaghetti code, improve succinctness and legibility.
> Be ambitious, if there is a clear path to improving the implementation that involves restructuring some of the codebase, go for it.
> Be extremely thorough and rigorous. Measure twice, cut once.

## Concerns

For each concern below: the trigger to look for, and the remedy to push for.
These are presumptive blockers unless the author justifies them clearly.

### Code judo (missed simplification)

The headline concern.
Look for a complicated implementation where a reframing would delete whole branches, helpers, modes, conditionals, or layers, and for refactors that move complexity around without reducing the concepts a reader must hold.

Push to reframe the state model so conditionals disappear, turn special-case logic into a simpler default flow, or change the ownership boundary so the change becomes a natural extension of an existing abstraction.
Do not accept a cleaner version of the same messy idea when a much simpler idea is plausible.

### File size

Look for a diff pushing a file from under 1000 lines to over 1000 lines. Treat this as a strong smell by default.

Push to extract helpers, subcomponents, or modules first. Waive only for a compelling structural reason where the resulting file is still clearly organized.

### Spaghetti growth

Look for new ad-hoc conditionals, scattered special cases, one-off booleans, nullable modes, or flags bolted into unrelated flows, and repeated conditionals that signal a missing model.
Also flag stored state that can be derived from source state, which invites stale-state bugs.

Push the logic into a dedicated abstraction, helper, state machine, or typed dispatcher instead of tangling an existing path. Treat "weird if statements in random places" as a design problem, not a nit.

### Magic and thin abstractions

Look for brittle or "magic" behavior, generic mechanisms that hide simple data-shape assumptions, and thin wrappers, identity abstractions, or pass-through helpers that add indirection without buying clarity.
Flag a helper used in only one place that would read more directly inlined.

Push for direct, boring, maintainable code. Delete wrappers that do not clarify the API.

### Type and boundary cleanliness

Look for unnecessary optionality, `unknown`, `any`, or cast-heavy code, nullable values that proliferate defensive checks, and silent fallbacks that paper over an unclear invariant.
Flag catch-all `try`/`catch` blocks that swallow errors without naming which exceptions are expected.

Push for explicit typed models or shared contracts so the control flow gets simpler, and make the invariant explicit at the boundary. Let unexpected errors surface instead of being swallowed.

### Comments and dead code

Look for low-information comments that restate the code instead of explaining intent, edge cases, or invariants, and for dead or compatibility code: unused branches, parameters, fallback paths, or old behavior preserved without evidence it is still needed.

Push to delete the comment or rewrite it to capture intent, and to remove dead paths outright rather than carrying them.

### Performance

Look for blocking operations in hot paths (sync work that stalls the event loop), uncached expensive computation or lookups that could be reused safely, busy waits that poll instead of using events or backoff, string concatenation in loops, N+1 I/O where batching would cut latency, and chatty logging or telemetry inside tight loops.

Push for the async, cached, batched, or event-driven form. Do not over-index on micro-optimizations that do not affect a hot path.

### Canonical layer and reuse

Look for feature logic leaking into shared paths, implementation details leaking through APIs, bespoke helpers duplicating an existing canonical utility, and logic living in the wrong package or layer.

Push code toward the module that already owns the concept and reuse the canonical helper instead of normalizing architectural drift.

### Locality and component extraction

Look for behavior living far from the feature, route, or component that owns it, and broad folders that mix unrelated concepts.
Flag React components that combine state, data shaping, layout, and repeated UI into one hard-to-reuse block.

Push behavior into the smallest local folder that owns it.
Extract React components when a section has a stable responsibility, repeated structure, or reusable UI contract.
Keep feature-specific behavior beside the component that uses it instead of promoting it to shared space too early.

### Orchestration and atomicity

Look for independent work serialized for no good reason, and related updates that can leave state half-applied.

Push to parallelize independent work when it also simplifies the flow, and to restructure related updates into a more atomic flow. Do not over-index on micro-optimizations.

## Output

Prioritize findings in this order:

1. Structural regressions and missed code-judo simplifications
2. Spaghetti / branching complexity
3. Boundary, abstraction, and type-contract problems
4. Folder locality, component extraction, and reuse problems
5. Performance issues on hot paths
6. File-size and decomposition
7. Dead code, low-information comments, and remaining legibility concerns

Prefer a small number of high-conviction comments over a long list of cosmetic nits. Do not flood the review with low-value notes when larger structural issues exist.

## Tone

Be direct, serious, and demanding. Do not be rude, but do not soften major maintainability issues into mild suggestions. If the code makes the codebase messier, say so. If it missed a dramatic simplification, say that too.

Good phrases:

- `this pushes the file past 1k lines. can we decompose this first?`
- `this adds another special-case branch into an already busy flow. can we move this behind its own abstraction?`
- `this works, but it makes the surrounding code more spaghetti. let's keep the behavior and restructure the implementation.`
- `this feels like feature logic leaking into a shared path. can we isolate it?`
- `this abstraction seems unnecessary. can we just keep the direct flow?`
- `why does this need a cast / optional here? can we make the boundary more explicit instead?`
- `this looks like a bespoke helper for something we already have elsewhere. can we reuse the canonical one?`
- `this behavior is far from the feature that owns it. can we move it beside the component or route that uses it?`
- `this component is carrying state, data shaping, and layout. can we extract the reusable UI pieces and keep the behavior local?`
- `i think there's a code-judo move here that makes this much simpler. can we reframe this so these branches disappear?`
- `this refactor moves complexity around, but doesn't really delete it. is there a way to make the model itself simpler?`
- `this comment just restates the code. can we drop it or explain the intent instead?`
- `this catch swallows everything. which errors do we actually expect here?`
- `this runs per-item I/O in a loop. can we batch it?`

## Approval bar

Do not approve merely because behavior seems correct.
Approve only when none of the concerns above fire: no structural regression, no visible missed code-judo move, no unjustified file-size explosion, no spaghetti growth, no magic or thin abstraction, no wrapper/cast/optionality churn obscuring the design, no boundary leak or canonical-helper duplication, no misplaced behavior, no overgrown React component that should be extracted, no swallowed errors, no hot-path performance regression, and no dead code or low-information comments left behind.

If any fire and the author cannot justify them, leave explicit, actionable feedback and push for a cleaner decomposition.
