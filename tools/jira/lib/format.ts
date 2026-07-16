/**
 * Jira issue field -> markdown helpers shared by `jira pull` and sync.
 */
import { loadJiraConfig } from "./CONFIG.ts";
import type { Folder, StatusBucket } from "./types.ts";

/** Feature Team custom field id from config (empty when not configured). */
export function featureTeamFieldId(): string {
  return loadJiraConfig().featureTeamField;
}

/** Epic Link custom field id from config (empty when not configured). */
export function epicLinkFieldId(): string {
  return loadJiraConfig().epicLinkField;
}

/** Fields allowed by `acli jira workitem search --fields`. */
export const JIRA_SEARCH_FIELDS =
  "key,summary,assignee,issuetype,description,status";

/** Fields returned by `acli jira workitem view` but not search. */
export function jiraViewExtraFields(): string {
  const config = loadJiraConfig();
  return [
    "created",
    "updated",
    "parent",
    config.epicLinkField,
    config.featureTeamField
  ]
    .filter((field) => field.length > 0)
    .join(",");
}

/** Search plus view-only fields for pull/show. */
export function jiraPullFields(): string {
  return `${JIRA_SEARCH_FIELDS},${jiraViewExtraFields()}`;
}

/** Strip scheme and trailing slash from a Jira site host. */
export function normalizeSiteHost(host: string): string {
  return host.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function classifyFolder(
  assignee: Record<string, unknown> | null | undefined,
  meAccountId: string
): Folder {
  if (assignee == null) return "unassigned";
  if (assignee.accountId === meAccountId) return "me";
  return "team";
}

export function assigneeLabel(
  assignee: Record<string, unknown> | null | undefined
): string {
  if (assignee == null) return "Unassigned";
  const name = assignee.displayName;
  return typeof name === "string" ? name : "Unknown";
}

/** Human-readable Feature Team label from Jira fields, or `"None"`. */
export function featureTeamLabel(
  fields: Record<string, unknown>,
  fieldId: string = featureTeamFieldId()
): string {
  const raw = fields[fieldId];
  if (!Array.isArray(raw) || raw.length === 0) return "None";
  const names: string[] = [];
  for (const item of raw) {
    if (item == null || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const label =
      typeof o.value === "string"
        ? o.value
        : typeof o.name === "string"
          ? o.name
          : "";
    if (label) names.push(label);
  }
  return names.length > 0 ? names.join(", ") : "None";
}

/** Best-effort ADF (Jira description) to readable markdown/plain text. */
export function adfToMarkdown(adf: unknown): string {
  if (adf == null) return "";
  if (typeof adf === "string") return adf;
  if (typeof adf !== "object") return "";

  const lines: string[] = [];

  function appendCollectText(out: string[], n: unknown): void {
    if (n == null) return;
    if (typeof n === "object" && n !== null && "type" in n) {
      const o = n as Record<string, unknown>;
      if (o.type === "text" && typeof o.text === "string") {
        out.push(o.text);
      }
      const content = o.content;
      if (Array.isArray(content)) {
        for (const c of content) {
          appendCollectText(out, c);
        }
      }
    } else if (Array.isArray(n)) {
      for (const x of n) {
        appendCollectText(out, x);
      }
    }
  }

  function walk(node: unknown): void {
    if (node == null) return;
    if (Array.isArray(node)) {
      for (const x of node) walk(x);
      return;
    }
    if (typeof node !== "object") return;
    const o = node as Record<string, unknown>;
    const t = o.type;

    if (t === "paragraph") {
      const inner: string[] = [];
      for (const c of (o.content as unknown[]) ?? []) {
        appendCollectText(inner, c);
      }
      lines.push(inner.join(""));
    } else if (t === "heading") {
      const level = Number(
        (o.attrs as { level?: number } | undefined)?.level ?? 1
      );
      const inner: string[] = [];
      for (const c of (o.content as unknown[]) ?? []) {
        appendCollectText(inner, c);
      }
      const prefix = "#".repeat(Math.max(1, Math.min(level, 6)));
      lines.push(`${prefix} ${inner.join("").trimEnd()}`);
    } else if (t === "bulletList" || t === "orderedList") {
      for (const item of (o.content as unknown[]) ?? []) {
        walk(item);
      }
    } else if (t === "listItem") {
      const inner: string[] = [];
      for (const c of (o.content as unknown[]) ?? []) {
        appendCollectText(inner, c);
      }
      lines.push(`- ${inner.join("")}`);
    } else if (t === "codeBlock") {
      const parts: string[] = [];
      for (const c of (o.content as unknown[]) ?? []) {
        appendCollectText(parts, c);
      }
      const body = parts.join("");
      const lang = String(
        (o.attrs as { language?: string } | undefined)?.language ?? ""
      );
      lines.push(`\`\`\`${lang}\n${body}\n\`\`\``);
    } else {
      for (const c of (o.content as unknown[]) ?? []) {
        walk(c);
      }
    }
  }

  walk(adf);
  return lines.filter((line) => line.trim().length > 0).join("\n\n");
}

export function issueDescriptionMarkdown(
  fields: Record<string, unknown>
): string {
  const desc = fields.description;
  if (desc == null) return "";
  if (typeof desc === "string") return desc;
  if (typeof desc === "object") return adfToMarkdown(desc);
  return String(desc);
}

export function yamlScalar(s: string): string {
  return JSON.stringify(s);
}

export function assigneeRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

/** Jira issue type display name from search/view fields, or `"Issue"`. */
export function issueTypeName(fields: Record<string, unknown>): string {
  const itypeObj = fields.issuetype;
  return itypeObj && typeof itypeObj === "object" && "name" in itypeObj
    ? String((itypeObj as { name?: string }).name ?? "Issue")
    : "Issue";
}

/** Initiative and Epic roots sync their full descendant tree by default. */
export function isHierarchyRoot(issueType: string): boolean {
  const t = issueType.trim().toLowerCase();
  return t === "initiative" || t === "epic";
}

/**
 * Map Jira status (name + category) into buckets.
 * Anything unclear defaults to In progress.
 */
export function statusBucketFromFields(
  fields: Record<string, unknown>
): StatusBucket {
  const raw = fields.status;
  const name =
    raw &&
    typeof raw === "object" &&
    typeof (raw as { name?: unknown }).name === "string"
      ? (raw as { name: string }).name.trim()
      : "";
  const lower = name.toLowerCase();
  const catKey =
    (raw &&
      typeof raw === "object" &&
      (raw as { statusCategory?: { key?: string } }).statusCategory?.key) ??
    "";
  const category = String(catKey).toLowerCase();

  if (
    category === "done" ||
    /^(done|closed|resolved|complete)$/i.test(name.trim())
  ) {
    return "done";
  }

  if (
    /\b(uat|qa|in test|system test|sit|staging)\b/.test(lower) ||
    (/\btest(ing)?\b/.test(lower) && !/retest/.test(lower))
  ) {
    return "inTest";
  }
  if (
    /\b(review|revising)\b/.test(lower) ||
    /code review|peer review|pull request/i.test(name)
  ) {
    return "codeReview";
  }
  if (
    category === "new" ||
    /^(to do|open)$/i.test(name.trim()) ||
    /backlog|ready for (dev|development|sprint)/i.test(name)
  ) {
    return "todo";
  }
  if (
    category === "indeterminate" ||
    /progress|develop|active|wip|build|implementation/i.test(lower)
  ) {
    return "inProgress";
  }
  return "inProgress";
}

export function formatTicketMarkdown(
  key: string,
  fields: Record<string, unknown>,
  siteHost: string,
  meAccountId: string
): { folder: Folder; body: string } {
  const summary = typeof fields.summary === "string" ? fields.summary : "";
  const itype = issueTypeName(fields);
  const assignee = assigneeRecord(fields.assignee);
  const folder = classifyFolder(assignee, meAccountId);
  const assigned = assigneeLabel(assignee);
  const featureTeam = featureTeamLabel(fields);
  const descriptionMd = issueDescriptionMarkdown(fields);
  const site = normalizeSiteHost(siteHost);
  const url = `https://${site}/browse/${key}`;
  const statusBucket = statusBucketFromFields(fields);
  const created = typeof fields.created === "string" ? fields.created : "";
  const updated = typeof fields.updated === "string" ? fields.updated : "";

  const md = `---
title: ${yamlScalar(summary)}
assigned: ${yamlScalar(assigned)}
feature_team: ${yamlScalar(featureTeam)}
type: ${yamlScalar(itype)}
url: ${url}
status: ${statusBucket}
created: ${yamlScalar(created)}
updated: ${yamlScalar(updated)}
---

${descriptionMd}
`;
  return { folder, body: md };
}
