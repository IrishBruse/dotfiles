---
name: architecture-high-level
description: >-
  High-level architecture: create or update repo-root ARCHITECTURE.md with scope, top-level modules,
  boundaries, and public entry surfaces—plus diagrams. Skips subsystem and component drill-down
disable-model-invocation: true
---

# High-level architecture

Write **`ARCHITECTURE.md`** at the repository root: **what the system is**, **major modules**, **how they relate**, and **how the outside world connects**.

## Mandatory artifact (non-negotiable)

- **You MUST create or update** `<repo-root>/ARCHITECTURE.md` using the **`Write`** tool (or equivalent patch that persists to disk). **A chat-only reply is not a completed run of this skill.**
- **Do not** tell the user you are done until **`ARCHITECTURE.md` exists** at the repository root and contains the full draft (not an empty stub).
- If the user names a different path for the high-level architecture doc, use that path instead—but you must still **write a file**; streaming the same content only in chat does not count.

**Out of scope for this skill**: per-module subsystem trees, folder-by-folder breakdowns, component inventories, deep import graphs inside a module—run **`architecture-modules-detail`** after this (writes **`ARCHITECTURE_MODULES.md`** next to **`ARCHITECTURE.md`**).

## Architecture skills pipeline

Execution order: **`architecture-high-level`** → **`architecture-modules-detail`** (step 2 is optional).

| Step  | Skill                                | Artifact                                                                                            |
| ----- | ------------------------------------ | --------------------------------------------------------------------------------------------------- |
| **1** | **`architecture-high-level`** (this) | `ARCHITECTURE.md` — scope, modules, public interface                                                |
| **2** | **`architecture-modules-detail`**    | `ARCHITECTURE_MODULES.md` — per-module subsystems, entry points, internal boundaries (reads step 1) |

## Output contract

- **Table of contents** at the top; entries must match real headings (no numeric section titles like `1.` or “Layer 1”).
- **System context**: scope; optional cross-cutting concerns; module inventory + one-line roles; **one** whole-system Mermaid diagram.
- **Public interface**: surfaces (who owns what), actors, constraints; **one** Mermaid diagram.
- All of the above must live **in the saved `ARCHITECTURE.md` file**—not only in the chat transcript.

## Steps

### Check existing

Read `<repo-root>/ARCHITECTURE.md` if present. Update stale high-level sections; leave deeper sections untouched unless you are explicitly replacing the whole doc.

### Discover (stay high level)

- Infer **top-level modules** from layout, manifests (`package.json`, `go.mod`, `Cargo.toml`, `pyproject.toml`, …), and READMEs.
- List **entry surfaces** at a summary level (which HTTP areas, CLIs, exported APIs, queues, cron)—not every handler or file path.
- Use **`Grep`** sparingly to confirm **dependency direction between modules**, not inner-package wiring.

### Write

Use the template below. Do **not** add “Subsystems”, “Components”, or equivalent nested decomposition sections.

### Verify

TOC links resolve; names match across TOC, tables, and diagrams; every cited path exists.

## Rules

- **Naming**: One canonical module name everywhere.
- **Headings**: Stable titles (**System context**, **Public interface**)—no numbered prefixes or layer ordinals.
- **Diagrams**: Modules and significant externals only—no internal class or folder explosions.
- **Unknowns**: Note gaps under Scope or Cross-cutting concerns.

## Template

````md
# Architecture

## Table of Contents

- [System context](#system-context)
  - [Scope](#scope)
  - [Cross-cutting concerns](#cross-cutting-concerns)
  - [Modules](#modules)
  - [<Module A>](#module-a)
  - [<Module B>](#module-b)
- [Public interface](#public-interface)
  - [Surfaces](#surfaces)
  - [Actors](#actors)
  - [Constraints](#constraints)

## System context

### Scope

<repos, services, or packages this document covers>

### Cross-cutting concerns

> Omit this subsection if nothing truly spans modules.

- **Auth**: <…>
- **Config**: <…>

### Modules

| Module     | Path      | Role         | Depends on            | Must not depend on |
| ---------- | --------- | ------------ | --------------------- | ------------------ |
| <Module A> | `<path>/` | <one phrase> | <modules / externals> | <modules>          |
| <Module B> | `<path>/` | <one phrase> | <…>                   | <…>                |

### <Module A>

**Role**: <one sentence—what this module does in the whole system.>

### <Module B>

**Role**: <one sentence—what this module does in the whole system.>

```mermaid
flowchart TD
  MA[Module A] --> MB[Module B]
  MA --> EXT[(External systems)]
```

## Public interface

### Surfaces

| Direction | Surface                    | Owned by | Notes               |
| --------- | -------------------------- | -------- | ------------------- |
| Inbound   | <API / CLI / …>            | <Module> | <auth, contract>    |
| Outbound  | <webhooks / SDK calls / …> | <Module> | <failure semantics> |

### Actors

<Who invokes the system: users, partners, other repos, …>

### Constraints

<Versioning, compatibility, limits, things external callers must not rely on.>

```mermaid
flowchart LR
  ACTORS[Actors] --> SURF[Entry surfaces]
  SURF --> MODS[Modules]
  MODS --> OUT[(Outbound)]
```
````

## Checklist

- [ ] `ARCHITECTURE.md` written or updated via `Write` / persisted patch
- [ ] No subsystem or component decomposition sections
- [ ] TOC matches headings; links work
- [ ] One Mermaid diagram under **System context**, one under **Public interface**
- [ ] Module names consistent across TOC, tables, and diagrams
