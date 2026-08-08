# PR title and ticket

Every PR title must start with a NOVACORE key:

```text
NOVACORE-XXXXX <short summary from the branch diff>
```

Example: `NOVACORE-57740 Design governance workspace slice`

## Resolve the key (stop early)

Try only this order. Stop at the first clear hit.

1. **Existing open PR title** on this branch (`gh pr view`) when updating.
2. **Branch name** when it embeds `NOVACORE-\d+`.
3. **Recent commits on this branch** (`git log origin/main..HEAD --oneline`) when a commit message embeds a key.
4. **Local `jira/` mirrors** that clearly match this change (path or frontmatter `title` / summary).
5. **`jira info`** My tickets / Unassigned that clearly match this change.
6. **Ask the user once** with the short candidate list (or say none found).
   Prefer the `AskQuestion` tool when it is available. Otherwise ask in chat.

Do not:

- Search agent transcripts for a key.
- Keep probing Jira after step 5 (`jira info` already listed candidates).
- Invent commands (`jira show KEY` is the read path, `jira issue` aliases to it).
- Prefer broad `jira search` over steps 1-5 when resolving a PR title key.
- Keep probing after step 6.

## Closed-ticket rule

Before create or retitle, check the target with `jira show KEY` (or local `jira/` frontmatter).

If status is Done/Cancelled/Closed (or equivalent) and closed more than 14 days ago:

1. Stop.
2. Ask which open ticket to use instead.
3. Do not create or retitle onto that closed key.

Open tickets and recently closed ones (within 14 days) are fine.

## Summary after the key

Compose the rest of the title from the branch diff and branch intent.
Keep it short. Do not invent scope that is not in `git diff origin/main...HEAD`.
