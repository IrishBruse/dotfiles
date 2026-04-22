# Review command — design

This document describes how **`pr review`** fits the wider CLI and how the review path is structured today versus what the prompts assume will run later.

## Relationship to other commands

- **`pr` with no subcommand** (`infer.ts`) chooses **`create`** or **`update`** from branch state (open PR on current branch → update; otherwise create). It **never** invokes review.
- **`pr review`** is the **only** entry point for the review-comment workflow. Review stays explicit so it is not conflated with create/update follow-ups.

## CLI contract

- **Form:** `pr review <number-or-url>`
- **First positional is required.** If missing, the command errors (`expected a pull request URL or number`).
- Additional arguments are logged as ignored (may be reserved for flags or overrides later).

## Prompt assembly

Review runs by composing two markdown templates from **`tools/pr/prompts/`**:

| Piece | Role |
|--------|------|
| **`shared.md`** | Shared preamble: resolve/inspect PR via `gh`, diff/files, threads; **Final response** machine-parse rules (single fenced `json` block last). |
| **`review.md`** | First-pass review instructions: scope, parallel audit angles (quality, performance, consistency), synthesis sections, post-review validation note. |

Substitution is implemented in **`reviewPrompt.ts`**:

- **`{{prLine}}`** — Built from the CLI target; tells the agent to use `gh pr view`, `gh pr diff`, etc. with that PR.
- **`{{hintBlock}}`** — Currently empty when invoked from `runReview`.
- **`{{workJiraTitleSection}}`** — Optional **work overlay**: non-empty only when **`PR_TITLE_JIRA_KEY`** is set. Markdown is produced by **`buildWorkJiraTitleSection()`** in **`src/work/jiraTitlePolicy.ts`** (same toggle as create; separate from **`prompts/work/create-appendix.md`**, which is create-only).

When **`PR_TITLE_JIRA_KEY`** is unset, **`buildWorkJiraTitleSection`** returns **`""`** — no extra markdown is injected; review prompt assembly does not touch **`prompts/work/`**.

The composed string is the full agent prompt.

## Intended runtime (prompt contract)

The prompts describe an end-to-end flow that is **not fully implemented** in TypeScript yet:

1. Run **`agent`** (Cursor Agent) with the composed prompt (e.g. **`--print`** pattern used elsewhere in this repo).
2. Parse the **last** message for a single fenced **`json`** block with **`title`**, **`body`**, and optionally **`pr`** when the target was not fixed on the argv.
3. Show **title** / **body** in the terminal for human approval.
4. On approval, post via **`gh pr review --comment`** (or equivalent); on cancel, exit without posting.

**`shared.md`** is the source of truth for JSON shape and approval semantics.

## Current implementation status

**`runReview`** today:

- Builds the composed prompt via **`loadReviewAgentPrompt`**.
- Does **not** invoke **`agent`**, does **not** parse JSON, does **not** call **`gh pr review`**.
- Prints a **stub** message (composed length and target) to **`stderr`** and exits successfully.

So: **prompt composition and contracts are in place; orchestration (agent → parse → TTY → GitHub) is still to be wired.**

## Related files

| File | Purpose |
|------|---------|
| `src/commands/review/index.ts` | CLI entry and stub orchestration |
| `src/commands/review/reviewPrompt.ts` | Load templates, expand placeholders |
| `src/work/jiraTitlePolicy.ts` | **`buildWorkJiraTitleSection`** for **`{{workJiraTitleSection}}`** |
| `prompts/shared.md` | Shared gh instructions + JSON fence contract |
| `prompts/review.md` | Review-specific instructions |

## Notes

- **`README.md`** at `tools/pr/` may describe older default-`pr` behavior; **`main.ts`** + **`infer.ts`** are authoritative for invocation. This doc applies to **`pr review`** only.
