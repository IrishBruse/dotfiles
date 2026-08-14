---
name: locality-of-behaviour
description: Locality of behaviour - the behaviour of a unit of code stays obvious from that unit alone. Use when deciding where code, config, types, or tests should live, when adding a helper, hook, event, decorator, or middleware, when a reader must open several files to follow one action, or when DRY or separation of concerns argues for moving code away from its caller.
---

# Locality of behaviour

The behaviour of a unit of code should be obvious from that unit alone.

Measure it in **jumps**: how many files or symbols a reader opens to answer "what happens when this runs?".
Every jump is paid again by every future reader, so the version with fewer jumps wins the tie.
Optimise for the reader who arrives cold, with no memory of the design.

## Action at a distance

The failure mode: the code that causes an effect sits far from the code that shows the effect.
Common forms, each read as a smell until justified:

- A framework or decorator registers behaviour that no call site names.
- Global or module-level mutable config changes what a distant function does.
- A patch, prototype override, or subclass replaces behaviour the reader is looking at.
- Event soup: an emit with no visible listener, or a listener with no visible emitter.
- A shared helper with mode flags, where each caller triggers a different hidden branch.
- Behaviour parked in a shared or `common` folder that only one feature uses.

Repair it by moving the cause next to the effect, or by naming the effect at the call site so one jump reaches it.

## Rules

### Keep behaviour beside its caller

Trigger: a function, hook, component, or query used by exactly one feature, route, or component sits in shared space.

Put it in the smallest folder that owns it, beside the code that calls it. Promote it to shared space on the second real consumer.

### Inline single-use indirection

Trigger: a wrapper, helper, constant, or abstraction with one call site that adds a jump without adding meaning.

Inline it. Keep the extraction when the name records intent the body cannot show, such as a rule, a unit, or a domain term.

### Colocate config, types, styles, tests, and docs

Trigger: the thing that describes a module lives in a parallel tree far from the module.

Keep them in the same folder as the code they serve, so one directory listing shows the whole unit.

### Wire explicitly

Trigger: a file-name convention, auto-import, dependency-injection container, or implicit registry supplies behaviour with no visible link.

Prefer an explicit import, argument, or call that the reader can follow with one jump.
Keep the convention when the framework owns it and the mapping is uniform across the whole codebase.

### Accept duplication until the third copy

Trigger: two similar blocks tempt an early shared abstraction.

Leave the copies until a third appears, then extract the shape the three agree on.
Two copies that drift are cheaper than one abstraction with two escape hatches.

### Put the trigger where the reader looks

Trigger: markup, schema, or route says what a thing is, while a separate file says what it does.

Attach the behaviour to the declaration the reader already reads, so intent and action arrive together.

## Where locality yields

Locality is a strong default, not an absolute. Move code away from its caller for these:

- Uniform cross-cutting policy: authentication, authorisation, logging, tracing, transactions, error boundaries.
  One central place is the point, because a local copy can drift and open a hole.
- A real invariant with one owner: protocol constants, schemas, currency and tax rules, generated clients.
  Correctness needs a single source of truth.
- A published contract: an exported API, package boundary, or design-system component with many consumers.
- A block so long that inlining it buries the flow it belongs to. Extract with a name that carries the intent.

Name which of these applies. When none applies, the code belongs beside its caller.

## Applying it

1. Read the change as a cold reader and count the jumps needed to explain one user-visible action.
   Done when you can state the count and name the file behind each jump.
2. For each jump, decide: fold the code back to the caller, or record which entry under "Where locality yields" justifies it.
   Done when every jump is folded or justified by name.
3. Apply the folds, then re-count. Done when the count only holds justified jumps.
