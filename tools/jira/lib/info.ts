import process from "node:process";

import { CONFIG, configuredProject } from "./CONFIG.ts";
import { readBoardInfoCache, type CachedIssueType } from "./board-cache.ts";
import {
  AGENT_LINK_TYPES,
  JIRA_SPRINT_FIELD,
  JIRA_STORY_POINTS_FIELD
} from "./custom-fields.ts";
import { assigneeRecord } from "./format.ts";
import { summarizeLocalTickets, type LocalTicketsSummary } from "./local.ts";
import type { BoardSprint } from "./types.ts";

/**
 * Agent workspace context for MCP and `jira` CLI.
 * Flat raw values only: cloudId/project/meAccountId for MCP, field ids for
 * create/edit additional_fields, statuses/linkTypes/issueTypes for CLI flags.
 */
export type JiraInfo = {
  cloudId: string;
  site: string;
  project: string;
  boardId: string;
  boardJql: string;
  effectiveJql: string;
  meAccountId: string;
  meDisplayName: string;
  featureTeamField: string;
  featureTeamName: string;
  featureTeamOptionId: string;
  epicLinkField: string;
  sprintField: string;
  storyPointsField: string;
  linkTypes: string[];
  issueTypes: CachedIssueType[];
  statuses: string[];
  sprints: BoardSprint[];
  localTickets: LocalTicketsSummary;
};

/** Extract issue type names from `jira project view` JSON. */
export function parseProjectIssueTypeNames(data: unknown): string[] {
  return parseProjectIssueTypeDetails(data).map((t) => t.name);
}

/** Extract issue types with hierarchy from `jira project view` JSON. */
export function parseProjectIssueTypeDetails(data: unknown): CachedIssueType[] {
  if (!data || typeof data !== "object" || Array.isArray(data)) return [];

  const root = data as Record<string, unknown>;
  const candidates = [root.issueTypes, root.issuetypes];
  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    const types: CachedIssueType[] = [];
    for (const item of candidate) {
      if (!item || typeof item !== "object" || Array.isArray(item)) continue;
      const row = item as Record<string, unknown>;
      const name = row.name;
      if (typeof name !== "string" || !name.trim()) continue;
      const hierarchyLevel =
        typeof row.hierarchyLevel === "number" &&
        Number.isFinite(row.hierarchyLevel)
          ? row.hierarchyLevel
          : 0;
      types.push({
        name: name.trim(),
        hierarchyLevel,
        subtask: row.subtask === true
      });
    }
    if (types.length > 0) {
      return types.sort(
        (a, b) =>
          b.hierarchyLevel - a.hierarchyLevel || a.name.localeCompare(b.name)
      );
    }
  }

  return [];
}

/** Project display name from `jira project view` JSON. */
export function parseProjectName(data: unknown): string {
  if (!data || typeof data !== "object" || Array.isArray(data)) return "";
  const name = (data as { name?: unknown }).name;
  return typeof name === "string" ? name.trim() : "";
}

/** Feature Team option name from board JQL (`"Feature Team" = Name`). */
export function parseFeatureTeamFromBoardJql(jql: string): string {
  const match = /"Feature Team"\s*=\s*"?([A-Za-z0-9_-]+)"?/i.exec(jql);
  return match?.[1]?.trim() ?? "";
}

/** Unique status names from synced issues, sorted. */
export function statusNamesFromIssues(
  issues: Array<{ fields?: Record<string, unknown> }>
): string[] {
  const names = new Set<string>();
  for (const issue of issues) {
    const status = issue.fields?.status;
    if (!status || typeof status !== "object" || Array.isArray(status))
      continue;
    const name = (status as { name?: unknown }).name;
    if (typeof name === "string" && name.trim()) names.add(name.trim());
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

/** Display name for the configured account from issue assignees. */
export function meDisplayNameFromIssues(
  issues: Array<{ fields?: Record<string, unknown> }>,
  meAccountId: string
): string {
  if (!meAccountId) return "";
  for (const issue of issues) {
    const assignee = assigneeRecord(issue.fields?.assignee);
    if (!assignee || assignee.accountId !== meAccountId) continue;
    const displayName = assignee.displayName;
    if (typeof displayName === "string" && displayName.trim()) {
      return displayName.trim();
    }
  }
  return "";
}

/** Feature Team option id/name from issue custom field values. */
export function featureTeamOptionFromIssues(
  issues: Array<{ fields?: Record<string, unknown> }>,
  fieldId: string,
  preferredName = ""
): { id: string; name: string } | null {
  if (!fieldId) return null;
  let fallback: { id: string; name: string } | null = null;
  for (const issue of issues) {
    const raw = issue.fields?.[fieldId];
    const options = normalizeFeatureTeamOptions(raw);
    for (const option of options) {
      if (!fallback) fallback = option;
      if (
        preferredName &&
        option.name.toLowerCase() === preferredName.toLowerCase()
      ) {
        return option;
      }
    }
  }
  return fallback;
}

function normalizeFeatureTeamOptions(
  raw: unknown
): Array<{ id: string; name: string }> {
  const rows = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const out: Array<{ id: string; name: string }> = [];
  for (const row of rows) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const record = row as Record<string, unknown>;
    const id =
      typeof record.id === "string" || typeof record.id === "number"
        ? String(record.id)
        : "";
    const name =
      typeof record.value === "string"
        ? record.value.trim()
        : typeof record.name === "string"
          ? record.name.trim()
          : "";
    if (id && name) out.push({ id, name });
  }
  return out;
}

/** Collect flat config + cached board values for agents (no nested duplicates). */
export function gatherJiraInfo(cwd = process.cwd()): JiraInfo {
  const cache = readBoardInfoCache();
  const featureTeamName =
    cache?.featureTeamName.trim() ||
    CONFIG.featureTeam.trim() ||
    parseFeatureTeamFromBoardJql(CONFIG.boardJql);
  const featureTeamOptionId =
    cache?.featureTeamOptionId.trim() || CONFIG.featureTeamOptionId.trim();
  const meDisplayName =
    cache?.meDisplayName.trim() || CONFIG.meDisplayName.trim();

  return {
    cloudId: CONFIG.cloudId.trim(),
    site: CONFIG.site.trim(),
    project: configuredProject(),
    boardId: CONFIG.boardId.trim(),
    boardJql: CONFIG.boardJql.trim(),
    effectiveJql: cache?.effectiveJql.trim() || "",
    meAccountId: CONFIG.meAccountId.trim(),
    meDisplayName,
    featureTeamField: CONFIG.featureTeamField.trim(),
    featureTeamName,
    featureTeamOptionId,
    epicLinkField: CONFIG.epicLinkField.trim(),
    sprintField: JIRA_SPRINT_FIELD,
    storyPointsField: JIRA_STORY_POINTS_FIELD,
    linkTypes: [...AGENT_LINK_TYPES],
    issueTypes: cache?.issueTypeDetails ?? [],
    statuses: cache?.statuses ?? [],
    sprints: cache?.retainedSprints ?? [],
    localTickets: summarizeLocalTickets(cwd)
  };
}

function formatSprintDate(value: string): string {
  const date = value.trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : value.trim();
}

function formatSprintDateRange(sprint: BoardSprint): string {
  const start = sprint.startDate ? formatSprintDate(sprint.startDate) : "";
  const end = sprint.endDate ? formatSprintDate(sprint.endDate) : "";
  if (start && end) return `${start} to ${end}`;
  return start || end;
}

function formatSprintKeys(sprint: BoardSprint): string[] {
  return [
    formatScalar("sprintId", sprint.id),
    formatScalar("sprintName", sprint.name?.trim() || ""),
    formatScalar("sprintDates", formatSprintDateRange(sprint))
  ];
}

const INFO_INDENT = "  ";

/** Key on its own line with each value indented below. */
function formatIndentedBlock(key: string, lines: string[]): string {
  if (lines.length === 0) return `${key}:`;
  return `${key}:\n${lines.map((line) => `${INFO_INDENT}${line}`).join("\n")}`;
}

function formatScalar(key: string, value: string | number): string {
  return `${key}: ${value}`;
}

function formatFeatureTeamValue(name: string, optionId: string): string {
  const trimmedName = name.trim();
  const trimmedId = optionId.trim();
  if (trimmedName && trimmedId) return `${trimmedName} (${trimmedId})`;
  if (trimmedName) return trimmedName;
  if (trimmedId) return `(${trimmedId})`;
  return "";
}

const LOCAL_TICKET_KEY_LIMIT = 5;

function formatLocalTicketKeys(keys: string[]): string {
  if (keys.length <= LOCAL_TICKET_KEY_LIMIT) return keys.join(", ");
  const shown = keys.slice(0, LOCAL_TICKET_KEY_LIMIT).join(", ");
  return `${shown} +${keys.length - LOCAL_TICKET_KEY_LIMIT} more`;
}

function formatLocalTicketsBlock(summary: LocalTicketsSummary): string {
  if (summary.count === 0) {
    return "No local tickets in ./jira/";
  }

  return summary.byType
    .map((group) => `${group.typeDir}: ${formatLocalTicketKeys(group.keys)}`)
    .join("\n");
}

function formatInfoSection(title: string, lines: string[]): string {
  return `${title}\n${lines.join("\n")}`;
}

/** Plain-text key: value lines matching JiraInfo fields (raw, agent-oriented). */
export function formatJiraInfoPlainText(info: JiraInfo): string {
  const sprintLines =
    info.sprints.length === 0
      ? [
          formatScalar("sprintId", ""),
          formatScalar("sprintName", ""),
          formatScalar("sprintDates", "")
        ]
      : info.sprints.flatMap((sprint) => formatSprintKeys(sprint));

  const sections = [
    formatInfoSection("Workspace:", [
      formatScalar("cloudId", info.cloudId),
      formatScalar("site", info.site),
      formatScalar("project", info.project)
    ]),
    formatInfoSection("Board:", [
      formatScalar("boardId", info.boardId),
      ...sprintLines
    ]),
    formatInfoSection("Me:", [
      formatScalar("accountId", info.meAccountId),
      formatScalar("displayName", info.meDisplayName),
      formatScalar("featureTeamField", info.featureTeamField),
      formatScalar(
        "featureTeam",
        formatFeatureTeamValue(info.featureTeamName, info.featureTeamOptionId)
      )
    ]),
    formatInfoSection("Custom fields:", [
      formatScalar("epicLinkField", info.epicLinkField),
      formatScalar("sprintField", info.sprintField),
      formatScalar("storyPointsField", info.storyPointsField)
    ]),
    formatInfoSection("Local:", [
      // Local ./jira/ state
      formatLocalTicketsBlock(info.localTickets)
    ]),
    formatInfoSection("More:", [
      // list helpful jump off command the agent might want to run next
      "run `jira board` for tickets and statuses"
    ])
  ];

  return `${sections.join("\n\n")}\n`;
}
