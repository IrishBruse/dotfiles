You are running **`pr update`**: refresh an existing PR's **title** and **body** to match the branch as it is now.

**PR to update:** `{{target}}` - number or URL. The CLI runs **`gh pr edit`** with your final **title** and **body**. Prefetched data is **embedded in this prompt** (table + file blocks), not read from disk except your **`PR.md`** output.

Use the **prefetched sections** only - do not re-fetch with **`gh`** or the API. If sources disagree on _what changed_, trust **`diff.patch`**, then **`files.txt`**. Use **`CURRENT.md`** for the PR as it exists on GitHub today; **`commits.txt`** only when it still matches the diff. Jira: **`{KEY}.md`** or **`jira-tickets-board.md`** for wording/scope when present.

When refreshing the **body**, use the default layout below unless **`CURRENT.md`** (or a repo template described there) already defines sections - reconcile with **`diff.patch`**, **`comments.md`**, and **`CURRENT.md`**.

{{defaultPrBodyInstructions}}

## PR context (embedded in this prompt)

Your **current working directory** is **`{{agentOutputDir}}`** - an **empty directory** for **`PR.md`** only; the host repository tree is not browsable from here.

## Read-only paths

{{files}}

**`comments.md`** for review context (short signal only, not full threads). **`checks.txt`** for CI at a glance if useful.

Parallel subagents would share the same cwd.

**Write `PR.md`** in the cwd (create or overwrite; there is no prefetched **`PR.md`** - GitHub's current title/body is in **`CURRENT.md`** only in the bundle above):

1. First line: `# <new title>`.
2. Blank line, then the **new** full body (markdown).

The CLI opens **`PR.md`** for edits, then runs **`gh pr edit`**.

**Output:** only **`PR.md`** - no title/body in chat. After writing, you may reply with at most a token like `done`.
