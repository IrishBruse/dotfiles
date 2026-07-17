import { homedir } from "node:os";

import {
  assigneeLabel,
  assigneeRecord,
  classifyFolder,
  statusBucketFromFields
} from "../../lib/format.ts";
import { writeBoardCache } from "../../lib/board-cache.ts";
import type {
  BoardContent,
  BoardSection,
  BoardSections,
  BoardTicket,
  Folder,
  StatusBucket
} from "../../lib/types.ts";

/** Single-line summary safe for board ticket lists. */
export function boardTicketOneLine(summary: string): string {
  return String(summary ?? "")
    .replace(/\n/g, " ")
    .replace(/```/g, "'''")
    .trim();
}

const STATUS_LABELS: Record<StatusBucket, string> = {
  todo: "Todo",
  inProgress: "In progress",
  codeReview: "Code review",
  inTest: "In test",
  done: "Done"
};

const STATUS_COLUMN_WIDTH = Math.max(
  ...Object.values(STATUS_LABELS).map((label) => label.length)
);

const STATUS_ORDER: StatusBucket[] = [
  "todo",
  "inProgress",
  "codeReview",
  "inTest",
  "done"
];

/** Sections where assignee is implied (me / unassigned) and omitted from lines. */
const SECTIONS_OMIT_ASSIGNEE = new Set<keyof BoardSections>([
  "myTickets",
  "unassigned"
]);

function* issuesWithKeys(
  issues: Array<{ key?: string; fields?: Record<string, unknown> }>
): Generator<{ key: string; fields: Record<string, unknown> }> {
  for (const issue of issues) {
    const key = issue.key;
    if (typeof key !== "string" || !key) continue;
    yield { key, fields: issue.fields ?? {} };
  }
}

function emptyTicketBuckets(): Record<StatusBucket, BoardTicket[]> {
  return {
    todo: [],
    inProgress: [],
    codeReview: [],
    inTest: [],
    done: []
  };
}

function sortTicketsInSection(section: BoardSection): void {
  for (const bucket of STATUS_ORDER) {
    section.statuses[bucket].sort((a, b) =>
      a.key.localeCompare(b.key, undefined, { sensitivity: "base" })
    );
  }
}

function sectionHasTickets(section: BoardSection): boolean {
  return STATUS_ORDER.some((bucket) => section.statuses[bucket].length > 0);
}

function ticketsInOrder(section: BoardSection): Array<{
  bucket: StatusBucket;
  ticket: BoardTicket;
}> {
  const rows: Array<{ bucket: StatusBucket; ticket: BoardTicket }> = [];
  for (const bucket of STATUS_ORDER) {
    for (const ticket of section.statuses[bucket]) {
      rows.push({ bucket, ticket });
    }
  }
  return rows;
}

/**
 * One ticket per line for humans and agents:
 *   KEY  Status  Summary
 *   KEY  Status  Assignee  Summary   (teammates / misc)
 * Columns are space-padded within each section so titles align.
 */
function padRight(value: string, width: number): string {
  if (value.length >= width) return value;
  return `${value}${" ".repeat(width - value.length)}`;
}

function formatTicketLine(
  ticket: BoardTicket,
  bucket: StatusBucket,
  includeAssignee: boolean,
  widths: { key: number; status: number; assignee: number }
): string {
  const status = padRight(STATUS_LABELS[bucket], widths.status);
  const key = padRight(ticket.key, widths.key);
  if (includeAssignee) {
    const assignee = padRight(ticket.assignee, widths.assignee);
    return `${key}  ${status}  ${assignee}  ${ticket.summary}`;
  }
  return `${key}  ${status}  ${ticket.summary}`;
}

function formatBoardSectionPlain(
  section: BoardSection,
  sectionKey: keyof BoardSections
): string | null {
  if (!sectionHasTickets(section)) return null;
  const includeAssignee = !SECTIONS_OMIT_ASSIGNEE.has(sectionKey);
  const rows = ticketsInOrder(section);
  const widths = {
    key: Math.max(...rows.map((r) => r.ticket.key.length)),
    status: STATUS_COLUMN_WIDTH,
    assignee: includeAssignee
      ? Math.max(...rows.map((r) => r.ticket.assignee.length), 1)
      : 0
  };
  const lines = rows.map(({ bucket, ticket }) =>
    formatTicketLine(ticket, bucket, includeAssignee, widths)
  );
  return `${section.heading}\n${lines.join("\n")}`;
}

const SECTION_BY_FOLDER: Record<Folder, keyof BoardSections> = {
  me: "myTickets",
  team: "teammates",
  unassigned: "unassigned",
  misc: "misc"
};

export function buildBoardContent(
  issues: Array<{ key?: string; fields?: Record<string, unknown> }>,
  meAccountId: string,
  syncedAt: string
): BoardContent {
  const sections: BoardSections = {
    myTickets: { heading: "My tickets", statuses: emptyTicketBuckets() },
    teammates: { heading: "Teammates", statuses: emptyTicketBuckets() },
    unassigned: { heading: "Unassigned", statuses: emptyTicketBuckets() },
    misc: {
      heading: "Misc (outside current sprint fetch)",
      statuses: emptyTicketBuckets()
    }
  };

  for (const { key, fields } of issuesWithKeys(issues)) {
    const summary = boardTicketOneLine(
      typeof fields.summary === "string" ? fields.summary : ""
    );
    const assignee = assigneeRecord(fields.assignee);
    const label = assigneeLabel(assignee);
    const bucket = statusBucketFromFields(fields);
    const folder = classifyFolder(assignee, meAccountId);
    sections[SECTION_BY_FOLDER[folder]].statuses[bucket].push({
      key,
      summary,
      assignee: label
    });
  }

  for (const section of Object.values(sections)) {
    sortTicketsInSection(section);
  }

  return { syncedAt, sections };
}

function formatBoardSections(
  content: BoardContent,
  sectionKeys: (keyof BoardSections)[]
): string {
  const blocks = sectionKeys
    .map((key) => formatBoardSectionPlain(content.sections[key], key))
    .filter((block): block is string => block != null);
  return blocks.join("\n\n");
}

/** My tickets + unassigned only (for `jira info`). */
export function formatBoardSummaryPlainText(content: BoardContent): string {
  const body = formatBoardSections(content, ["myTickets", "unassigned"]);
  return body ? `${body}\n` : "";
}

/** Full board: my tickets, unassigned, teammates, misc. */
export function formatBoardPlainText(content: BoardContent): string {
  const body = formatBoardSections(content, [
    "myTickets",
    "unassigned",
    "teammates",
    "misc"
  ]);
  return body ? `${body}\n` : "";
}

/** Write board.json from fetched issues. */
export function writeBoardContentFromIssues(
  issues: Array<{ key?: string; fields?: Record<string, unknown> }>,
  meAccountId: string,
  syncedAt: string,
  baseDir = homedir()
): BoardContent {
  const content = buildBoardContent(issues, meAccountId, syncedAt);
  writeBoardCache(content, baseDir);
  return content;
}
