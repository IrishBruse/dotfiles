---
name: review
description:
  Use this skill to review code. It supports local changes (staged or working tree).
  It focuses on correctness, maintainability, and adherence to project standards.
disable-model-invocation: true
---

# Code Reviewer

This skill guides the agent in conducting professional and thorough code reviews for local development.

## Inputs

- If the user doesnt specify assume its this local repo.
- If the user provides a GitHub PR use `worktree` skill and review that branch

## Workflow

### 1. Determine Review Target

- Target the current local file system states (staged and unstaged changes)

### 2. Preparation

- Check status: `git status`
- Diff the current branch against main e.g. `git diff main..my-branch -w`

### 3. In-Depth Analysis

Analyze the code changes based on the following pillars:

- **Correctness**: Does the code achieve its stated purpose without bugs or logical errors?
- **Maintainability**: Is the code clean, well-structured, and easy to understand and modify in the future? Consider factors like code clarity, modularity, and adherence to established design patterns.
- **Readability**: Is the code well-commented (where necessary) and consistently formatted according to our project's coding style guidelines?
- **Efficiency**: Are there any obvious performance bottlenecks or resource inefficiencies introduced by the changes?
- **Security**: Are there any potential security vulnerabilities or insecure coding practices?
- **Edge Cases and Error Handling**: Does the code appropriately handle edge cases and potential errors?
- **Testability**: Is the new or modified code adequately covered by tests (even if preflight checks pass)? Suggest additional test cases that would improve coverage or robustness.

### 4. Provide Feedback

#### Structure

- **Summary**: A high-level overview of the review.
- **Findings**:
  - **Critical**: Bugs, security issues, or breaking changes.
  - **Improvements**: Suggestions for better code quality or performance.
  - **Nitpicks**: Formatting or minor style issues (optional).
- **Conclusion**: Clear recommendation (Approved / Request Changes).

#### Tone

- Be constructive, professional, and friendly.
- Explain _why_ a change is requested.
- For approvals, acknowledge the specific value of the contribution.
