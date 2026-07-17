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

const STATUS_HEADINGS: Record<StatusBucket, string> = {
  todo: "Todo",
  inProgress: "In progress",
  codeReview: "Code review",
  inTest: "In test",
  done: "Done"
};

const STATUS_ORDER: StatusBucket[] = [
  "todo",
  "inProgress",
  "codeReview",
  "inTest",
  "done"
];

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

function formatStatusSubsections(section: BoardSection): string {
  const parts: string[] = [];
  for (const bucket of STATUS_ORDER) {
    const tickets = section.statuses[bucket];
    if (tickets.length === 0) continue;
    const lines = tickets.map(
      (t) => `- ${t.key}: ${t.summary} — \`${t.assignee}\``
    );
    parts.push(`**${STATUS_HEADINGS[bucket]}:**\n\n${lines.join("\n")}`);
  }
  return parts.join("\n\n");
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

function formatBoardSectionMarkdown(section: BoardSection): string {
  const body = formatStatusSubsections(section);
  if (body) return `# ${section.heading}\n\n${body}`;
  return `# ${section.heading}`;
}

export type BoardPlainTextOptions = {
  /** Include teammates and misc sections (default: my tickets and unassigned only). */
  full?: boolean;
};

export function formatBoardPlainText(
  content: BoardContent,
  options: BoardPlainTextOptions = {}
): string {
  const { sections } = content;
  const sectionKeys: (keyof BoardSections)[] = options.full
    ? ["myTickets", "unassigned", "teammates", "misc"]
    : ["myTickets", "unassigned"];
  const boardSections = sectionKeys.map((key) =>
    formatBoardSectionMarkdown(sections[key])
  );

  return `Here is the current Jira board status.
Use \`jira show <KEY>\` or \`jira pull <KEY>\` for full ticket details.

${boardSections.join("\n\n")}
`;
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
