---
name: split-to-prs
description: Split current work into small reviewable PRs. Use when the user asks to split a chat, set of changes, branch, or PR.
---
# Split to PRs

Turn one pile of work into a few small PRs.

## Hard rules

- Do not create branches, commit, push, or open PRs until the user approves the split plan.
- Never discard user work. No destructive git commands (`reset --hard`, `clean -fdx`, branch deletion, force-push, history rewrite) without explicit approval.
- Always save a recoverable snapshot before moving work around. This often starts from dirty work on `main`, so do not assume there is already a safe branch.
- Stage only named files or hunks. No `git add .` / `git add -A`.

### Step 1: Check the state

Compare the current work to the repo's default branch, including committed and uncommitted changes.
Summarize the real slices you see, and use the chat history to recover intent.

Before proposing slices, find ownership signals for the touched paths.
Check `CODEOWNERS`, nested ownership files, `tools/ownership/PRODUCTOWNERS`, or repo equivalents.
Use them to identify natural reviewer boundaries.

Done when every touched path is accounted for in a proposed slice or an explicit leftover bucket.

### Step 2: Propose the split

Use judgment on detail. Usually PR titles are enough.
Add a one-line scope note only when a title is unclear.
Show a Mermaid diagram when there are multiple slices.

Optimize for reviewer-aligned PRs with minimal unrelated diff.
Split independent owners or concerns, keep tightly coupled changes together.
When stacking is necessary, order foundations before consumers.

Default to independent PRs off the default branch. Stack PRs only when the dependency is real.

Ask for approval before starting.

Done when the user approves the plan.

### Step 3: Execute the split

If there is uncommitted work, save a recoverable snapshot without changing the working tree:

```bash
SHA=$(git stash create "pre-split")
if [ -n "$SHA" ]; then
  git update-ref "refs/backup/pre-split-$(date +%s)" "$SHA"
fi
```

For each approved slice, in plan order:

1. Create a branch from the right base.
2. Stage and commit only the planned files or hunks.
3. Push the branch.
4. Load the `pr` skill and follow the **compose** **create** path for that branch.

Each slice is a new branch with no open PR, so always use **create**, not update.
Do not hand-compose `gh pr create` flags outside the `pr` skill.

Done when every approved slice has a pushed branch and a draft PR URL.

### Step 4: Report back

Keep it short: PR titles and URLs, plus anything left on the starting branch or working tree.
Do not delete the backup ref or original branch unless the user asks.

Done when the user has every PR URL and knows what work remains local.
