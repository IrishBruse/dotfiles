import process from "node:process";

import { CONFIG, configuredProject } from "./CONFIG.ts";
import {
  readBoardInfoCache,
  type BoardInfoCache,
  type CachedIssueType
} from "./board-cache.ts";
import {
  AGENT_COMMON_STATUSES,
  AGENT_LINK_TYPES,
  AGENT_STATUS_BUCKETS,
  JIRA_SPRINT_FIELD,
  JIRA_STORY_POINTS_FIELD,
  NOVACORE_CAPITALIZABLE_FIELD,
  NOVACORE_CAPITALIZABLE_YES_ID
} from "./custom-fields.ts";
import { assigneeRecord, normalizeSiteHost } from "./format.ts";
import { countLocalTickets } from "./local.ts";
import type { BoardSprint } from "./types.ts";

export type JiraInfo = {
  site: string;
  cloudId: string;
  project: string;
  projectName: string;
  boardId: string;
  boardJql: string;
  meAccountId: string;
  meDisplayName: string;
  featureTeamField: string;
  featureTeamName: string;
  featureTeamOptionId: string;
  epicLinkField: string;
  sprintField: string;
  storyPointsField: string;
  capitalizableField: string;
  capitalizableYesId: string;
  boardCache: BoardInfoCache | null;
  issueTypes: string[];
  issueTypeDetails: CachedIssueType[];
  statuses: string[];
  localTicketCount: number;
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
        (a, b) => b.hierarchyLevel - a.hierarchyLevel || a.name.localeCompare(b.name)
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
    if (!status || typeof status !== "object" || Array.isArray(status)) continue;
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

/** Collect static config plus cached board and local ticket context. */
export function gatherJiraInfo(cwd = process.cwd()): JiraInfo {
  const cache = readBoardInfoCache();
  const project = configuredProject();
  const featureTeamName =
    cache?.featureTeamName.trim() ||
    CONFIG.featureTeam.trim() ||
    parseFeatureTeamFromBoardJql(CONFIG.boardJql);
  const featureTeamOptionId =
    cache?.featureTeamOptionId.trim() || CONFIG.featureTeamOptionId.trim();
  const meDisplayName =
    cache?.meDisplayName.trim() || CONFIG.meDisplayName.trim();

  return {
    site: CONFIG.site.trim(),
    cloudId: CONFIG.cloudId.trim(),
    project,
    projectName: cache?.projectName.trim() || "",
    boardId: CONFIG.boardId.trim(),
    boardJql: CONFIG.boardJql.trim(),
    meAccountId: CONFIG.meAccountId.trim(),
    meDisplayName,
    featureTeamField: CONFIG.featureTeamField.trim(),
    featureTeamName,
    featureTeamOptionId,
    epicLinkField: CONFIG.epicLinkField.trim(),
    sprintField: JIRA_SPRINT_FIELD,
    storyPointsField: JIRA_STORY_POINTS_FIELD,
    capitalizableField: NOVACORE_CAPITALIZABLE_FIELD,
    capitalizableYesId: NOVACORE_CAPITALIZABLE_YES_ID,
    boardCache: cache,
    issueTypes: cache?.issueTypes ?? [],
    issueTypeDetails: cache?.issueTypeDetails ?? [],
    statuses: cache?.statuses ?? [],
    localTicketCount: countLocalTickets(cwd)
  };
}

function displayValue(value: string, fallback = "(not set)"): string {
  return value || fallback;
}

function formatInstant(iso: string | undefined): string {
  if (!iso) return "?";
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return iso;
  return new Date(ms).toISOString().slice(0, 10);
}

function formatSprintLine(sprint: BoardSprint): string {
  const label = sprint.name?.trim() || `Sprint ${sprint.id}`;
  const state = sprint.state?.trim() || "unknown";
  const start = formatInstant(sprint.startDate);
  const end = formatInstant(sprint.endDate);
  return `${label} (${sprint.id}, ${state}, ${start} -> ${end})`;
}

function formatIssueTypeLine(types: CachedIssueType[], names: string[]): string {
  if (types.length > 0) {
    return types
      .map((t) =>
        t.subtask ? `${t.name} (subtask)` : `${t.name} (L${t.hierarchyLevel})`
      )
      .join(", ");
  }
  if (names.length > 0) return names.join(", ");
  return "(none cached, run jira sync)";
}

function formatFeatureTeamLine(info: JiraInfo): string {
  const field = displayValue(info.featureTeamField, "(not set)");
  if (!info.featureTeamName && !info.featureTeamOptionId) {
    return field;
  }
  const name = info.featureTeamName || "(unknown)";
  const option = info.featureTeamOptionId
    ? `option ${info.featureTeamOptionId}`
    : "option (unknown)";
  return `${name} (${field} / ${option})`;
}

function formatMeLine(info: JiraInfo): string {
  const id = displayValue(info.meAccountId);
  if (info.meDisplayName) return `${info.meDisplayName} (${id})`;
  return id;
}

function formatProjectLine(info: JiraInfo): string {
  if (info.projectName) return `${info.project} (${info.projectName})`;
  return displayValue(info.project);
}

/** Plain-text summary for agents and humans. */
export function formatJiraInfoPlainText(info: JiraInfo): string {
  const site = normalizeSiteHost(info.site);
  const boardId = info.boardId;
  const project = info.project || "PROJ";
  const browseBase = site ? `https://${site}/browse/` : "(not set)";
  const boardUrl =
    site && boardId
      ? `https://${site}/jira/software/c/projects/${project}/boards/${boardId}`
      : "(not set)";
  const cache = info.boardCache;
  const skillPath = "~/.agents/skills/jira-board/";

  const lines = [
    `Site: ${displayValue(site)}`,
    `Cloud ID: ${displayValue(info.cloudId)}`,
    `Project: ${formatProjectLine(info)}`,
    `Board ID: ${displayValue(boardId)}`,
    `Board URL: ${boardUrl}`,
    `Browse base: ${browseBase}`,
    `Board JQL: ${displayValue(info.boardJql)}`,
    `Me: ${formatMeLine(info)}`,
    `Feature team: ${formatFeatureTeamLine(info)}`,
    `Epic link field: ${displayValue(info.epicLinkField, "(not set)")}`,
    `Sprint field: ${info.sprintField}`,
    `Story points field: ${info.storyPointsField}`,
    `Capitalizable field: ${info.capitalizableField} (Yes=${info.capitalizableYesId})`,
    `Issue types: ${formatIssueTypeLine(info.issueTypeDetails, info.issueTypes)}`,
    `Status buckets: ${AGENT_STATUS_BUCKETS.join(", ")}`,
    `Common statuses: ${AGENT_COMMON_STATUSES.join(", ")}`,
    `Link types: ${AGENT_LINK_TYPES.join(", ")}`,
    `Board skill: ${skillPath}`
  ];

  if (!cache) {
    lines.push("Cache synced: (not synced, run jira sync)");
  } else {
    lines.push(`Cache synced: ${cache.syncedAt}`);
    lines.push(`Effective JQL: ${cache.effectiveJql}`);
    lines.push(
      `Board counts: me ${cache.counts.me}, team ${cache.counts.team}, unassigned ${cache.counts.unassigned}, misc ${cache.counts.misc} (${cache.issueCount} total)`
    );
    if (cache.retainedSprints.length === 0) {
      lines.push("Active sprint: (none in retention window)");
    } else {
      for (const sprint of cache.retainedSprints) {
        lines.push(`Active sprint: ${formatSprintLine(sprint)}`);
      }
    }
    if (info.statuses.length > 0) {
      lines.push(`Statuses on board: ${info.statuses.join(", ")}`);
    }
  }

  lines.push(`Local tickets: ${info.localTicketCount}`);

  return `${lines.join("\n")}\n`;
}
