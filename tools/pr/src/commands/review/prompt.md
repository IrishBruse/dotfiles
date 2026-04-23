# Shared: GitHub PR review (pr-cli)

Follow this preamble for any review flow the CLI launches.

**Review target:** `{{target}}` — PR number (current repo) or full PR URL. The CLI posts the review with this target; all PR data is already in the **workspace root** (your agent cwd).

## Requirements

- Use **only** the **read** list below (workspace root). No `gh` or GitHub API for PR content. No **`glob`**, `codebase_search`, or `read`ing source files from the real repo, `~/.cursor`, or the jira-tickets skill directory—Jira is only in the prefetched `*.md` files here.
- **`PR.md`** is the current PR title/description for context—you **replace it entirely** with the review: `#` summary line, blank line, then the full **GitHub review comment** markdown (e.g. `> Reviewed by Cursor` at the top unless policy says otherwise).

## PR context (prefetched local files)

Your **current working directory** is `{{workspaceDir}}` — a **throwaway copy**; the rest of the repository is not available to tools.

**Read only** these paths **at the workspace root** (if a file is missing, it was not prefetched). Do not search the tree for anything else.

| Read                                | Contents                                                                                      |
| ----------------------------------- | --------------------------------------------------------------------------------------------- |
| `diff.patch`                        | Full unified diff — primary evidence.                                                         |
| `files.json`                        | Changed paths in this PR.                                                                     |
| `PR.md`                             | **Prefetched** PR text. **Replace entirely** with `# …` review summary + full review comment. |
| `commits.txt`                       | One line per commit: SHA, subject, optional body.                                             |
| `checks.json`                       | `statusCheckRollup` — CI pass/fail, job names, log URLs.                                      |
| `comments.md`                       | Inline review + conversation (path:line, hunks, bodies).                                      |
| `jira-tickets-board.md`             | Only if present — board snapshot.                                                             |
| `{KEY}.md` (e.g. `NOVACORE-123.md`) | Only if present — per-key ticket context from the CLI prefetch.                               |

Do not run `gh pr …` again.

Parallel subagents share this workspace.

Avoid repeating feedback already in `comments.md`.

## Final deliverable

Overwrite **`PR.md`** in the workspace root. The CLI reads it after you finish—do not rely on chat for posting.

Title (`# …` line) and body must be **non-empty**. The human approves in VS Code preview, then the CLI runs `gh pr review --comment`.

# First-pass review (`pr review`)

You are running **`pr review`**: first-pass review of the PR above. Complete the analysis below, then satisfy **Final deliverable** (**`PR.md`** only).

## 1. Scope

1. **Primary:** **`diff.patch`** and **`files.json`** (and `PR.md` for stated intent). Do **not** `read` files from the product repo; the diff is the code window you get.
2. **Stay in scope:** Changes this PR introduces; do not chase unrelated code outside the diff unless you infer a risk only from the patch text.

## 2. Parallel subagents (read-only)

Launch three subagents in parallel. They report only; they do not edit code.

### Agent A: Code quality

Logic clarity, naming, unnecessary complexity, defensive over-engineering, weak typing (`any`, loose casts).

### Agent B: Performance

N+1, hot-loop cost, concurrency/`await`, memory in hot paths, noisy logging in tight loops.

### Agent C: Consistency

Project patterns, DRY, ergonomics of new public surfaces.

## 3. Synthesis

Consolidate into **`PR.md`** body (after the `# …` line):

1. **Executive summary** — merge posture (e.g. safe / needs changes / nits).
2. **Actionable suggestions** — specific; fenced code only when it helps.
3. **Discussion points** — architecture or product questions.

The **`# …`** line should mirror the gist of the review.

## 4. Post-review validation

If you ran any checks locally, note what ran or was skipped. (Default: read-only unless the user asked for fixes.)
