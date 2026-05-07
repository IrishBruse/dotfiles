---
name: codebase-architect
description: >
  Analyzes a codebase and generates an interactive treemap visualization of its architecture —
  showing module depth, interface surfaces, and structural relationships at a glance.
  Use this skill whenever the user asks to: visualize a codebase, map repo structure, show
  module architecture, generate a bundle/dependency map, analyze code organization, create an
  interactive diagram of a project, or understand what modules exist and how deep they are.
  Also triggers on phrases like "show me the repo", "what does this codebase look like",
  "architecture overview", or "module map". The output is a self-contained HTML file with
  a zoomable treemap — clicking a module header shows its interface, clicking a child tile drills in,
  Alt+click on a folder header zooms that folder, and breadcrumbs zoom out.
---

# Codebase Architect Skill

Produces a **self-contained interactive HTML treemap** of a codebase. Inspired by webpack
bundle analyzer. Uses the vocabulary from the project's module-depth language spec:
Module, Interface, Depth, Seam, Adapter, Leverage, Locality.

## Vocabulary (use these terms exactly in generated UI and output)

| Term          | Meaning                                                                                         |
| ------------- | ----------------------------------------------------------------------------------------------- |
| **Module**    | Anything with an interface and an implementation (function, class, package, service)            |
| **Interface** | Everything a caller must know: types + invariants + error modes + config + perf characteristics |
| **Depth**     | Leverage at the interface — behaviour per unit of interface a caller must learn                 |
| **Seam**      | Where a module's interface lives; place where behaviour can vary without editing                |
| **Adapter**   | Concrete thing satisfying an interface at a seam                                                |
| **Leverage**  | What callers gain from depth — capability per unit of interface learned                         |
| **Locality**  | What maintainers gain — change concentrated at one place, not spread across callers             |

## Output

A single `.html` file that is:

- A **colour-coded zoomable treemap** (area ∝ lines of code / file size)
- **Click module header** → slide-in panel showing its **Interface** (exports, types, public symbols)
- **Click a child tile** → drill into that module (treemap cells are edge-to-edge; there is no empty folder body to click)
- **Alt+click folder header** → zoom that directory without opening the panel
- Breadcrumb nav to zoom back out
- Depth indicator per tile (shallow → red, deep → green, unknown → dark neutral tile with grey legend cue)
- Legend explaining the colour scheme

## Workflow

### Step 1 — Scan the repo

Run the bundled analysis script against the target path:

```bash
python3 /mnt/skills/[skill-path]/scripts/analyze.py <repo-path> > /tmp/arch_data.json
```

Or if the skill is copied to a working directory:

```bash
python3 scripts/analyze.py <repo-path> > /tmp/arch_data.json
```

The script outputs a JSON tree. See `references/data-schema.md` for the full schema.

If the repo path is not provided, ask the user: "What is the path to the codebase you want to visualize?"

### Step 2 — Read the JSON

Load `/tmp/arch_data.json`. It has this top-level shape:

```json
{
  "name": "repo-root",
  "path": "/abs/path",
  "size": 12345,
  "loc": 8900,
  "children": [ ... ],
  "interface": { "exports": [], "imports": [], "symbols": [] },
  "depth_score": 0.6,
  "module_type": "directory"
}
```

### Step 3 — Generate the HTML

Use the template in `references/html-template.md` as the basis.
The template uses D3 v7 (from CDN) for the treemap layout.

Key generation rules:

- Embed the JSON directly as `const DATA = { ... };` in the `<script>` block
- Tile **area** maps to `node.loc` (lines of code); fall back to `node.size` (bytes) if loc is 0
- **Colour** maps to `node.depth_score`:
  - 0.0–0.3 → warm red `#e05252` (shallow / pass-through)
  - 0.3–0.6 → amber `#e0a832` (moderate depth)
  - 0.6–0.8 → teal `#32a88c` (deep)
  - 0.8–1.0 → vivid green `#32c85a` (very deep)
  - unknown / -1 → dark neutral `#2a3142` (reads as empty space, not a slab; legend keeps a grey border cue)
- **Directories** → transparent tile fill plus light outline; **no** centred ghost title under children (name only in the header strip and on leaf tiles)
- **Draw order** → all leaf rects first (large-under-small), then header chrome on a top SVG layer so titles are not covered by child rects
- **Click tile header** → open interface panel (right side-drawer); **Alt+click** on a folder header → zoom into that folder
- **Click a child tile** (leaf or nested group rect) → zoom into that node's children when it has children
- Show a **breadcrumb** at the top: `root > src > components > Button`
- Show **LOC count and depth label** inside each tile when space allows

### Step 4 — Write output

Save the HTML to `/mnt/user-data/outputs/architecture.html` and present it to the user.

---

## Interface Panel Content

When a user clicks a module header, populate the panel with:

```
MODULE: <name>
Path:   <relative path>
LOC:    <lines of code>
Depth:  <depth label>  [●●●○○]

INTERFACE (what callers must know)
  Exports:   <list of exported symbols>
  Re-exports:<if any>
  Key Types: <type names>

SEAM INDICATORS
  Adapters found: <count>
  Test coverage:  <if detectable>

IMPLEMENTATION NOTES
  Direct deps: <count of imports>
  Unique importers: <count of files that import this>

DEPTH ANALYSIS
  "<one sentence assessing leverage>"
```

If the interface data is sparse (binary files, assets), show:
`No interface data — non-source file`

---

## Depth Scoring Heuristic (used by analyze.py)

The script approximates depth as:

```
depth_score = clamp(
  (exported_symbols / max(1, total_lines / 50))   # interface surface ratio
  * (1 - (import_count / max(1, loc / 20)))        # penalise pass-throughs
  * locality_bonus                                  # +0.2 if used by 3+ other modules
, 0, 1)
```

This is a heuristic — not ground truth. The UI labels it "estimated depth" accordingly.

---

## Language & Tone in the UI

- Use the vocabulary table above throughout the UI (tooltips, panel headers, legends)
- Avoid: "component", "service", "API", "boundary", "signature"
- The legend should explain: "Depth = leverage at the interface. Green = more behaviour behind a smaller surface. Red = interface nearly as complex as the implementation."

---

## Error Cases

| Situation                                | Behaviour                                       |
| ---------------------------------------- | ----------------------------------------------- |
| Binary / asset files (.png, .woff, .mp4) | Include in treemap by size; no interface panel  |
| Empty directories                        | Omit from treemap                               |
| Unrecognised language                    | Include by file size; interface = unknown       |
| Repo > 50 000 files                      | Warn user; offer to analyse only `src/` subtree |
| No repo path given                       | Ask the user before proceeding                  |

---

## Reference Files

- `references/data-schema.md` — Full JSON schema with field descriptions
- `references/html-template.md` — Complete D3 treemap HTML template to embed data into
- `scripts/analyze.py` — Python script that walks a repo and produces the JSON

## Finish

Once everything is finished before ending run

```bash
open <path to html>
```
