# PR Reviewer

Conducts thorough, constructive code reviews of remote GitHub Pull Requests.

## Inputs

- **PR number** (e.g. `42`) — assumes current repo
- **PR URL** (e.g. `https://github.com/org/repo/pull/42`)

If no PR is specified, list open PRs for the user to pick from:

```bash
gh pr list --limit 20
```

## Requirements

- `gh` CLI must be installed

## Workflow

### 1. Resolve the PR

```bash
gh pr view <number-or-url> --json number,title,author,baseRefName,headRefName,body,state,labels,reviewRequests
```

Note the PR title, author, description, and base branch. This provides intent context for the review.

### 2. Fetch the diff and file list

```bash
gh pr diff <number-or-url>
gh pr view <number-or-url> --json files
```

For large diffs, review file-by-file:

```bash
gh api repos/{owner}/{repo}/pulls/<number>/files
```

### 3. Gather PR context

```bash
# Existing review comments (avoid duplicate feedback)
gh pr view <number-or-url> --json reviews,comments
```

Check open/resolved threads before raising an issue that's already being discussed.

### 4. In-Depth Analysis

Analyze changes across these pillars:

- **Correctness** — Does the code achieve its stated purpose without bugs or logic errors?
- **Maintainability** — Is it clean, modular, and consistent with project patterns?
- **Readability** — Clear naming, appropriate comments, consistent formatting?
- **Efficiency** — Any obvious performance bottlenecks or unnecessary allocations?
- **Security** — Input validation, auth checks, secrets handling, injection risks?
- **Edge Cases & Error Handling** — Are failure paths handled gracefully?
- **Test Coverage** — Are new paths covered? Suggest specific missing test cases.

### 5. Provide Feedback

#### Structure

- **Heading** Add a `> Reviewed by Cursor` at the top of the comment
- **PR Summary**: One-paragraph overview of what the change does and its intent.
- **Findings**:
  - **Critical** — Bugs, security issues, or breaking changes. Must be fixed.
  - **Improvements** — Better approaches for quality, performance, or clarity.
  - **Nitpicks** — Minor style or formatting suggestions (optional for author).
- **Verdict**:
  - **Approved** — Ready to merge; acknowledge the contribution specifically.
  - **Request Changes** — List what must change before approval.
  - **Needs Discussion** — Architectural or intent questions before proceeding.

#### Tone

- Be constructive, professional, and friendly — you're a collaborator, not a gatekeeper.
- Always explain _why_ a change is requested, not just _what_ to change.
- For approvals, call out something specific and valuable in the contribution.

### 6. Post comment to GitHub

```bash
gh pr review <number> --comment --body "<your review text>"
```
