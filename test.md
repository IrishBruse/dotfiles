**Repo:** `/home/econn/dotfiles` | **Branch:** `main` (head) | **Base:** `origin/main`

Open a new GitHub PR from this branch. The host runs **`gh pr create`** after you reply.

## Rules

- **Read-only:** you may read files under `/home/econn/dotfiles`. No creates, edits, or deletes. No **`git`** or **`gh`**.
- **Diff below is the source of truth** for what ships. Do not re-run git to refetch. Align the body with the repo template when one is present.

## Body layout

Unless the repo template says otherwise:

- **`## Summary`** - 2-3 lines, what and why (no path inventories)
- **2-4 topical `##` sections** - short lead sentence, then 2-5 bullets
- Optional **`## Contract changes`** when APIs/contracts change
- Skip: test checklists, TODOs, Jira meta

## Context

### Diff

```
diff --git a/home/.config/interpolate/pr-create.md b/home/.config/interpolate/pr-create.md
index 6b8f076..bbd6755 100644
--- a/home/.config/interpolate/pr-create.md
+++ b/home/.config/interpolate/pr-create.md
@@ -1,61 +1,41 @@
-**Repository (`gh pr create` cwd):** `{{cwd}}` - same path the CLI uses for **`gh pr create`**. Git operations below run from this tree.
+**Repo:** `{{cwd}}` | **Branch:** `{{branch}}` (head) | **Base:** `origin/main`

-You are running **`pr create`**: open a new GitHub PR from the **current branch** (no existing PR on this head yet).
+Open a new GitHub PR from this branch. The host runs **`gh pr create`** after you reply.

-**Source branch:** `{{branch}}` - the CLI runs **`gh pr create`** from the repository directory above, so the new PR's head is **this branch**. There is no GitHub PR on this branch yet.
+## Rules

-**Prefetched context** - Everything under **Create context** is embedded below (shell output). It captures this branch vs **`origin/main`**; do not substitute ad hoc **`git`** output. You only write **`PR.md`** in your **current working directory** (`{{agentOutputDir}}`); the host runs **`gh pr create`** from the repo directory after you finish.
+- **Read-only:** you may read files under `{{cwd}}`. No creates, edits, or deletes. No **`git`** or **`gh`**.
+- **Diff below is the source of truth** for what ships. Do not re-run git to refetch. Align the body with the repo template when one is present.

-**Source of truth:** the diff below decides what ships. The **Source branch** line is the PR head. If a repo template appears in the bundle, align the **body** with it from the diff; do not contradict the diff. Otherwise use the default layout. If the diff is empty or tiny, say so - do not invent scope.
+?env:PR_CLI_WORK: **Title:** must start with `NOVACORE-<digits>` (e.g. `NOVACORE-123`).
+?env:PR_CLI_WORK:

-?work: ## PR title (work policy - NOVACORE)
-?work:
-?work: The `# …` title line in **PR.md** must start with **`NOVACORE-<digits>`** (example: `NOVACORE-123`). The CLI will reject anything else.
-?work:
-?work: ## When running **`pr create`**
-?work:
-?work: - **Pick the ticket from the jira-tickets skill, grounded in the diff.** Read **`jira-tickets-board.md`** in this workspace (snapshot of the skill board). Match **your change** in the diff to the **one** ticket whose summary/title best fits that scope (prefer **In progress** for your work when it clearly aligns). The **`# …` title** must use that ticket's **`NOVACORE-<digits>`** key.
-?work: - If **`jira-tickets-board.md`** is missing, fall back to the **Source branch** name and diff text for the key - still do not invent a number that does not appear in those sources.
-?work: - Use the **Source branch** line only to confirm or disambiguate when the board and diff already point at the same issue.
-?work:
+## Body layout

-**Default body layout** (use this unless a repo template dictates a different structure - then align with that file; this block is guidance only).
+Unless the repo template says otherwise:

-**`## Summary`** - **2-3 lines**: what changes and **why** (reviewers, not an essay). No file paths, no changed-file inventories. If the diff is empty or trivial, say so briefly. Do not invent scope.
+- **`## Summary`** - 2-3 lines, what and why (no path inventories)
+- **2-4 topical `##` sections** - short lead sentence, then 2-5 bullets
+- Optional **`## Contract changes`** when APIs/contracts change
+- Skip: test checklists, TODOs, Jira meta

-**`##` sections after Summary** - A **small** number of topical headings (usually **2-4** for a medium change; **1** is fine for a focused PR). Name by **theme**, not by file or folder.
+## Context

-**Inside each section:** lead with one or two short sentences, then **2-5 bullets** for distinct ideas. Avoid long paragraphs or long flat file lists.
-
-**Optional** - **`## Contract changes`** when API- or contract-facing work matters; omit if not.
-
-**Do not:** pad Summary; add Testing checklists; TODO or follow-up lists; Jira or title-validator meta.
-
-## Create context
-
-### `diff.patch` (`git diff origin/main` - source of truth)
+### Diff

 ``\`!git diff origin/main
-``\`
-
-### Repo PR template (if any)

-``\`!sh -c 'for f in .github/PULL_REQUEST_TEMPLATE.md .github/pull_request_template.md docs/pull_request_template.md; do test -f "$f" && { echo "From $f:"; cat "$f"; exit 0; }; done; echo "(none)"'
 ``\`

-{{jiraContext}}
-
-Your **current working directory** is **`{{agentOutputDir}}`** - an **empty directory** used only for **`PR.md`** output; nothing from the real repo is mirrored on disk.
-
-**You write (only):** `PR.md` at that root: `# <title>`, blank line, full body. Both non-empty.
+### Repo PR template

-Do not run **`gh pr ...`** (no PR yet). Facts about the change come from the diff above, not the branch name or template alone.
+{{prTemplate}}

-**Write `PR.md`** in the agent cwd:
+## Reply

-1. First line: `# <title>` (grounded in the diff and **Source branch**).
-2. Blank line, then the full **new** body (markdown).
+Respond with **only**:

-The CLI opens **`PR.md`** for edits, then creates the PR on **this** branch.
+1. `# <title>` (from the diff and branch, not invented scope)
+2. Blank line, then the PR body (markdown)

-**Output:** only **`PR.md`** - no title/body in chat (no JSON or fenced PR text). After writing, you may reply with at most a token like `done`.
+Optional final line: `done`. No preamble, no fenced blocks, no JSON.
diff --git a/home/.config/interpolate/pr.md b/home/.config/interpolate/pr.md
index d59f87b..294ddfa 100644
--- a/home/.config/interpolate/pr.md
+++ b/home/.config/interpolate/pr.md
@@ -31,8 +31,7 @@ Open or refresh a GitHub PR from the **current branch** (`pr create` / `pr updat

 ## Repo template

-``\`!sh -c 'for f in .github/PULL_REQUEST_TEMPLATE.md .github/pull_request_template.md docs/pull_request_template.md; do test -f "$f" && { echo "From $f:"; cat "$f"; exit 0; }; done; echo "(none)"'
-``\`
+{{prTemplate}}

 ## Default body

diff --git a/tools/interpolate/api.ts b/tools/interpolate/api.ts
index c6b851e..d449d96 100644
--- a/tools/interpolate/api.ts
+++ b/tools/interpolate/api.ts
@@ -15,6 +15,8 @@ export type ExpandNamedPromptOptions = {
   /** Working directory for `{{cwd}}` and ``\`! shell blocks. */
   cwd?: string;
   vars?: Record<string, string>;
+  /** Extra placeholder values merged after built-in vars. */
+  builtinOverrides?: Record<string, string>;
 };

 /**
@@ -31,7 +33,11 @@ export function expandNamedPrompt(
     process.chdir(options.cwd);
   }
   try {
-    return expandTemplate(template, options?.vars ?? {});
+    return expandTemplate(
+      template,
+      options?.vars ?? {},
+      options?.builtinOverrides ?? {}
+    );
   } finally {
     if (options?.cwd !== undefined) {
       process.chdir(prevCwd);
diff --git a/tools/interpolate/builtins/index.ts b/tools/interpolate/builtins/index.ts
index 334b907..00cd94f 100644
--- a/tools/interpolate/builtins/index.ts
+++ b/tools/interpolate/builtins/index.ts
@@ -1,11 +1,13 @@
 import type { InterpolationError } from "../errors.ts";
+import * as branch from "./branch.ts";
 import * as cwd from "./cwd.ts";
+import * as prTemplate from "./prTemplate.ts";
 import * as home from "./home.ts";
 import * as user from "./user.ts";
 import { expand as expandCommand } from "./command.ts";
 import { expand as expandEnv } from "./env.ts";

-const vars = [cwd, home, user] as const;
+const vars = [branch, cwd, home, prTemplate, user] as const;

 export function builtinVars(): Record<string, string> {
   const out: Record<string, string> = {};
diff --git a/tools/interpolate/commands/builtins.md b/tools/interpolate/commands/builtins.md
index 3a8c804..929c0bd 100644
--- a/tools/interpolate/commands/builtins.md
+++ b/tools/interpolate/commands/builtins.md
@@ -18,6 +18,18 @@ User home directory.

 Login user name.

+### branch
+
+`{{branch}}`
+
+Current git branch (`git branch --show-current` in `{{cwd}}`).
+
+### prTemplate
+
+`{{prTemplate}}`
+
+First repo PR template found (`.github/PULL_REQUEST_TEMPLATE.md`, `.github/pull_request_template.md`, or `docs/pull_request_template.md`), or `(none)`.
+
 # environment

 ### env:HOME
@@ -41,11 +53,10 @@ Prefix a line with `?varname:` (or `?env:NAME:`). When the variable or environme
 Example:

 ``\`
-?work: Title must start with NOVACORE-<digits>.
-?env:PR_CLI_WORK: Same, keyed off the environment.
+?env:PR_CLI_WORK: Title must start with NOVACORE-<digits>.
 ``\`

-Truthy: non-empty, not `0`, not `false`. Pass `--var work=1` or set `PR_CLI_WORK=true`.
+Truthy: non-empty, not `0`, not `false`. Set `PR_CLI_WORK=true` for work policy lines.

 # commands

diff --git a/tools/interpolate/expand.ts b/tools/interpolate/expand.ts
index 212c46e..957bccc 100644
--- a/tools/interpolate/expand.ts
+++ b/tools/interpolate/expand.ts
@@ -21,11 +21,15 @@ export type ExpandResult =

 export function expandTemplate(
   template: string,
-  cliVars: Record<string, string>
+  cliVars: Record<string, string>,
+  builtinOverrides: Record<string, string> = {}
 ): ExpandResult {
-  const merged = { ...builtinVars(), ...cliVars };
+  const merged = { ...builtinVars(), ...builtinOverrides, ...cliVars };
   const conditioned = expandLineConditions(template, merged);
-  const errors = findUndefinedVariables(conditioned, cliVars);
+  const errors = findUndefinedVariables(conditioned, {
+    ...builtinOverrides,
+    ...cliVars
+  });
   if (errors.length > 0) {
     return { ok: false as const, errors };
   }
diff --git a/tools/pr/commands/create/index.ts b/tools/pr/commands/create/index.ts
index dc1caa6..d08881f 100644
--- a/tools/pr/commands/create/index.ts
+++ b/tools/pr/commands/create/index.ts
@@ -1,20 +1,94 @@
 import process from "node:process";

+import { runAgent } from "../../agent.ts";
+import { createPullRequest } from "../../ghCreate.ts";
+import { getRepoRoot, resolveGitCwd } from "../../git.ts";
+import { buildPrCreatePrompt } from "../../prompt.ts";
+import { parsePrMarkdownFromAgentOutput } from "../../prMarkdown.ts";
+
 function fail(message: string): void {
   console.error(message);
   process.exitCode = 1;
 }

+function takePrintPromptFlag(args: string[]): {
+  rest: string[];
+  printPrompt: boolean;
+} {
+  const printPrompt = args.includes("--print-prompt");
+  const rest = printPrompt ? args.filter((a) => a !== "--print-prompt") : args;
+  return { rest, printPrompt };
+}
+
 export function runCreate(args: string[]): void {
+  void runCreateAsync(args).catch((e) => {
+    console.error(e instanceof Error ? e.message : String(e));
+    process.exitCode = 1;
+  });
+}
+
+async function runCreateAsync(args: string[]): Promise<void> {
   if (args.includes("-h") || args.includes("--help")) {
-    console.log("pr create - prepare or open a new pull request for this branch (not implemented)");
+    console.log(`pr create - expand pr-create prompt, run Cursor agent, open PR
+
+Options:
+  --print-prompt   Print expanded prompt to stdout and exit (no agent)
+  -h, --help       This message
+
+Environment:
+  PR_GIT_CWD       Git repo directory (default: cwd)
+  PR_CLI_WORK=true Enable NOVACORE title rules in pr-create.md
+`);
+    return;
+  }
+
+  const { rest, printPrompt } = takePrintPromptFlag(args);
+  if (rest.length > 0) {
+    fail(`pr create: unexpected arguments: ${rest.join(" ")}`);
     return;
   }

-  if (args.length > 0) {
-    fail(`pr create: unexpected arguments: ${args.join(" ")}`);
+  const gitCwd = resolveGitCwd();
+  let repoRoot: string;
+  try {
+    repoRoot = getRepoRoot(gitCwd);
+  } catch (e) {
+    fail(e instanceof Error ? e.message : String(e));
     return;
   }

-  fail("pr create: not implemented yet");
+  let prompt: string;
+  try {
+    prompt = buildPrCreatePrompt(repoRoot);
+  } catch (e) {
+    fail(e instanceof Error ? e.message : String(e));
+    return;
+  }
+
+  if (printPrompt) {
+    process.stdout.write(prompt);
+    return;
+  }
+
+  let agentOutput: string;
+  try {
+    agentOutput = await runAgent(prompt, repoRoot);
+  } catch (e) {
+    fail(e instanceof Error ? e.message : `agent failed: ${String(e)}`);
+    return;
+  }
+
+  let parsed;
+  try {
+    parsed = parsePrMarkdownFromAgentOutput(agentOutput);
+  } catch (e) {
+    fail(e instanceof Error ? e.message : String(e));
+    return;
+  }
+
+  try {
+    createPullRequest(repoRoot, parsed.title, parsed.body);
+  } catch (e) {
+    fail(e instanceof Error ? e.message : String(e));
+  }
 }
diff --git a/tools/pr/commands/help.ts b/tools/pr/commands/help.ts
index 2e6c5e1..10d5567 100644
--- a/tools/pr/commands/help.ts
+++ b/tools/pr/commands/help.ts
@@ -7,7 +7,7 @@ export function printHelp(): void {
       "  pr create",
       "",
       "Commands:",
-      "  create   Prepare or open a new pull request for this branch",
+      "  create   Expand pr-create via interpolate, run Cursor agent, gh pr create",
       "",
       "  -h, --help   Show this message"
     ].join("\n")
```

### Repo PR template

(none)

## Reply

Respond with **only**:

1. `# <title>` (from the diff and branch, not invented scope)
2. Blank line, then the PR body (markdown)

Optional final line: `done`. No preamble, no fenced blocks, no JSON.
