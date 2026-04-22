# Shared: GitHub PR review (pr-cli)

This block is prepended to command-specific instructions. Follow it for any review flow the CLI launches.

{{prLine}}

{{hintBlock}}{{workJiraTitleSection}}

## Requirements

- `gh` CLI must be installed and authenticated for the repository hosting the PR.

## Resolve and inspect the PR

```bash
gh pr view <number-or-url> --json number,title,author,baseRefName,headRefName,body,state,labels,reviewRequests
```

## Diff and files

```bash
gh pr diff <number-or-url>
gh pr view <number-or-url> --json files
```

For large diffs, review file-by-file as needed (for example `gh api repos/{owner}/{repo}/pulls/<number>/files`).

## Existing threads

```bash
gh pr view <number-or-url> --json reviews,comments
```

Avoid duplicating feedback that is already under discussion.

## Final response (required — machine parse)

When your review text is ready for GitHub, your **last** message must contain **only** one markdown fenced code block tagged `json`. Do not put prose, headings, or commentary outside that block. Do not write anything after the closing fence.

The CLI will show **title** and **body** to the user; they approve or cancel before `gh pr review --comment` runs.

Shape (valid JSON strings; use `\n` inside **body** for newlines if you emit a single-line string):

```json
{
  "title": "Short summary for the review comment",
  "body": "> Reviewed by Cursor\n\n…markdown review…",
  "pr": "42"
}
```

- **title** — Short line for the terminal preview (often mirrors the first line or summary).
- **body** — Full markdown for the PR review comment, including `> Reviewed by Cursor` at the top unless the user’s policy says otherwise.
- **pr** — Include when the review target was **not** fixed by the CLI argv (omit or repeat the same value when the user already passed an explicit PR number or URL on the command line; the CLI will use argv in that case).

If your final message contains anything other than that single fenced `json` block, the CLI cannot safely post the comment for human approval.
