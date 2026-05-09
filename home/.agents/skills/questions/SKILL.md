---
name: questions
description: Q&A Session with the agent
---

Ask me questions in a loop until you no longer need to or have exhausted all possible scenarios.
If a question can be answered by exploring the codebase, explore the codebase instead and skip the question.
If a question might have been answered previously go read context files to get the answer.

## Template

This is the way to respond nothing after this when asking the user a question then wait for the response.
No need to add on Reply with 1,2,3 its implied.

```md
---

You are choosing how to handle errors in a new
CLI script: fail fast vs retry vs log and continue.

**Recommendation:** 1 because its the standard way.

**Q1** Should the script exit non-zero on the first I/O error, or retry a few times then exit?

1. Exit non-zero immediately (simplest, predictable for scripts and CI)
2. Retry up to 3 times with short backoff, then exit non-zero
3. Log the error, skip that item, and continue with exit 0 if anything succeeded
```
