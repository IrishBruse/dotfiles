**Repository (`gh pr create` cwd):** `{{repoRoot}}` - same path the CLI uses for **`gh pr create`**. Git operations for the diff and branch are from this tree.

You are running **`pr create`**: open a new GitHub PR from the **current branch** (no existing PR on this head yet). Follow this file.

**Source branch:** `{{branch}}` - the CLI runs **`gh pr create`** from the **repository directory** (see above), so the new PR's head is **this branch**. There is no GitHub PR on this branch yet.

**Prefetched context** - Everything under **Create context** is embedded in this prompt (table + file blocks). It captures this branch vs **`origin/main`**; do not substitute ad hoc **`git`** output. You only write **`PR.md`** in your **current working directory** (`{{agentOutputDir}}`); the host runs **`gh pr create`** from the repo directory after you finish.

**Source of truth:** **`diff.patch`** decides what ships. The **Source branch** line is the PR head. If **`PULL_REQUEST_TEMPLATE.md`** appears in the bundle, align the **body** with it from the diff; do not contradict the diff. Otherwise use the default layout. If **`diff.patch`** is empty or tiny, say so - do not invent scope.

{{defaultPrBodyInstructions}}

## Create context

Your **current working directory** is **`{{agentOutputDir}}`** - an **empty directory** used only for **`PR.md`** output; nothing from the real repo is mirrored on disk.

{{files}}

**You write (only):** `PR.md` at that root: `# <title>`, blank line, full body. Both non-empty.

Do not run **`gh pr ...`** (no PR yet). Facts about the change come from **`diff.patch`**, not the branch name or template alone.

Parallel subagents would share the same cwd.

**Write `PR.md`** in the agent cwd:

1. First line: `# <title>` (grounded in **`diff.patch`** and **Source branch**).
2. Blank line, then the full **new** body (markdown).

The CLI opens **`PR.md`** for edits, then creates the PR on **this** branch.

**Output:** only **`PR.md`** - no title/body in chat (no JSON or fenced PR text). After writing, you may reply with at most a token like `done`.
