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

A single file **`prompt.md`** next to **`reviewPrompt.ts`** in **`src/commands/review/`** contains the full template (shared **Resolve and inspect** / JSON contract first, then first-pass review body).

Substitution is implemented in **`reviewPrompt.ts`**:

- **`{{prLine}}`** — Built from the CLI target; tells the agent to use `gh pr view`, `gh pr diff`, etc. with that PR.
- **`{{hintBlock}}`** — Currently empty when invoked from `runReview`.
- **`{{workJiraTitleSection}}`** — Optional **work overlay**: non-empty only when **`PR_TITLE_JIRA_KEY`** is set. Markdown is produced by **`buildWorkJiraTitleSection()`** in **`../create/work/jiraTitlePolicy.ts`** (same toggle as create; separate from create’s **`work/prompt.md`** appendix, which is create-only).

When **`PR_TITLE_JIRA_KEY`** is unset, **`buildWorkJiraTitleSection`** returns **`""`** — no extra markdown is injected.

The expanded string is the full agent prompt.

## Intended runtime (prompt contract)

The prompts describe an end-to-end flow that is **not fully implemented** in TypeScript yet:

1. Run **`agent`** (Cursor Agent) with the composed prompt (e.g. **`--print`** pattern used elsewhere in this repo).
2. Parse the **last** message for a single fenced **`json`** block with **`title`**, **`body`**, and optionally **`pr`** when the target was not fixed on the argv.
3. Show **title** / **body** in the terminal for human approval.
4. On approval, post via **`gh pr review --comment`** (or equivalent); on cancel, exit without posting.

The first section of **`prompt.md`** (through **Final response** / JSON contract) is the source of truth for JSON shape and approval semantics.

## Current implementation status

**`runReview`**:

- Builds the composed prompt via **`loadReviewAgentPrompt`**.
- Runs **`agent -p`** (or **`PR_AGENT`**, with **`cursor-agent`** fallback) via **`runAgentPrint`**; timeout **`PR_AGENT_TIMEOUT_MS`**.
- Parses the last **`json`** fence with **`parseLastJsonFence`**; expects **`title`** and **`body`**.
- If interactive TTY and **`PR_REVIEW_NO_CONFIRM`** is unset, **`printMarkdownPreview`** then **`waitForPostOrCancel`**; otherwise with **`PR_REVIEW_NO_CONFIRM=1`**, skips preview and posts.
- On confirm: **`gh pr review`**, PR from argv, **`--comment -F`** (temp file with **body**).

## Related files

| File | Purpose |
|------|---------|
| `src/commands/review/index.ts` | Orchestration |
| `src/commands/review/reviewPrompt.ts` | Load **`prompt.md`**, expand placeholders |
| `../create/work/jiraTitlePolicy.ts` | **`buildWorkJiraTitleSection`** for **`{{workJiraTitleSection}}`** |
| `prompt.md` | Full template: shared + first-pass review |
| `src/parseJsonFence.ts` | Last markdown `json` code fence → parsed object |
| `src/runAgentPrint.ts` | Subprocess **agent** in print mode |
| `src/reviewPreview.ts` | Marked terminal preview + raw TTY one-key confirm |

## Notes

- **`README.md`** at `tools/pr/` may describe older default-`pr` behavior; **`main.ts`** + **`infer.ts`** are authoritative for invocation. This doc applies to **`pr review`** only.
