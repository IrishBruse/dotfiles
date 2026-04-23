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

A single file **`prompt.md`** next to **`reviewPrompt.ts`** in **`src/commands/review/`** contains the full template (shared **Resolve and inspect** / **`Title.md`+`Body.md`** contract first, then first-pass review body).

Substitution is implemented in **`reviewPrompt.ts`**:

- **`{{prLine}}`** — Built from the CLI target; prefetched files replace ad-hoc `gh` in-agent.
- **`{{hintBlock}}`** — Currently empty when invoked from `runReview`.
- **`{{workJiraTitleSection}}`** — Optional **work overlay**: non-empty only when **`PR_TITLE_JIRA_KEY`** is set. Markdown is produced by **`buildWorkJiraTitleSection()`** in **`../create/work/jiraTitlePolicy.ts`** (same toggle as create; separate from create’s **`work/prompt.md`** appendix, which is create-only).

When **`PR_TITLE_JIRA_KEY`** is unset, **`buildWorkJiraTitleSection`** returns **`""`** — no extra markdown is injected.

The expanded string is the full agent prompt.

## Intended runtime (prompt contract)

1. Prefetch PR files into a temp workspace (**`prepareReviewWorkspace`**).
2. Run **`agent`** with **`cwd`** set to that workspace (**`runAgentPrint`**).
3. Read **`Title.md`** and **`Body.md`** from the workspace (**`readAgentTitleAndBody`**).
4. Show **title** / **body** in the terminal for human approval.
5. On approval, post via **`gh pr review --comment`**; on cancel, exit without posting.

The first section of **`prompt.md`** (through **Final deliverable**) is the source of truth for file names and approval semantics.

## Current implementation status

**`runReview`**:

- Builds the composed prompt via **`loadReviewAgentPrompt`**.
- Runs **`agent`** via **`runAgentPrint`** with **`--trust`**; stream to **stderr**; timeout **`PR_AGENT_TIMEOUT_MS`**.
- Reads **`Title.md`** / **`Body.md`**; writes **`pr-review-<n>.json`** for retry (and **`lastError`** if `gh` failed).
- TTY: **`printMarkdownPreview`** + **`waitForPostOrCancel`**; **`PR_REVIEW_NO_CONFIRM=1`** skips preview.
- On confirm: **`gh pr review`**, **`--comment -F`** (temp file with **body**).

## Related files

| File | Purpose |
|------|---------|
| `src/commands/review/index.ts` | Orchestration |
| `src/commands/review/reviewPrompt.ts` | Load **`prompt.md`**, expand placeholders |
| `../create/work/jiraTitlePolicy.ts` | **`buildWorkJiraTitleSection`** for **`{{workJiraTitleSection}}`** |
| `prompt.md` | Full template: shared + first-pass review |
| `src/agentOutputFiles.ts` | Read **`Title.md`** / **`Body.md`** → **`PrReviewJson`** |
| `src/runAgentPrint.ts` | Subprocess **agent** (stream-json + partial) |
| `src/agentStreamFormat.ts` | NDJSON → stderr (model, assistant stream, tools) |
| `src/reviewPreview.ts` | Marked terminal preview + raw TTY one-key confirm |

## Notes

- **`README.md`** at `tools/pr/` may describe older default-`pr` behavior; **`main.ts`** + **`infer.ts`** are authoritative for invocation. This doc applies to **`pr review`** only.
