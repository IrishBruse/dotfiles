**Repository (`gh pr create` cwd):** `{{cwd}}` - same path the CLI uses for **`gh pr create`**. Git operations below run from this tree.

You are running **`pr create`**: open a new GitHub PR from the **current branch** (no existing PR on this head yet).

**Source branch:** `{{branch}}` - the CLI runs **`gh pr create`** from the repository directory above, so the new PR's head is **this branch**. There is no GitHub PR on this branch yet.

**Prefetched context** - Everything under **Create context** is embedded below (shell output). It captures this branch vs **`origin/main`**; do not substitute ad hoc **`git`** output. You only write **`PR.md`** in your **current working directory** (`{{agentOutputDir}}`); the host runs **`gh pr create`** from the repo directory after you finish.

**Source of truth:** the diff below decides what ships. The **Source branch** line is the PR head. If a repo template appears in the bundle, align the **body** with it from the diff; do not contradict the diff. Otherwise use the default layout. If the diff is empty or tiny, say so - do not invent scope.

?work: ## PR title (work policy - NOVACORE)
?work:
?work: The `# …` title line in **PR.md** must start with **`NOVACORE-<digits>`** (example: `NOVACORE-123`). The CLI will reject anything else.
?work:
?work: ## When running **`pr create`**
?work:
?work: - **Pick the ticket from the jira-tickets skill, grounded in the diff.** Read **`jira-tickets-board.md`** in this workspace (snapshot of the skill board). Match **your change** in the diff to the **one** ticket whose summary/title best fits that scope (prefer **In progress** for your work when it clearly aligns). The **`# …` title** must use that ticket's **`NOVACORE-<digits>`** key.
?work: - If **`jira-tickets-board.md`** is missing, fall back to the **Source branch** name and diff text for the key - still do not invent a number that does not appear in those sources.
?work: - Use the **Source branch** line only to confirm or disambiguate when the board and diff already point at the same issue.
?work:

**Default body layout** (use this unless a repo template dictates a different structure - then align with that file; this block is guidance only).

**`## Summary`** - **2-3 lines**: what changes and **why** (reviewers, not an essay). No file paths, no changed-file inventories. If the diff is empty or trivial, say so briefly. Do not invent scope.

**`##` sections after Summary** - A **small** number of topical headings (usually **2-4** for a medium change; **1** is fine for a focused PR). Name by **theme**, not by file or folder.

**Inside each section:** lead with one or two short sentences, then **2-5 bullets** for distinct ideas. Avoid long paragraphs or long flat file lists.

**Optional** - **`## Contract changes`** when API- or contract-facing work matters; omit if not.

**Do not:** pad Summary; add Testing checklists; TODO or follow-up lists; Jira or title-validator meta.

## Create context

### `diff.patch` (`git diff origin/main` - source of truth)

```!git diff origin/main
```

### Repo PR template (if any)

```!sh -c 'for f in .github/PULL_REQUEST_TEMPLATE.md .github/pull_request_template.md docs/pull_request_template.md; do test -f "$f" && { echo "From $f:"; cat "$f"; exit 0; }; done; echo "(none)"'
```

{{jiraContext}}

Your **current working directory** is **`{{agentOutputDir}}`** - an **empty directory** used only for **`PR.md`** output; nothing from the real repo is mirrored on disk.

**You write (only):** `PR.md` at that root: `# <title>`, blank line, full body. Both non-empty.

Do not run **`gh pr ...`** (no PR yet). Facts about the change come from the diff above, not the branch name or template alone.

**Write `PR.md`** in the agent cwd:

1. First line: `# <title>` (grounded in the diff and **Source branch**).
2. Blank line, then the full **new** body (markdown).

The CLI opens **`PR.md`** for edits, then creates the PR on **this** branch.

**Output:** only **`PR.md`** - no title/body in chat (no JSON or fenced PR text). After writing, you may reply with at most a token like `done`.
