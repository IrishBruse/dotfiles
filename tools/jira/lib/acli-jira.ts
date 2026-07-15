/**
 * Typed wrappers for `acli jira ...` used by the jira CLI.
 */
import {
  runAcli,
  runAcliAsync,
  runAcliJson,
  runAcliJsonAsync
} from "../../.lib/acli.ts";
import type { BoardSprint } from "./types.ts";

const DEFAULT_ACLI = "acli";

/** Run `acli jira <args...>`. */
export function runJiraAcli(
  args: string[],
  acli = DEFAULT_ACLI
): { stdout: string } {
  return runAcli(["jira", ...args], acli);
}

/** Async `acli jira <args...>`. */
export async function runJiraAcliAsync(
  args: string[],
  acli = DEFAULT_ACLI
): Promise<{ stdout: string }> {
  return runAcliAsync(["jira", ...args], acli);
}

/** Run `acli jira <args...>` and parse JSON stdout. */
export function runJiraAcliJson(
  args: string[],
  acli = DEFAULT_ACLI
): unknown {
  return runAcliJson(["jira", ...args], acli);
}

/** Async JSON variant. */
export async function runJiraAcliJsonAsync(
  args: string[],
  acli = DEFAULT_ACLI
): Promise<unknown> {
  return runAcliJsonAsync(["jira", ...args], acli);
}

export type ViewWorkitemOptions = {
  fields: string;
  acli?: string;
};

/** Fetch one work item via `jira workitem view`. */
export function viewWorkitem(
  key: string,
  options: ViewWorkitemOptions
): unknown {
  return runJiraAcliJson(
    ["workitem", "view", key, "--fields", options.fields, "--json"],
    options.acli
  );
}

/** Async `viewWorkitem`. */
export async function viewWorkitemAsync(
  key: string,
  options: ViewWorkitemOptions
): Promise<unknown> {
  return runJiraAcliJsonAsync(
    ["workitem", "view", key, "--fields", options.fields, "--json"],
    options.acli
  );
}

export type SearchWorkitemsOptions = {
  jql: string;
  fields: string;
  paginate?: boolean;
  acli?: string;
};

/** Search work items via `jira workitem search`. */
export function searchWorkitems(options: SearchWorkitemsOptions): unknown {
  const args = [
    "workitem",
    "search",
    "--jql",
    options.jql,
    "--fields",
    options.fields,
    "--json"
  ];
  if (options.paginate) {
    args.push("--paginate");
  }
  return runJiraAcliJson(args, options.acli);
}

/** Async `searchWorkitems`. */
export async function searchWorkitemsAsync(
  options: SearchWorkitemsOptions
): Promise<unknown> {
  const args = [
    "workitem",
    "search",
    "--jql",
    options.jql,
    "--fields",
    options.fields,
    "--json"
  ];
  if (options.paginate) {
    args.push("--paginate");
  }
  return runJiraAcliJsonAsync(args, options.acli);
}

export type CreateWorkitemOptions = {
  project?: string;
  type?: string;
  summary?: string;
  descriptionFile?: string;
  parent?: string;
  labels?: string[];
  fromJson?: string;
  yes?: boolean;
  acli?: string;
};

/** Create a work item via `jira workitem create`. */
export function createWorkitem(options: CreateWorkitemOptions): { stdout: string } {
  const args = ["workitem", "create"];
  if (options.fromJson) {
    args.push("--from-json", options.fromJson);
  } else {
    if (options.summary) args.push("--summary", options.summary);
    if (options.project) args.push("--project", options.project);
    if (options.type) args.push("--type", options.type);
    if (options.descriptionFile) {
      args.push("--description-file", options.descriptionFile);
    }
    if (options.parent) args.push("--parent", options.parent);
    if (options.labels?.length) {
      args.push("--label", options.labels.join(","));
    }
  }
  if (options.yes) args.push("--yes");
  args.push("--json");
  return runJiraAcli(args, options.acli);
}

export type EditWorkitemOptions = {
  key: string;
  summary?: string;
  descriptionFile?: string;
  labels?: string;
  fromJson?: string;
  yes?: boolean;
  acli?: string;
};

/** Edit a work item via `jira workitem edit`. */
export function editWorkitem(options: EditWorkitemOptions): { stdout: string } {
  const args = ["workitem", "edit", "--key", options.key];
  if (options.fromJson) {
    args.push("--from-json", options.fromJson);
  } else {
    if (options.summary) args.push("--summary", options.summary);
    if (options.descriptionFile) {
      args.push("--description-file", options.descriptionFile);
    }
    if (options.labels) args.push("--labels", options.labels);
  }
  if (options.yes) args.push("--yes");
  return runJiraAcli(args, options.acli);
}

export type TransitionWorkitemOptions = {
  key: string;
  status: string;
  yes?: boolean;
  acli?: string;
};

/** Transition a work item via `jira workitem transition`. */
export function transitionWorkitem(
  options: TransitionWorkitemOptions
): { stdout: string } {
  const args = [
    "workitem",
    "transition",
    "--key",
    options.key,
    "--status",
    options.status
  ];
  if (options.yes) args.push("--yes");
  return runJiraAcli(args, options.acli);
}

export type CreateCommentOptions = {
  key: string;
  bodyFile?: string;
  body?: string;
  yes?: boolean;
  acli?: string;
};

/** Add a comment via `jira workitem comment create`. */
export function createComment(options: CreateCommentOptions): { stdout: string } {
  const args = ["workitem", "comment", "create", "--key", options.key];
  if (options.bodyFile) {
    args.push("--body-file", options.bodyFile);
  } else if (options.body) {
    args.push("--body", options.body);
  }
  if (options.yes) args.push("--yes");
  return runJiraAcli(args, options.acli);
}

export type CreateLinkOptions = {
  out: string;
  in: string;
  type: string;
  fromJson?: string;
  yes?: boolean;
  acli?: string;
};

/** Create a link via `jira workitem link create`. */
export function createLink(options: CreateLinkOptions): { stdout: string } {
  const args = ["workitem", "link", "create"];
  if (options.fromJson) {
    args.push("--from-json", options.fromJson);
  } else {
    args.push("--out", options.out, "--in", options.in, "--type", options.type);
  }
  if (options.yes) args.push("--yes");
  return runJiraAcli(args, options.acli);
}

function isSprintListPage(value: unknown): value is { sprints?: unknown } {
  return value != null && typeof value === "object" && "sprints" in value;
}

function parseBoardSprintsFromAcli(data: unknown): BoardSprint[] {
  if (!isSprintListPage(data)) return [];
  const sprints = data.sprints;
  if (!Array.isArray(sprints)) return [];
  const out: BoardSprint[] = [];
  for (const s of sprints) {
    if (!s || typeof s !== "object" || !("id" in s)) continue;
    const row = s as {
      id?: unknown;
      startDate?: unknown;
      endDate?: unknown;
      state?: unknown;
    };
    if (typeof row.id !== "number") continue;
    out.push({
      id: row.id,
      startDate: typeof row.startDate === "string" ? row.startDate : undefined,
      endDate: typeof row.endDate === "string" ? row.endDate : undefined,
      state: typeof row.state === "string" ? row.state : undefined
    });
  }
  return out;
}

function mergeBoardSprintPages(data: unknown): BoardSprint[] {
  const pages: unknown[] = Array.isArray(data)
    ? data.filter(isSprintListPage)
    : isSprintListPage(data)
      ? [data]
      : [];
  const byId = new Map<number, BoardSprint>();
  for (const page of pages) {
    for (const sprint of parseBoardSprintsFromAcli(page)) {
      byId.set(sprint.id, sprint);
    }
  }
  return [...byId.values()];
}

/** List board sprints via `jira board list-sprints`. */
export function listBoardSprints(
  boardId: string,
  acli = DEFAULT_ACLI
): BoardSprint[] {
  const data = runJiraAcliJson(
    [
      "board",
      "list-sprints",
      "--id",
      boardId,
      "--state",
      "active,closed,future",
      "--json",
      "--paginate"
    ],
    acli
  );
  return mergeBoardSprintPages(data);
}

/** List visible projects via `jira project list`. */
export function listProjects(acli = DEFAULT_ACLI): unknown {
  return runJiraAcliJson(["project", "list", "--json", "--paginate"], acli);
}

/** List issue types for a project via `jira project view`. */
export function listProjectIssueTypes(
  projectKey: string,
  acli = DEFAULT_ACLI
): unknown {
  return runJiraAcliJson(
    ["project", "view", projectKey, "--json"],
    acli
  );
}

/** Extract created issue key from acli create JSON stdout. */
export function parseCreatedIssueKey(stdout: string): string | null {
  const trimmed = stdout.trim();
  if (!trimmed) return null;
  try {
    const data = JSON.parse(trimmed) as unknown;
    if (data && typeof data === "object") {
      const key = (data as { key?: unknown }).key;
      if (typeof key === "string" && key) return key;
    }
  } catch {
    const match = /([A-Z][A-Z0-9]+-\d+)/.exec(trimmed);
    return match?.[1] ?? null;
  }
  const match = /([A-Z][A-Z0-9]+-\d+)/.exec(trimmed);
  return match?.[1] ?? null;
}
