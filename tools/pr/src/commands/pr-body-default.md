**Default body layout** (use this unless `PULL_REQUEST_TEMPLATE.md` in the repo dictates a different structure—then align with that file; this block is guidance only).

**`## Summary`** — **2–3 lines**: what changes and **why** (reviewers, not an essay). No file paths, no “changed `foo.ts` / `bar.ts`” inventories. If `diff.patch` is empty or trivial, say so briefly. Do not invent scope.

**`##` sections after Summary** — A **small** number of topical headings (usually **2–4** for a medium change; **1** is fine for a focused PR). Name by **theme** (e.g. `## Corbu and skills`, `## User-facing docs`)—not by file, folder, or “Module A / Module B” unless that truly matches how the work breaks down.

**Inside each section, aim for a readable middle ground:**

- Lead with **one or two short sentences** of intent so the section is skimmable.
- Then use **a handful of bullets** (about **2–5** per section) for **distinct ideas**: behaviors moved, policy changes, what was removed or simplified—not one bullet per file. One line per bullet; sub-bullets only when nesting adds clarity, not for every line item.
- **Avoid** a single long paragraph that packs everything into dense prose (hard to review). **Also avoid** long flat lists of files or micro-changes; that’s the other extreme.
- If a section is one unified idea, a **short paragraph** only is OK—no need to force bullets.

**Optional** — **`## Contract changes`** when API- or contract-facing work matters; omit if not.

**Do not:** pad Summary; add **Testing** / run-this-command checklists; TODO or follow-up laundry lists; Jira or title-validator meta. On **`pr update`**, remove stale testing blocks from **`CURRENT.md`** (GitHub snapshot) when carrying content forward into **`PR.md`**.
