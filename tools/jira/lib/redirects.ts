/**
 * Redirects for common agent mistakes (`jira workitem ...`, acli-shaped args).
 */
import { parseJiraKey } from "../lib/jiraInput.ts";

/** Map mistaken top-level commands to the preferred jira CLI form. */
export function mistakenCommandHint(argv: string[]): string | null {
  const cmd = argv[2];
  if (!cmd) return null;

  if (cmd === "workitem") {
    return workitemHint(argv.slice(3));
  }

  if (cmd === "acli") {
    return 'unknown command "acli" (use jira show|search|info|create|edit, not jira acli)';
  }

  if (cmd === "auth") {
    return 'unknown command "auth" (use jira doctor for auth checks)';
  }

  if (cmd === "project") {
    return 'unknown command "project" (use jira projects / jira types / jira info)';
  }

  return null;
}

function workitemHint(args: string[]): string {
  const sub = args[0] ?? "";
  if (sub === "view") {
    const key = args.slice(1).map(parseJiraKey).find(Boolean);
    return key
      ? `unknown command "workitem" (use jira show ${key}, not jira workitem view)`
      : 'unknown command "workitem" (use jira show KEY, not jira workitem view)';
  }
  if (sub === "search") {
    return 'unknown command "workitem" (use jira search "JQL", not jira workitem search)';
  }
  if (sub === "create" || sub === "create-bulk") {
    return 'unknown command "workitem" (use jira create after the jira skill write gate)';
  }
  if (sub === "edit") {
    return 'unknown command "workitem" (use jira edit KEY, or edit ~/jira then jira push KEY)';
  }
  if (sub === "transition") {
    return 'unknown command "workitem" (use jira transition KEY [Status])';
  }
  if (sub === "comment") {
    return 'unknown command "workitem" (use jira comment KEY "body")';
  }
  if (sub === "link") {
    return 'unknown command "workitem" (use jira link --out KEY --in KEY --type NAME)';
  }
  return 'unknown command "workitem" (use jira show|search|create|edit, not acli workitem)';
}

/** Reject acli-shaped `jira board <subcommand>` with a pointer to info/board. */
export function boardExtraArgsHint(argv: string[]): string | null {
  const rest = argv.slice(3).filter((arg) => !arg.startsWith("-"));
  if (rest.length === 0) return null;
  if (rest[0] === "list-sprints") {
    return 'unknown board subcommand "list-sprints" (use jira info for sprint ids, or jira board for the cached board)';
  }
  return `unknown board subcommand "${rest[0]}" (use jira board, or jira info)`;
}
