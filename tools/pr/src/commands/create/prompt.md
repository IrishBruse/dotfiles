{{repoCwdLine}}

You are running **`pr create`**: open a new GitHub PR from the **current branch** (no existing PR on this head yet). Follow this file.

{{branchLine}}

- Use the **prefetched files** in the workspace root below. They materialize the branch and \`origin/main\` diff from the real repo; do not substitute live \`git\` output from elsewhere.
- The host runs **`gh pr create`** from the **repository directory** after you finish; you only write **`PR.md`** in the workspace.
- Treat **`diff.patch`** as the source of truth for the change; align the title and body with **`branch.txt`**. If **`PULL_REQUEST_TEMPLATE.md`** is present, follow its sections in the body.

{{prefetchedContextSection}}

**Write `PR.md`** in the workspace root:

1. First line: `# <title>` (one line, grounded in **`diff.patch`**, **`branch.txt`**, and work policy if applicable).
2. Blank line, then the full **new** body (markdown), consistent with the diff and any template.

Title and body must be non-empty. The CLI will open `PR.md` for edits, then create the PR on **this** branch.

**Output:** deliver **only** by writing `PR.md` that way. Do not put the title, body, or a long summary in your assistant reply—no JSON or fenced PR text in chat. After writing, you may say at most a token like `done`.
