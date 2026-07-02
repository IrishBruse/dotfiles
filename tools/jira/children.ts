import { runAcliJson } from "./acli.ts";
import { issueTypeName } from "./format.ts";

export type ChildIssue = {
  key: string;
  summary: string;
  issueType: string;
};

function issueKey(value: unknown): string | null {
  if (value == null || typeof value !== "object") return null;
  const key = (value as { key?: unknown }).key;
  return typeof key === "string" && key ? key : null;
}

function childFromIssue(issue: {
  key?: string;
  fields?: Record<string, unknown>;
}): ChildIssue | null {
  const key = issue.key;
  if (!key) return null;
  const fields = issue.fields ?? {};
  const summary =
    typeof fields.summary === "string" ? fields.summary.trim() : key;
  return {
    key,
    summary,
    issueType: issueTypeName(fields)
  };
}

function subtasksFromFields(
  fields: Record<string, unknown>
): ChildIssue[] {
  const raw = fields.subtasks;
  if (!Array.isArray(raw)) return [];
  const out: ChildIssue[] = [];
  for (const item of raw) {
    const child = childFromIssue(
      item as { key?: string; fields?: Record<string, unknown> }
    );
    if (child) out.push(child);
  }
  return out;
}

/** JQL for issues linked as children of a parent key (sub-tasks, epic stories). */
export function childIssuesJql(parentKey: string): string {
  return `parent = ${parentKey} OR "Epic Link" = ${parentKey}`;
}

function mergeChildren(lists: ChildIssue[][]): ChildIssue[] {
  const byKey = new Map<string, ChildIssue>();
  for (const list of lists) {
    for (const child of list) {
      byKey.set(child.key, child);
    }
  }
  return [...byKey.values()].sort((a, b) =>
    a.key.localeCompare(b.key, undefined, { sensitivity: "base" })
  );
}

/** List direct child issues for a ticket (epic stories, sub-tasks, etc.). */
export function fetchChildIssues(parentKey: string): ChildIssue[] {
  const fromSearch = runAcliJson([
    "jira",
    "workitem",
    "search",
    "--jql",
    childIssuesJql(parentKey),
    "--fields",
    "key,summary,issuetype",
    "--json"
  ]);

  const searchChildren: ChildIssue[] = [];
  if (Array.isArray(fromSearch)) {
    for (const issue of fromSearch) {
      const child = childFromIssue(
        issue as { key?: string; fields?: Record<string, unknown> }
      );
      if (child) searchChildren.push(child);
    }
  }

  const parentView = runAcliJson([
    "jira",
    "workitem",
    "view",
    parentKey,
    "--fields",
    "subtasks",
    "--json"
  ]);

  const subtasks =
    parentView && typeof parentView === "object"
      ? subtasksFromFields(
          ((parentView as { fields?: Record<string, unknown> }).fields ??
            {}) as Record<string, unknown>
        )
      : [];

  return mergeChildren([searchChildren, subtasks]);
}

/** Extract a parent issue key from view fields, if any. */
export function parentKeyFromFields(fields: Record<string, unknown>): string | null {
  return issueKey(fields.parent);
}
