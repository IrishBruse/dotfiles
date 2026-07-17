import fs from "node:fs";
import path from "node:path";

import {
  assigneeLabel,
  assigneeRecord,
  classifyFolder,
  statusBucketFromFields
} from "../../lib/format.ts";
import type {
  Folder,
  JiraSkillSection,
  JiraSkillTicket,
  JiraTicketsSkillContent,
  StatusBucket
} from "../../lib/types.ts";

/** Single-line summary safe for the skill list (matches Python board_sync_lib). */
export function ticketsSkillOneLine(summary: string): string {
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

const JIRA_BOARD_SKILL_NAME = "jira-board";
const JIRA_BOARD_SKILL_DESCRIPTION =
  "This skill contains in plaintext the current state of the board no need for MCP. Use when needing to get the current state of the Jira Board, when needing to get a ticket for a PR.";

function* issuesWithKeys(
  issues: Array<{ key?: string; fields?: Record<string, unknown> }>
): Generator<{ key: string; fields: Record<string, unknown> }> {
  for (const issue of issues) {
    const key = issue.key;
    if (typeof key !== "string" || !key) continue;
    yield { key, fields: issue.fields ?? {} };
  }
}

function emptyTicketBuckets(): Record<StatusBucket, JiraSkillTicket[]> {
  return {
    todo: [],
    inProgress: [],
    codeReview: [],
    inTest: [],
    done: []
  };
}

function sortTicketsInSection(section: JiraSkillSection): void {
  for (const bucket of STATUS_ORDER) {
    section.statuses[bucket].sort((a, b) =>
      a.key.localeCompare(b.key, undefined, { sensitivity: "base" })
    );
  }
}

function formatStatusSubsections(section: JiraSkillSection): string {
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

const SECTION_BY_FOLDER: Record<
  Folder,
  keyof JiraTicketsSkillContent["sections"]
> = {
  me: "myTickets",
  team: "teammates",
  unassigned: "unassigned",
  misc: "misc"
};

export function buildJiraTicketsSkillContent(
  issues: Array<{ key?: string; fields?: Record<string, unknown> }>,
  meAccountId: string
): JiraTicketsSkillContent {
  const sections: JiraTicketsSkillContent["sections"] = {
    myTickets: { heading: "My tickets", statuses: emptyTicketBuckets() },
    teammates: { heading: "Teammates", statuses: emptyTicketBuckets() },
    unassigned: { heading: "Unassigned", statuses: emptyTicketBuckets() },
    misc: {
      heading: "Misc (outside current sprint fetch)",
      statuses: emptyTicketBuckets()
    }
  };

  for (const { key, fields } of issuesWithKeys(issues)) {
    const summary = ticketsSkillOneLine(
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

  return {
    name: JIRA_BOARD_SKILL_NAME,
    description: JIRA_BOARD_SKILL_DESCRIPTION,
    sections
  };
}

function formatSkillSectionMarkdown(section: JiraSkillSection): string {
  const body = formatStatusSubsections(section);
  if (body) return `## ${section.heading}\n\n${body}`;
  return `## ${section.heading}`;
}

export function formatJiraTicketsSkillMd(
  content: JiraTicketsSkillContent,
  syncedAt?: string
): string {
  const { sections } = content;
  const boardSections = [
    formatSkillSectionMarkdown(sections.myTickets),
    formatSkillSectionMarkdown(sections.teammates),
    formatSkillSectionMarkdown(sections.unassigned),
    formatSkillSectionMarkdown(sections.misc)
  ];
  const syncLine =
    syncedAt && syncedAt.trim()
      ? `Last synced: ${syncedAt.trim()}\n\n`
      : "";

  return `---
name: ${content.name}
description: >
  ${content.description}
---

# Board

${syncLine}Here is the current Jira board status.
Use \`jira show <KEY>\` or \`jira pull <KEY>\` for full ticket details.

${boardSections.join("\n\n")}
`;
}

export function formatJiraTicketsSkillJson(
  content: JiraTicketsSkillContent
): string {
  return `${JSON.stringify(content, null, 2)}\n`;
}

/** Write jira-board SKILL.md from fetched issues. */
export function writeJiraTicketsSkill(
  issues: Array<{ key?: string; fields?: Record<string, unknown> }>,
  skillPath: string,
  meAccountId: string,
  syncedAt?: string
): void {
  const content = buildJiraTicketsSkillContent(issues, meAccountId);
  fs.mkdirSync(path.dirname(skillPath), { recursive: true });
  fs.writeFileSync(
    skillPath,
    formatJiraTicketsSkillMd(content, syncedAt),
    "utf-8"
  );
}
