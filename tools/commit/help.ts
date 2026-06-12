export function printHelp(): void {
  console.error(`commit - suggest commit messages and split staged work into PRs

Usage:
  commit [options]
  commit push [options]

Commands:
  push             Commit and push, or push when already committed

Options:
  -p, --print      Show the PR split plan without committing or pushing
  -h, --help       This message

Behavior:
  Uses staged changes when present; otherwise stages and commits unstaged and untracked changes.
  With staged changes, prints a commit subject to stdout (for prepare-commit-msg).
  When run interactively with multiple staged slices, commits each slice in plan order.
  Use -p or --print to preview the split plan on stderr without committing.
  Use commit push to run git push after a successful split commit, or when the
  working tree is clean but the branch is ahead of its upstream.
`);
}
