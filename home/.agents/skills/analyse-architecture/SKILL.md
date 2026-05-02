---
name: analyse-architecture
description: >
  Analyse the architecture of a codebase using a precise shared vocabulary (module, interface,
  depth, seam, adapter, leverage, locality).
---

# Analyse Architecture

Produce a structured architecture analysis of a codebase using the shared vocabulary defined
in `references/LANGUAGE.md`. Read that file before writing a single word of the analysis —
consistent terminology is the point.

---

## Workflow

### 1. Load vocabulary (required first step)

Read `references/LANGUAGE.md` now. Every term in the analysis must come from that file.
Do not substitute "component", "service", "API", or "boundary" for the canonical terms.

### 2. Discover the codebase

If the user has not pointed you at specific files, explore the project tree to orient yourself:

```bash
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.py" \
  -o -name "*.go" -o -name "*.rs" -o -name "*.java" -o -name "*.cs" \) \
  ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/dist/*" \
  | head -120
```

Then read the files that are most likely to reveal module boundaries and seams:

- Entry points (`main.*`, `index.*`, `app.*`, `server.*`)
- Package manifests (`package.json`, `go.mod`, `Cargo.toml`, `pyproject.toml`)
- Directory structure at 2–3 levels deep
- Any files named `*interface*`, `*contract*`, `*types*`, `*schema*`

Read enough to form an honest opinion. Do not guess at interfaces you have not seen.

### 3. Build the module inventory

For each significant module, record:

| Field                      | What to capture                                                                          |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| **Name**                   | What the code calls it                                                                   |
| **Interface**              | Everything a caller must know — types, invariants, ordering, errors, config, performance |
| **Implementation summary** | One sentence on what's inside                                                            |
| **Depth assessment**       | Deep / Shallow / Unclear — with a one-line reason                                        |
| **Seam location**          | Where the interface lives (file, function, class, package boundary)                      |
| **Adapters present**       | Zero / One (hypothetical seam) / Two+ (real seam)                                        |

### 4. Apply the four principles

Run each principle as an explicit check across the module inventory:

**Depth check**

- Which modules have large behaviour behind small interfaces? (Deep — good)
- Which modules expose nearly as much complexity as they hide? (Shallow — flag it)
- Shallow modules that exist only to delegate are pass-throughs: name them.

**Deletion test**

- Mentally delete each module. Does complexity vanish (pass-through) or reappear across N
  callers (earning its keep)? Call out any module that fails this test.

**Interface-as-test-surface**

- Are callers and tests crossing the same seam? If tests pierce past the interface into
  implementation detail, flag the module as the wrong shape.

**One-adapter / Two-adapter rule**

- Count adapters at each seam. A seam with one adapter (or zero) is hypothetical —
  note whether it is justified or speculative complexity.

### 5. Write the analysis report

Structure the report exactly as follows.

---

````markdown
# Architecture Analysis: <Project Name>

## Overview

One paragraph. What is this project doing, and what is the dominant structural pattern
(layered, pipeline, plugin host, hexagonal, etc.)? Use module/interface/seam vocabulary.

Then emit a Mermaid pipeline/graph diagram showing how modules relate — data flow,
ownership, seam crossings. Use `flowchart LR` for pipelines, `flowchart TD` for
layered/hierarchical systems. Annotate edges with the type that crosses each seam
(e.g. the token type, the AST node, the result type). Example shape:

​```mermaid
flowchart LR
CLI["Program\n(CLI)"] -->|"string path"| C["Compiler\nCompile()"]
C -->|"Stream"| L["Lexer\nLex()"]
L -->|"IEnumerator&lt;Token&gt;"| P["Parser\nParse()"]
P -->|"CompilationUnit"| B["GameBoyZ80\nGenerate()"]
B -->|"Rom"| OUT["ROM file"]

    style L fill:#d4edda
    style P fill:#d4edda
    style B fill:#d4edda
    style C fill:#fff3cd
    style CLI fill:#f8f9fa
    style OUT fill:#f8f9fa

​```

Color convention (use in all diagrams):

- `#d4edda` green — deep module (high leverage)
- `#fff3cd` yellow — shallow module (low leverage, watch it)
- `#f8d7da` red — problem area / missing seam
- `#f8f9fa` grey — entry/exit / data-only node

## Module Inventory

For each significant module, use a level-3 heading. Do not use bold prefixes.
Write two to five sentences of prose per module. End each entry with a one-line
metadata block. Group related modules under a level-2 subheading if it aids clarity.

### ModuleName (`path/to/file`)

Prose: interface summary, what callers must know, depth verdict with reason,
seam location, adapter count and whether the seam is hypothetical or real.

> **Depth:** Deep · **Seam:** `MethodName()` · **Adapters:** 1 (hypothetical)

## Depth Map

Emit a Mermaid bar/quadrant chart or a ranked table showing each module's depth
verdict at a glance. A simple approach that always works is a flowchart grouping
modules into swim-lanes by depth:

​`mermaid
flowchart TD
    subgraph Deep["🟢 Deep — high leverage"]
        Parser
        GameBoyZ80
        ResultT["Result&lt;T&gt;"]
    end
    subgraph Shallow["🟡 Shallow — low leverage"]
        Rom
        CompilerContext
        Program
    end
​`

Follow with one paragraph of prose: where is the real leverage concentrated, and
where does interface complexity nearly match implementation complexity?

## Seam Quality

Prose section. Which seams are real (two+ adapters or a clear variation axis)?
Which are hypothetical (one adapter — and is the abstraction paying for itself)?
Which are missing but should exist?

Optionally include a Mermaid diagram highlighting seam health if the project has
many seams worth comparing at a glance:

​```mermaid
flowchart LR
subgraph Real["Real seams (2+ adapters)"]
end
subgraph Hypo["Hypothetical seams (1 adapter)"]
S1["Lexer → Parser\nIEnumerator&lt;Token&gt;"]
S2["Parser → Backend\nCompilationUnit"]
end
subgraph Missing["Missing seams"]
S3["CompilerContext\n(shared mutable state)"]
end

    style S3 fill:#f8d7da

```

## Deletion Test Results

Prose section. Which modules are earning their keep? Which are pass-throughs?
What complexity would reappear across callers if a shallow module were deleted?

## Risks & Recommendations

Rank the top three to five concerns by severity. For each, use a level-3 heading.

### Risk 1: <short title> — Severity: High / Medium / Low

Prose: describe the problem using interface/seam/depth/adapter vocabulary, explain
the concrete consequence (change amplification, test fragility, poor locality), and
give a specific remediation with a file or method path where the fix should land.

## Summary

Two to four sentences. What is architecturally strong? What is the single most
important thing to change?
```
````

---

## Output rules

- **Use only the vocabulary from `references/LANGUAGE.md`** — module, interface, depth,
  seam, adapter, leverage, locality. If you catch yourself writing "component", "service",
  "API", or "boundary", stop and reword.
- **Each module gets a level-3 heading**, not a bold prefix. Never write `**ModuleName**`.
- **Every diagram must use the colour convention** defined in the Overview section.
- Write prose in sections — no bullet lists in section bodies.
- Be direct. "This module is shallow and should be deleted" is better than hedging.
- Cite file paths and function/class names when making specific claims.
- Do not pad. If a section has nothing interesting to say, say so in one sentence and move on.
- Do not emit the module inventory internal table verbatim in the final report.
- Write the document to `.context/ARCHITECTURE.md`

---

## Reference files

- `references/LANGUAGE.md` — canonical vocabulary; read before starting.
