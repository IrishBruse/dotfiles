import process from "node:process";

import { CONFIG, configuredProject } from "./CONFIG.ts";
import { readBoardInfoCache, type BoardInfoCache } from "./board-cache.ts";
import { countLocalTickets } from "./local.ts";
import type { BoardSprint } from "./types.ts";

export type JiraInfo = {
  site: string;
  project: string;
  boardId: string;
  boardJql: string;
  meAccountId: string;
  featureTeamField: string;
  epicLinkField: string;
  boardCache: BoardInfoCache | null;
  issueTypes: string[];
  localTicketCount: number;
};

/** Extract issue type names from `jira project view` JSON. */
export function parseProjectIssueTypeNames(data: unknown): string[] {
  if (!data || typeof data !== "object" || Array.isArray(data)) return [];

  const root = data as Record<string, unknown>;
  const candidates = [root.issueTypes, root.issuetypes];
  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    const names: string[] = [];
    for (const item of candidate) {
      if (!item || typeof item !== "object" || Array.isArray(item)) continue;
      const name = (item as { name?: unknown }).name;
      if (typeof name === "string" && name.trim()) {
        names.push(name.trim());
      }
    }
    if (names.length > 0) return names;
  }

  return [];
}

/** Collect static config plus cached board and local ticket context. */
export function gatherJiraInfo(cwd = process.cwd()): JiraInfo {
  const cache = readBoardInfoCache();
  return {
    site: CONFIG.site.trim(),
    project: configuredProject(),
    boardId: CONFIG.boardId.trim(),
    boardJql: CONFIG.boardJql.trim(),
    meAccountId: CONFIG.meAccountId.trim(),
    featureTeamField: CONFIG.featureTeamField.trim(),
    epicLinkField: CONFIG.epicLinkField.trim(),
    boardCache: cache,
    issueTypes: cache?.issueTypes ?? [],
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
  return `${label} (#${sprint.id}, ${state}, ${start} .. ${end})`;
}

function formatBoardCache(cache: BoardInfoCache | null): string[] {
  if (!cache) {
    return ["Workspace cache: not synced", "  Run: jira sync"];
  }

  const lines = [
    "Workspace cache:",
    `  Last sync: ${cache.syncedAt}`,
    `  Site: ${displayValue(cache.site)}`,
    `  Project: ${displayValue(cache.project)}`,
    `  Board ID: ${displayValue(cache.boardId ?? "")}`,
    `  Effective JQL: ${cache.effectiveJql}`,
    `  Issues fetched: ${cache.issueCount}`,
    `  Sprint board: me ${cache.counts.me}, team ${cache.counts.team}, unassigned ${cache.counts.unassigned}, misc ${cache.counts.misc}`
  ];

  if (cache.retainedSprints.length === 0) {
    lines.push("  Sprints in window: (none)");
  } else {
    lines.push("  Sprints in window:");
    for (const sprint of cache.retainedSprints) {
      lines.push(`    - ${formatSprintLine(sprint)}`);
    }
  }

  if (cache.issueTypes.length === 0) {
    lines.push("  Issue types: (none cached)");
  } else {
    lines.push(`  Issue types: ${cache.issueTypes.join(", ")}`);
  }

  lines.push(`  Local tickets at sync: ${cache.localTicketCount}`);

  return lines;
}

/** Plain-text summary for agents and humans. */
export function formatJiraInfoPlainText(info: JiraInfo): string {
  const lines = [
    "Jira workspace",
    "",
    "Config (~/.config/jira/config.json):",
    `  Site: ${displayValue(info.site)}`,
    `  Project: ${displayValue(info.project)}`,
    `  Board ID: ${displayValue(info.boardId)}`,
    `  Board JQL: ${displayValue(info.boardJql)}`,
    `  Me account ID: ${info.meAccountId ? "(set)" : "(not set)"}`,
    `  Feature team field: ${displayValue(info.featureTeamField, "(not set)")}`,
    `  Epic link field: ${displayValue(info.epicLinkField, "(not set)")}`,
    "",
    ...formatBoardCache(info.boardCache),
    "",
    "Local repo:",
    `  Tickets under jira/: ${info.localTicketCount}`
  ];

  return `${lines.join("\n")}\n`;
}
