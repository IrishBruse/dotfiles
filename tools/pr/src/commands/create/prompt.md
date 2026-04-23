{{repoCwdLine}}

You are running **`pr create`**: open a new GitHub PR from the **current branch** (no existing PR on this head yet). Follow this file.

{{branchLine}}

- Use the **prefetched files** in the workspace root below. They materialize the branch and \`origin/main\` diff from the real repo; do not substitute live \`git\` output from elsewhere.
- The host runs **`gh pr create`** from the **repository directory** after you finish; you only write **`PR.md`** in the workspace.

**Source of truth / precedence:** **`diff.patch`** is primary for what will ship. The **Source branch** line above names the PR head ref. If **`PULL_REQUEST_TEMPLATE.md`** exists, use it to structure the **body** (headings, sections)—fill it from the diff; do not contradict the diff with template boilerplate.

- If **`diff.patch`** is empty or very small, say so honestly in the body (e.g. config-only, revert, merge-base alignment) instead of inventing scope.

{{prefetchedContextSection}}

**Write `PR.md`** in the workspace root:

1. First line: `# <title>` (one line, grounded in **`diff.patch`** and the **Source branch** line).
2. Blank line, then the full **new** body (markdown), consistent with the diff and any template.

Title and body must be non-empty. The CLI will open `PR.md` for edits, then create the PR on **this** branch.

**Output:** deliver **only** by writing `PR.md` that way. Do not put the title, body, or a long summary in your assistant reply—no JSON or fenced PR text in chat. After writing, you may say at most a token like `done`.
