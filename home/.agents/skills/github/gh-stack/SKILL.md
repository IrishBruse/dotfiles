---
name: gh-stack
description: Stacked PRs via the `gh stack` extension. Use when PRs depend on each other, when a stack needs syncing or rebasing, or on mention of `gh stack`.
---

# gh stack

A **stack** is a chain of branches, each based on the one below it, submitted as PRs that GitHub tracks as one unit.
Reach for it when a slice cannot review or merge without the slice under it.
Independent slices stay separate PRs off the trunk.

Install with `gh extension install github/gh-stack` when `gh stack --help` reports it missing.

## No TTY

Agent shells have no TTY, so every interactive path hangs or silently takes a default.
The flag that keeps each one headless:

- `gh stack submit --auto` skips the PR editor.
- `gh stack merge --yes` skips the merge wizard.
- `gh stack checkout <arg>` skips the stack picker.
- `gh stack add -m "<message>"` skips the commit editor.
- `gh stack modify` and `gh stack switch` are interactive only. Restructure with `init`, `add`, and `rebase`, or hand them to the user.

## Build

```bash
gh stack init <branch>                 # new stack, add --base <trunk> to move off the default branch
gh stack init feat/a feat/b feat/c     # adopt existing branches, bottom to top
gh stack add -Am "<message>" <branch>  # commit staged work onto a new branch on top
gh stack view --short                  # branches and PR status
```

Branches driven by another tool join a stack without local tracking:

```bash
gh stack link <bottom> <middle> <top>   # branch names, PR numbers, or PR URLs
gh stack link <stack-number> <new-top>  # append to an existing stack
```

## Submit

```bash
gh stack submit --auto
```

`--auto` pushes every branch, opens missing PRs as drafts, chains each base onto the branch below, and creates the stack on GitHub.

Its generated titles carry no NOVACORE key, so walk the stack bottom to top afterwards and load the `pr` skill per branch.
Each branch has an open PR by then, so that is the **update** path.
Update every branch in one pass. Do not ask for confirmation between branches.

`gh stack` owns every base, `submit` and `sync` set them, so `gh pr` commands on a stacked branch leave `--base` alone.

Done when `gh stack view --short` shows an open PR on every branch and each title starts with a NOVACORE key.

## Sync

```bash
gh stack sync           # fetch, cascade-rebase, atomic push, relink PRs
gh stack sync --prune   # also drop local branches for merged PRs
```

`sync` is the push path for a stack, it force-pushes with `--force-with-lease --atomic` itself.

A rebase conflict makes `sync` restore every branch and stop. Resolve it explicitly:

```bash
gh stack rebase              # cascading rebase, whole stack
gh stack rebase --downstack  # trunk up to the current branch only
gh stack rebase --upstack    # current branch up to the top only
gh stack rebase --continue   # after resolving conflicts
gh stack rebase --abort      # restore all branches
```

When a conflict needs intent the diff does not carry, `--abort` and ask.

## Merge and unwind

```bash
gh stack merge --yes --squash   # whole current stack, all-or-nothing
gh stack merge <pr-number>      # everything up to and including that PR
gh stack unstack                # unstack on GitHub and drop local tracking
gh stack unstack --local        # drop local tracking only
```

`merge` is atomic, if one PR cannot merge none of them do. Confirm with the user before merging a stack.

## Navigate

`gh stack bottom`, `down`, `up`, `top`, and `trunk` move between branches of the checked-out stack.
