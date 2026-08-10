---
name: commits
description: Split uncommitted work into multiple atomic commits matching recent history.
disable-model-invocation: true
---

# Commits

Turn the dirty tree into a short stack of **atomic** commits.

Invoking this skill is approval to commit. Push only when the user asked in the same request.

## Hard rules

- Prefer **more than one** commit. Split by concern. One commit only when the whole dirty tree is a single inseparable change.
- Match recent `git log` subject style (tone, tense, prefixes). Do not invent a house format the repo does not use.
- Stage named paths or hunks only. Never `git add .` / `git add -A`.
- Pass every message via HEREDOC.
- Leave secrets unstaged (`.env`, credentials, tokens) and warn once.
- No amend, no skipped hooks, no force, no config changes, no interactive git (`-i`).

### Step 1: Survey

Run in parallel:

```bash
git status -sb
git diff
git diff --cached
git log -8 --oneline
```

Account for every modified and untracked path. Note the recent message pattern.

Done when every dirty path is listed and the style pattern is clear.

### Step 2: Slice

Group the dirty tree into **atomic** slices: one concern each, ordered so foundations land before consumers.

Draft a subject for each slice in the repo's style.

Done when every dirty path sits in exactly one slice (or an explicit leftover left unstaged), and there are at least two slices unless the tree is inseparable.

### Step 3: Commit each slice

For each slice, in order:

1. Stage only that slice's paths or hunks.
2. Commit:

```bash
git commit -m "$(cat <<'EOF'
Subject line here.

Optional body focusing on why.
EOF
)"
```

3. On hook failure: fix, then create a **new** commit.

Done when every planned slice has its own commit on HEAD.

### Step 4: Report

```bash
git status -sb
git log -<N> --oneline
```

Use `N` = number of new commits. Reply with each new subject and anything still dirty.

Done when the user can see every new subject and knows what remains unstaged.
