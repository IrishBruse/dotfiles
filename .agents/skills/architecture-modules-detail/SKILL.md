---
name: architecture-modules-detail
description: >-
  Reads repo-root ARCHITECTURE.md as the source of truth, runs parallel Task subagents (one per
  top-level module) to explore the codebase, and writes ARCHITECTURE_MODULES.md—a separate
  medium-depth doc (subsystems, entry points, module interfaces) without class-level inventories.
  Use when the user wants per-module detail in a companion file, a split overview + modules layout,
  or a deeper pass after architecture-high-level.
disable-model-invocation: true
---

# Architecture modules detail

## Prerequisite: read `ARCHITECTURE.md`

**Always read** `<repo-root>/ARCHITECTURE.md` first. Treat it as the **source of truth** for canonical **module names**, **root paths**, **roles**, and which **public surfaces** belong to which module.

- If `ARCHITECTURE.md` is missing or has no usable **Modules** inventory, run **`architecture-high-level`** first (or stop and ask the user).
- **Do not** duplicate the full high-level system story in the companion file; **link** back to `ARCHITECTURE.md` instead.

## Output: separate file

Write **`<repo-root>/ARCHITECTURE_MODULES.md`** using the **`Write`** tool.

- **Separate from** `ARCHITECTURE.md`: keep the overview file as-is unless the user explicitly asks to change it.
- **Purpose**: one level deeper than the high-level doc—**per-module** subsystems, internal boundaries, **entry points**, and **interfaces** that matter at module edges—not a class-by-class or file-by-file dump.

## How this relates to other architecture skills

| Skill | Primary artifact | Depth |
| ----- | ---------------- | ----- |
| **`architecture-high-level`** | `ARCHITECTURE.md` | System + modules + public interface only |
| **`architecture-modules-detail`** (this) | `ARCHITECTURE_MODULES.md` | Per-module subsystems, entry points, internal boundaries |
| **`architecture-boundary-map`** | single `ARCHITECTURE.md` | System + public interface + **Subsystems** inlined in one doc |

Use **this** skill when the user wants **split docs** (overview stays short; detail lives beside it). Use **`architecture-boundary-map`** when they want **one** `ARCHITECTURE.md` with inlined subsystem sections.

## Depth contract

**In scope**

- One `## <Module name>` per top-level module listed in `ARCHITECTURE.md` (same canonical names).
- **Subsystems** or major packages under that module: `###` / `####` with **Path**, **Responsibilities**, **Inbound**, **Outbound**, **Constraints** (short phrases; real paths).
- **Entry points** for that module: CLI mains, HTTP route groups / servers, workers, cron, library **exports**—summarized by area with paths, not every handler.
- **Internal interfaces**: types, ports, adapters, or RPC shapes that **other code in the same module** depends on—cite file paths; omit exhaustive API listings.
- **Optional**: one small Mermaid diagram per module if it clarifies internal flow (no giant graphs).

**Out of scope**

- Duplicating **System context** and **Public interface** tables from `ARCHITECTURE.md` (link to `./ARCHITECTURE.md` anchors instead).
- Class-level inventories, every import, generated artifacts, or “every file under `src/`”.

## Orchestration: parallel subagents

When **`ARCHITECTURE.md`** defines **multiple** top-level modules, use the **`Task`** tool with **`subagent_type: generalPurpose`** — **launch one subagent per module**, **in parallel** when the host allows multiple `Task` calls in one turn.

Each subagent:

- Gets the **absolute repo root**, the module’s **canonical name**, **root path** from `ARCHITECTURE.md`, and **pasted excerpts**: that row from **Modules**, the module blurb under **System context**, and **Public interface** / **Surfaces** rows naming that module.
- Explores the tree under that module root (manifests, READMEs, obvious entry files, `Grep` for imports **within** the module boundary).
- **Returns** a single markdown fragment beginning with `## <Module name>` through all subsections for that module, plus a trailing **`Paths cited:`** list for verification.

The **orchestrator** (you):

1. Read `ARCHITECTURE.md` and build the ordered module list (follow the **Modules** table order, or TOC order if clearer).
2. Fire **one `Task` per module** with the prompt template below (customized per module).
3. **Merge** returned fragments in that same order into one document (prepend intro + TOC; see template).
4. **Verify**: every path exists; module names match `ARCHITECTURE.md`; TOC anchors resolve.
5. **`Write`** the full `ARCHITECTURE_MODULES.md` once.

**When to skip subagents**

- **One module** (or a trivially small repo): you may analyze directly without `Task`.
- User asks for a **single** combined `ARCHITECTURE.md` instead: use **`architecture-boundary-map`**, not this skill.

### Subagent prompt template

Paste into each module-scoped `Task` prompt (fill angle-bracket placeholders):

```text
You are documenting ONE module in a repository. Prefer read-only exploration.

Repo root (absolute): <ABS_REPO_ROOT>
Canonical module name: <MODULE_NAME>
Module root (relative to repo): <MODULE_PATH_FROM_ARCHITECTURE>

Context from ARCHITECTURE.md (trust this; correct only if the tree proves it wrong):
<PASTE: Modules table row + ### Module blurb + Public interface / Surfaces rows for this module>

Instructions:
1. Explore only under the module root unless tracing an entry file path.
2. Read manifests/READMEs touching this module as needed.
3. Produce ONE markdown fragment for the orchestrator to splice into ARCHITECTURE_MODULES.md.

Output format (exact heading levels):
## <MODULE_NAME>

### Overview
2–4 sentences. Link to the overview doc: [Architecture overview](./ARCHITECTURE.md#<matching-anchor>) where helpful.

### Layout
Bulleted major subdirectories or files directly under the module root; one line each.

### Subsystems
For each coherent subsystem or major package, use:
#### <Subsystem name>
- **Path**: `...`
- **Responsibilities**: ...
- **Inbound**: ...
- **Outbound**: ...
- **Constraints**: ...

### Entry points
Bullets: kind of surface, owning path, one-line note (auth, protocol, idempotency if obvious).

### Internal interfaces
Bullets: name or role, file path—contracts used inside this module only.

Optional: one ```mermaid``` block if it clarifies; keep under ~15 nodes.

Rules: Do not list every source file. No class-by-class catalogs. Every backticked path must exist relative to repo root.

Last line (exactly this format):
Paths cited: `path/a`, `path/b`, ...
```

## Document template (orchestrator assembles this)

````md
# Architecture — modules detail

Companion to [Architecture overview](./ARCHITECTURE.md). High-level scope, actors, and whole-system diagrams stay in that file; **this** document expands each top-level module.

## Table of Contents

- [How this relates to ARCHITECTURE.md](#how-this-relates-to-architecturemd)
- [<Module A>](#module-a)
- [<Module B>](#module-b)

## How this relates to ARCHITECTURE.md

- **Source of truth for names and boundaries**: [Architecture overview](./ARCHITECTURE.md).
- **This file**: subsystems, entry points, and module-local interfaces only.

<!-- splice each subagent fragment below in module order; each fragment starts with ## <Module> -->

````

## Rules

- **Naming**: Reuse **exact** module titles from `ARCHITECTURE.md` for every `##` module heading.
- **Headings**: No numbered section titles (`1.`, `2.1`) or “Layer N” ordinals.
- **Links**: Use repo-relative links to `./ARCHITECTURE.md` and anchors that exist in that file.
- **Unknowns**: Note gaps in the relevant module section; do not invent structure.

## Checklist

- [ ] `ARCHITECTURE.md` read first; module list taken from it
- [ ] One `Task` subagent per module when multi-module (parallel where possible), or direct analysis when tiny
- [ ] `ARCHITECTURE_MODULES.md` written via **`Write`** at repo root
- [ ] No full duplicate of high-level **System context** / **Public interface** (links only)
- [ ] Depth stays at subsystem / entry-point / interface level—not class inventories
- [ ] TOC matches `##` headings; paths cited exist; names match `ARCHITECTURE.md`
