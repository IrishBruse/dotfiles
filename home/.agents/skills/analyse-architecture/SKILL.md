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

Structure the report exactly as follows. Use prose, not bullet lists, for each section body.

---

```md
# Architecture Analysis: <Project Name>

## Overview

One paragraph. What is this project doing, and what is the dominant structural pattern
(layered, pipeline, plugin host, hexagonal, etc.)? Use module/interface/seam vocabulary.

## Module Inventory

For each significant module: name, interface summary, depth verdict, seam location,
adapter count. Two to five sentences per module. Group related modules under a subheading
if it aids clarity.

## Depth Assessment

Where does the codebase have real leverage? Where are interfaces nearly as complex as
their implementations? Cite specific modules by name. Explain what "depth" means in
context so the findings are actionable.

## Seam Quality

Which seams are real (two+ adapters or a clear variation axis)? Which are hypothetical
(one adapter — and is the abstraction paying off)? Which are missing but should exist?

## Deletion Test Results

Which modules are earning their keep? Which are pass-throughs? What complexity would
reappear across callers if a shallow module were deleted?

## Risks & Recommendations

Rank the top three to five concerns by severity. For each: describe the problem in terms
of interface/seam/depth/adapter, explain the concrete consequence (change amplification,
test fragility, poor locality), and suggest a specific remediation.

## Summary

Two to four sentences. What is architecturally strong? What is the single most important
thing to change?
```

---

## Output rules

- **Use only the vocabulary from `references/LANGUAGE.md`** — module, interface, depth,
  seam, adapter, leverage, locality. If you catch yourself writing "component", "service",
  "API", or "boundary", stop and reword.
- Write in prose. No bullet lists in section bodies.
- Be direct. "This module is shallow and should be deleted" is better than hedging.
- Cite file paths and function/class names when making specific claims.
- Do not pad. If a section has nothing interesting to say, say so in one sentence and move on.
- Do not emit the module inventory table verbatim — convert it to flowing prose in the
  Module Inventory section.
- Write the document to `.context/ARCHITECTURE.md`

---

## Reference files

- `references/LANGUAGE.md` — canonical vocabulary; read before starting.
