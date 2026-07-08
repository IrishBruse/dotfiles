import { runAcliJson } from "../../.lib/acli.ts";
import { EPIC_LINK_FIELD, issueTypeName } from "./format.ts";
import type { ChildIssue } from "./types.ts";

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

function subtasksFromFields(fields: Record<string, unknown>): ChildIssue[] {
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

/** JQL for children of multiple parents in one search. */
export function bulkChildIssuesJql(parentKeys: readonly string[]): string {
  const keys = parentKeys.join(", ");
  return `parent IN (${keys}) OR "Epic Link" IN (${keys})`;
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

function childrenFromSearch(data: unknown): ChildIssue[] {
  const out: ChildIssue[] = [];
  if (!Array.isArray(data)) return out;
  for (const issue of data) {
    const child = childFromIssue(
      issue as { key?: string; fields?: Record<string, unknown> }
    );
    if (child) out.push(child);
  }
  return out;
}

function searchChildIssues(jql: string): ChildIssue[] {
  const fromSearch = runAcliJson([
    "jira",
    "workitem",
    "search",
    "--jql",
    jql,
    "--fields",
    "key,summary,issuetype",
    "--json"
  ]);
  return childrenFromSearch(fromSearch);
}

function fetchChildIssuesBulk(parentKeys: readonly string[]): ChildIssue[] {
  if (parentKeys.length === 0) return [];
  if (parentKeys.length === 1) return fetchChildIssues(parentKeys[0]!);
  const searchChildren = searchChildIssues(bulkChildIssuesJql(parentKeys));
  return mergeChildren([searchChildren]);
}

/** List direct child issues for a ticket (epic stories, sub-tasks, etc.). */
export function fetchChildIssues(parentKey: string): ChildIssue[] {
  const searchChildren = searchChildIssues(childIssuesJql(parentKey));

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

/** Breadth-first descendant listing (Initiative -> Epics -> Stories, etc.). */
export function fetchDescendantIssues(
  rootKey: string,
  options: { onProgress?: (message: string) => void } = {}
): ChildIssue[] {
  const log = options.onProgress;
  const byKey = new Map<string, ChildIssue>();
  let frontier: string[] = [rootKey];
  const scannedParents = new Set<string>();

  while (frontier.length > 0) {
    const parents = frontier.filter((key) => !scannedParents.has(key));
    if (parents.length === 0) break;
    for (const key of parents) scannedParents.add(key);

    log?.(
      parents.length === 1
        ? `listing children of ${parents[0]}...`
        : `listing children of ${parents.length} issues...`
    );

    const children = fetchChildIssuesBulk(parents);
    frontier = [];
    for (const child of children) {
      if (!byKey.has(child.key)) {
        byKey.set(child.key, child);
        frontier.push(child.key);
      }
    }
  }

  return [...byKey.values()].sort((a, b) =>
    a.key.localeCompare(b.key, undefined, { sensitivity: "base" })
  );
}

/** Extract a parent or epic-link issue key from view fields, if any. */
export function parentKeyFromFields(
  fields: Record<string, unknown>
): string | null {
  const fromParent = issueKey(fields.parent);
  if (fromParent) return fromParent;

  const epicLink = fields[EPIC_LINK_FIELD];
  if (typeof epicLink === "string" && epicLink) return epicLink;
  return issueKey(epicLink);
}

/** Parent summary embedded on a child issue view, when Jira returns it inline. */
export function parentSummaryFromFields(
  fields: Record<string, unknown>
): string | null {
  const parent = fields.parent;
  if (parent == null || typeof parent !== "object") return null;

  const parentObj = parent as Record<string, unknown>;
  const parentFields = parentObj.fields;
  if (parentFields != null && typeof parentFields === "object") {
    const summary = (parentFields as Record<string, unknown>).summary;
    if (typeof summary === "string" && summary.trim()) return summary.trim();
  }

  const summary = parentObj.summary;
  if (typeof summary === "string" && summary.trim()) return summary.trim();
  return null;
}
