#!/usr/bin/env fish

set -l repo (path dirname (status filename))
source $repo/commit-lib.fish

cd $repo; or exit 1

if not git rev-parse --is-inside-work-tree >/dev/null 2>&1
    echo "commit: not a git repository" >&2
    exit 1
end

if test (count $argv) -gt 0
    set -l msg (string join ' ' -- $argv)
    if test -z (git diff --cached --name-only)
        if test -z (git status --porcelain)
            echo "commit: nothing to commit" >&2
            exit 1
        end
        git add -A
    end
    git commit -m "$msg"
    echo $msg
    exit $status
end

set -l staged (git diff --cached --name-only)
if test (count $staged) -eq 0
    if test -z (git status --porcelain)
        echo "commit: nothing to commit" >&2
        exit 1
    end
    git add -A
    set staged (git diff --cached --name-only)
end

set -l msg (commit_message $staged)
git commit -m "$msg"
echo $msg
