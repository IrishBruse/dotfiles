import process from "node:process";

import { CONFIG } from "./CONFIG.ts";
import { readBoardInfoCache, type BoardInfoCache } from "./board-cache.ts";
import { listLocalTickets } from "./local.ts";
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
  localTicketCount: number;
};

/** Collect static config plus cached board and local ticket context. */
export function gatherJiraInfo(cwd = process.cwd()): JiraInfo {
  return {
    site: CONFIG.site.trim(),
    project: CONFIG.project.trim().toUpperCase(),
    boardId: CONFIG.boardId.trim(),
    boardJql: CONFIG.boardJql.trim(),
    meAccountId: CONFIG.meAccountId.trim(),
    featureTeamField: CONFIG.featureTeamField.trim(),
    epicLinkField: CONFIG.epicLinkField.trim(),
    boardCache: readBoardInfoCache(),
    localTicketCount: listLocalTickets(cwd).length
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
    return [
      "Board cache: not synced",
      "  Run: jira board sync"
    ];
  }

  const lines = [
    "Board cache:",
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

  return lines;
}

/** Plain-text summary for agents and humans. */
export function formatJiraInfoPlainText(info: JiraInfo): string {
  const lines = [
    "Jira workspace",
    "",
    "Config (tools/jira/lib/CONFIG.ts):",
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
