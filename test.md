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

```diff
diff --git a/home/.config/interpolate/pr-create.md b/home/.config/interpolate/pr-create.md
index 6b8f076..ce2d403 100644
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
+### Diff
 
-**Optional** - **`## Contract changes`** when API- or contract-facing work matters; omit if not.
+``\`diff !git diff origin/main
 
-**Do not:** pad Summary; add Testing checklists; TODO or follow-up lists; Jira or title-validator meta.
-
-## Create context
-
-### `diff.patch` (`git diff origin/main` - source of truth)
-
-``\`!git diff origin/main
-``\`
-
-### Repo PR template (if any)
-
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
 
diff --git a/test.md b/test.md
new file mode 100644
index 0000000..e69de29
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
diff --git a/tools/interpolate/builtins/branch.ts b/tools/interpolate/builtins/branch.ts
new file mode 100644
index 0000000..5f66dce
--- /dev/null
+++ b/tools/interpolate/builtins/branch.ts
@@ -0,0 +1,15 @@
+import { spawnSync } from "node:child_process";
+import process from "node:process";
+
+export const key = "branch";
+
+export function resolve(): string {
+  const r = spawnSync("git", ["branch", "--show-current"], {
+    cwd: process.cwd(),
+    encoding: "utf8"
+  });
+  if (r.status !== 0) {
+    return "";
+  }
+  return (r.stdout ?? "").trim();
+}
diff --git a/tools/interpolate/builtins/command.ts b/tools/interpolate/builtins/command.ts
index 7997cce..d5ea7a5 100644
--- a/tools/interpolate/builtins/command.ts
+++ b/tools/interpolate/builtins/command.ts
@@ -6,8 +6,8 @@ import { locationAt } from "../location.ts";
 
 export const INLINE_COMMAND_MAX_LENGTH = 40;
 
-/** Fenced blocks opened with ``\`!cmd ... body ... ``\` */
-const commandFencePattern = /``\`!([^\n]*)\n([\s\S]*?)``\`/g;
+/** Fenced blocks: ` ``\`!cmd ` or ` ``\`lang !cmd ` (space required before `!` when lang is set). */
+const commandFencePattern = /``\`([^\n]+)\n([\s\S]*?)``\`/g;
 
 /** Inline `!cmd` (backticks, single-line command; cmd must start with a letter). */
 const inlineCommandPattern = /`!([a-zA-Z][^`\n]*)`/g;
@@ -26,14 +26,39 @@ function escapeFenceMarkers(text: string): string {
   return text.replaceAll("``\`", "``\\`");
 }
 
+function parseCommandFenceOpener(opener: string): { lang: string; cmd: string } {
+  const bang = opener.indexOf("!");
+  if (bang === -1) {
+    throw new Error(
+      `interpolate: command fence opener must contain ! (got: ${JSON.stringify(opener)})`
+    );
+  }
+  const cmd = opener.slice(bang + 1).trim();
+  if (cmd === "") {
+    throw new Error("interpolate: empty command in fenced ``\` block");
+  }
+  if (bang === 0) {
+    return { lang: "", cmd };
+  }
+  if (opener[bang - 1] !== " ") {
+    throw new Error(
+      "interpolate: language id and ! must be separated by a space (use ``\`lang !cmd)"
+    );
+  }
+  const lang = opener.slice(0, bang - 1).trim();
+  return { lang, cmd };
+}
+
 function expandFencedBlocks(text: string): string {
-  return text.replace(commandFencePattern, (_, cmd: string) => {
-    const trimmed = cmd.trim();
-    if (trimmed === "") {
-      throw new Error("interpolate: empty command in ``\`! block");
+  return text.replace(commandFencePattern, (full, opener: string, body: string) => {
+    if (!opener.includes("!")) {
+      return full;
     }
-    const output = escapeFenceMarkers(runCommand(trimmed));
-    return `\`\`\`\n${output}\`\`\``;
+    const { lang, cmd } = parseCommandFenceOpener(opener);
+    void body;
+    const output = escapeFenceMarkers(runCommand(cmd));
+    const openerFence = lang === "" ? "``\`" : `\`\`\`${lang}`;
+    return `${openerFence}\n${output}\`\`\``;
   });
 }
 
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
diff --git a/tools/interpolate/builtins/prTemplate.ts b/tools/interpolate/builtins/prTemplate.ts
new file mode 100644
index 0000000..b0104e9
--- /dev/null
+++ b/tools/interpolate/builtins/prTemplate.ts
@@ -0,0 +1,23 @@
+import { spawnSync } from "node:child_process";
+import process from "node:process";
+
+export const key = "prTemplate";
+
+const SCRIPT = [
+  "for f in .github/PULL_REQUEST_TEMPLATE.md .github/pull_request_template.md docs/pull_request_template.md;",
+  'do test -f "$f" && { echo "From $f:"; cat "$f"; exit 0; };',
+  "done;",
+  'echo "(none)"'
+].join(" ");
+
+export function resolve(): string {
+  const r = spawnSync("sh", ["-c", SCRIPT], {
+    cwd: process.cwd(),
+    encoding: "utf8"
+  });
+  if (r.status !== 0) {
+    return "(none)";
+  }
+  const out = (r.stdout ?? "").trimEnd();
+  return out === "" ? "(none)" : out;
+}
diff --git a/tools/interpolate/commands/builtins.md b/tools/interpolate/commands/builtins.md
index 3a8c804..dba91e3 100644
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
@@ -41,28 +53,36 @@ Prefix a line with `?varname:` (or `?env:NAME:`). When the variable or environme
 Example:
 
 ``\`
-?work: Title must start with NOVACORE-<digits>.
-?env:PR_CLI_WORK: Same, keyed off the environment.
+?env:PR_CLI_WORK: Title must start with NOVACORE-<digits>.
 ``\`
 
-Truthy: non-empty, not `0`, not `false`. Pass `--var work=1` or set `PR_CLI_WORK=true`.
+Truthy: non-empty, not `0`, not `false`. Set `PR_CLI_WORK=true` for work policy lines.
 
 # commands
 
 ### !command
 
-Write a fenced block with ! before the shell command on the opening line. The body is replaced with stdout (newlines preserved), and the opener becomes a plain fence.
+Fenced command block on the opener line (body between fences is ignored). Stdout replaces the block; `langid` is kept when set. Use ` ``\`!cmd ` or ` ``\`langid !cmd ` (space required before `!` when `langid` is present).
 
-Example (input):
+Examples (input):
 
 \`\`\`!echo test
 
 \`\`\`
 
+\`\`\`diff !git diff HEAD~1
+
+\`\`\`
+
 Example (output from `interpolate builtins`):
 
-``\`!echo test
+``\`
+echo test
+
+``\`
 
+``\`
+diff output here
 ``\`
 
 ### inline !command
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
diff --git a/tools/interpolate/main.ts b/tools/interpolate/main.ts
index 5c35337..4550376 100644
--- a/tools/interpolate/main.ts
+++ b/tools/interpolate/main.ts
@@ -34,7 +34,7 @@ Built-ins:
 Simple placeholders: ${builtinKeys.map((k) => `{{${k}}}`).join(", ")}
 Environment: {{env:NAME}}
 Line conditions: ?varname: rest of line  (?env:NAME: ...) — omitted when false
-Commands: \`\`\`!<shell command> ... \`\`\` (body replaced with stdout)
+Commands: \`\`\`!<cmd> or \`\`\`lang !<cmd> ... \`\`\` (space before ! when lang is set)
 Inline: \`!<shell command>\` (stdout max 40 characters)
 
 Prompts directory: ${promptsDir}
diff --git a/tools/pr/agent.ts b/tools/pr/agent.ts
new file mode 100644
index 0000000..dbed615
--- /dev/null
+++ b/tools/pr/agent.ts
@@ -0,0 +1,87 @@
+import { spawn } from "node:child_process";
+
+const AGENT_TIMEOUT_MS = 1_200_000;
+
+const AGENT_ARGS = ["--trust", "-p", "--output-format", "text"] as const;
+
+export async function runAgent(prompt: string, repoRoot: string): Promise<string> {
+  try {
+    return await spawnAgent("agent", prompt, repoRoot);
+  } catch (e) {
+    if (!isEnoent(e)) {
+      throw e;
+    }
+  }
+  return await spawnAgent("cursor-agent", prompt, repoRoot);
+}
+
+function isEnoent(e: unknown): boolean {
+  return (
+    e instanceof Error &&
+    "code" in e &&
+    (e as NodeJS.ErrnoException).code === "ENOENT"
+  );
+}
+
+function spawnAgent(
+  command: string,
+  prompt: string,
+  repoRoot: string
+): Promise<string> {
+  return new Promise((resolve, reject) => {
+    const child = spawn(
+      command,
+      [...AGENT_ARGS, "--workspace", repoRoot, prompt],
+      { cwd: repoRoot, stdio: ["ignore", "pipe", "inherit"] }
+    );
+    const outChunks: string[] = [];
+    const errChunks: string[] = [];
+    let finished = false;
+    const finish = (fn: () => void) => {
+      if (finished) {
+        return;
+      }
+      finished = true;
+      clearTimeout(timer);
+      fn();
+    };
+    const timer = setTimeout(() => {
+      child.kill("SIGTERM");
+      finish(() => {
+        reject(new Error(`agent timed out after ${AGENT_TIMEOUT_MS}ms`));
+      });
+    }, AGENT_TIMEOUT_MS);
+    child.stdout?.setEncoding("utf8");
+    child.stdout?.on("data", (c: string) => {
+      outChunks.push(c);
+    });
+    child.stderr?.setEncoding("utf8");
+    child.stderr?.on("data", (c: string) => {
+      errChunks.push(c);
+    });
+    child.on("error", (e) => {
+      finish(() => {
+        reject(e);
+      });
+    });
+    child.on("close", (code) => {
+      finish(() => {
+        const text = outChunks.join("").trim();
+        if (code !== 0) {
+          const detail = errChunks.join("").trim() || "no stderr";
+          reject(
+            new Error(
+              `${command} exited ${String(code)}. stderr: ${detail.slice(0, 4000)}`
+            )
+          );
+          return;
+        }
+        if (text === "") {
+          reject(new Error(`${command} produced no stdout`));
+          return;
+        }
+        resolve(text);
+      });
+    });
+  });
+}
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
diff --git a/tools/pr/ghCreate.ts b/tools/pr/ghCreate.ts
new file mode 100644
index 0000000..357d0de
--- /dev/null
+++ b/tools/pr/ghCreate.ts
@@ -0,0 +1,27 @@
+import { spawnSync } from "node:child_process";
+import fs from "node:fs";
+import os from "node:os";
+import path from "node:path";
+
+export function createPullRequest(
+  repoRoot: string,
+  title: string,
+  body: string
+): void {
+  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pr-cli-create-"));
+  const bodyFile = path.join(tmpDir, "body.md");
+  try {
+    fs.writeFileSync(bodyFile, body, "utf8");
+    const r = spawnSync(
+      "gh",
+      ["pr", "create", "--title", title, "--body-file", bodyFile],
+      { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "inherit", "pipe"] }
+    );
+    if (r.status !== 0) {
+      const err = (r.stderr ?? "").trim();
+      throw new Error(err || "gh pr create failed");
+    }
+  } finally {
+    fs.rmSync(tmpDir, { recursive: true, force: true });
+  }
+}
diff --git a/tools/pr/git.ts b/tools/pr/git.ts
new file mode 100644
index 0000000..4efd991
--- /dev/null
+++ b/tools/pr/git.ts
@@ -0,0 +1,29 @@
+import { spawnSync } from "node:child_process";
+import os from "node:os";
+import path from "node:path";
+import process from "node:process";
+
+export function resolveGitCwd(): string {
+  const raw = process.env.PR_GIT_CWD?.trim();
+  if (!raw) {
+    return process.cwd();
+  }
+  if (raw.startsWith("~/")) {
+    return path.join(os.homedir(), raw.slice(2));
+  }
+  return path.resolve(raw);
+}
+
+export function getRepoRoot(cwd: string): string {
+  const r = spawnSync("git", ["rev-parse", "--show-toplevel"], {
+    cwd,
+    encoding: "utf8"
+  });
+  if (r.status !== 0) {
+    const err = (r.stderr ?? r.stdout ?? "").trim();
+    throw new Error(
+      err ? `not a git repository: ${err}` : "not a git repository"
+    );
+  }
+  return (r.stdout ?? "").trim();
+}
diff --git a/tools/pr/prMarkdown.ts b/tools/pr/prMarkdown.ts
new file mode 100644
index 0000000..b90696d
--- /dev/null
+++ b/tools/pr/prMarkdown.ts
@@ -0,0 +1,36 @@
+export type PrMarkdown = {
+  title: string;
+  body: string;
+};
+
+/** Parse `# title` + body from agent stdout (strips trailing `done` line). */
+export function parsePrMarkdownFromAgentOutput(content: string): PrMarkdown {
+  let text = content.trim();
+  const lines = text.split("\n");
+  const last = lines.at(-1)?.trim() ?? "";
+  if (last.toLowerCase() === "done") {
+    text = lines.slice(0, -1).join("\n").trimEnd();
+  }
+  return parsePrMarkdown(text);
+}
+
+export function parsePrMarkdown(content: string): PrMarkdown {
+  const lines = content.split("\n");
+  const first = lines[0]?.trim() ?? "";
+  if (!first.startsWith("# ")) {
+    throw new Error('agent output must start with # <title>');
+  }
+  const title = first.slice(2).trim();
+  if (title === "") {
+    throw new Error("PR title is empty");
+  }
+  let i = 1;
+  while (i < lines.length && lines[i]?.trim() === "") {
+    i += 1;
+  }
+  const body = lines.slice(i).join("\n").trim();
+  if (body === "") {
+    throw new Error("PR body is empty");
+  }
+  return { title, body };
+}
diff --git a/tools/pr/prompt.ts b/tools/pr/prompt.ts
new file mode 100644
index 0000000..0854d4b
--- /dev/null
+++ b/tools/pr/prompt.ts
@@ -0,0 +1,14 @@
+import { expandNamedPrompt } from "../interpolate/api.ts";
+import { printInterpolationErrors } from "../interpolate/errors.ts";
+import { promptPath, resolvePromptsDir } from "../interpolate/promptsDir.ts";
+
+export function buildPrCreatePrompt(repoRoot: string): string {
+  const promptsDir = resolvePromptsDir(undefined);
+  const file = promptPath(promptsDir, "pr-create");
+  const result = expandNamedPrompt("pr-create", { cwd: repoRoot });
+  if (result.ok === false) {
+    printInterpolationErrors(file, result.errors);
+    throw new Error('pr create: failed to expand interpolate prompt "pr-create"');
+  }
+  return result.text;
+}
```

### Repo PR template

(none)

## Reply

Respond with **only**:

1. `# <title>` (from the diff and branch, not invented scope)
2. Blank line, then the PR body (markdown)

Optional final line: `done`. No preamble, no fenced blocks, no JSON.
