import { parseJiraKey } from "./jiraInput.ts";

/** Blocked `acli jira` command paths for agent use. */
export const BLOCKED_ACLI_JIRA_COMMANDS: readonly (readonly string[])[] = [
  ["auth", "login"],
  ["auth", "logout"],
  ["auth", "switch"],
  ["workitem", "archive"],
  ["workitem", "unarchive"],
  ["workitem", "clone"],
  ["workitem", "create"],
  ["workitem", "create-bulk"],
  ["workitem", "delete"],
  ["workitem", "edit"],
  ["workitem", "transition"],
  ["workitem", "attachment", "delete"],
  ["workitem", "comment", "create"],
  ["workitem", "comment", "delete"],
  ["workitem", "link", "create"],
  ["workitem", "link", "delete"],
  ["workitem", "watcher", "remove"]
] as const;

const JIRA_CLI_ALTERNATIVES: Readonly<Record<string, string>> = {
  "workitem create": "jira create",
  "workitem edit": "jira edit",
  "workitem transition": "jira transition",
  "workitem comment create": "jira comment",
  "workitem link create": "jira link"
};

const ACLI_JIRA_ROOT_COMMANDS = new Set(
  BLOCKED_ACLI_JIRA_COMMANDS.map((parts) => parts[0])
);

function consumesFlagValue(path: string[], next: string | undefined): boolean {
  if (next === undefined || next.startsWith("-")) return false;
  if (path.length > 0) return true;
  return !ACLI_JIRA_ROOT_COMMANDS.has(next);
}

/** Build `acli` argv for `jira acli <args...>` (always `["jira", ...]`). */
export function buildAcliJiraArgs(argv: string[]): string[] {
  const rest = argv.slice(3);
  if (rest.length === 0) return ["jira"];
  if (rest[0] === "jira") return rest;
  return ["jira", ...rest];
}

/** Extract the subcommand path from args after the leading `jira`. */
export function acliJiraCommandPath(jiraArgs: string[]): string[] {
  const path: string[] = [];
  const args = jiraArgs.slice(1);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg.startsWith("-")) {
      if (arg.includes("=")) continue;
      const next = args[i + 1];
      if (consumesFlagValue(path, next)) i += 1;
      continue;
    }
    if (parseJiraKey(arg)) break;
    if (/^\d+$/.test(arg)) break;
    path.push(arg);
  }
  return path;
}

function pathMatches(
  path: string[],
  blocked: readonly string[]
): boolean {
  if (path.length < blocked.length) return false;
  return blocked.every((part, index) => path[index] === part);
}

function formatBlockedPath(path: readonly string[]): string {
  return path.join(" ");
}

/** Return an error message when the command is blocked, otherwise null. */
export function blockedAcliJiraReason(jiraArgs: string[]): string | null {
  const path = acliJiraCommandPath(jiraArgs);
  for (const blocked of BLOCKED_ACLI_JIRA_COMMANDS) {
    if (!pathMatches(path, blocked)) continue;

    const command = formatBlockedPath(blocked);
    const alt = JIRA_CLI_ALTERNATIVES[command];
    if (alt) {
      return `command blocked for agents: ${command} (use ${alt})`;
    }
    return `command blocked for agents: ${command}`;
  }
  return null;
}
