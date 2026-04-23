## PR title (work policy — NOVACORE)

The `# …` title line in **PR.md** must start with **`NOVACORE-<digits>`** (example: `NOVACORE-123`). The CLI will reject anything else.

## When running **`pr create`**

- **Pick the ticket from the jira-tickets skill, grounded in the diff.** Read **`jira-tickets-board.md`** in this workspace (snapshot of the skill board). Match **your change** in **`diff.patch`** to the **one** ticket whose summary/title best fits that scope (prefer **In progress** for your work when it clearly aligns). The **`# …` title** must use that ticket’s **`NOVACORE-<digits>`** key.
- If **`jira-tickets-board.md`** is missing, fall back to the **Source branch** name and text in **`diff.patch`** for the key—still do not invent a number that does not appear in those sources.
- Use the **Source branch** line only to confirm or disambiguate when the board and diff already point at the same issue.
