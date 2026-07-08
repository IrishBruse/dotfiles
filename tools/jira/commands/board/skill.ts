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
  content: JiraTicketsSkillContent
): string {
  const { sections } = content;
  const boardSections = [
    formatSkillSectionMarkdown(sections.myTickets),
    formatSkillSectionMarkdown(sections.teammates),
    formatSkillSectionMarkdown(sections.unassigned),
    formatSkillSectionMarkdown(sections.misc)
  ];

  return `---
name: ${content.name}
description: >
  ${content.description}
---

# Board

Here is the current Jira board status.
For the full description of any ticket below, read \`references/{me,team,unassigned,misc}/<KEY>.md\`
Example: \`references/me/PROJ-12345.md\`

${boardSections.join("\n\n")}
`;
}

export function formatJiraTicketsSkillJson(
  content: JiraTicketsSkillContent
): string {
  return `${JSON.stringify(content, null, 2)}\n`;
}

function readTicketMarkdown(filePath: string): {
  key: string;
  fields: Record<string, unknown>;
} | null {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const key = path.basename(filePath, ".md");
    const frontmatterMatch = /^---\n([\s\S]*?)\n---/.exec(content);
    if (!frontmatterMatch) return null;

    const fm = frontmatterMatch[1];
    const fields: Record<string, unknown> = {};

    const titleMatch = /^title:\s*(.+)$/m.exec(fm);
    if (titleMatch) {
      fields.summary = JSON.parse(titleMatch[1]);
    }

    const assignedMatch = /^assigned:\s*(.+)$/m.exec(fm);
    if (assignedMatch) {
      const name = JSON.parse(assignedMatch[1]);
      fields.assignee = name === "Unassigned" ? null : { displayName: name };
    }

    const statusMatch = /^status:\s*(\S+)$/m.exec(fm);
    if (statusMatch) {
      fields.status = { name: statusMatch[1] };
    }

    return { key, fields };
  } catch {
    return null;
  }
}

export function writeJiraTicketsSkill(
  issues: Array<{ key?: string; fields?: Record<string, unknown> }>,
  skillPath: string,
  meAccountId: string,
  boardOutputRoot: string
): void {
  const miscDir = path.join(boardOutputRoot, "misc");
  const miscIssues: Array<{ key?: string; fields?: Record<string, unknown> }> =
    [];

  if (fs.existsSync(miscDir)) {
    for (const f of fs.readdirSync(miscDir)) {
      if (!f.endsWith(".md")) continue;
      const parsed = readTicketMarkdown(path.join(miscDir, f));
      if (parsed) {
        miscIssues.push({ key: parsed.key, fields: parsed.fields });
      }
    }
  }

  const allIssues = [...issues, ...miscIssues];
  const content = buildJiraTicketsSkillContent(allIssues, meAccountId);
  const skillDir = path.dirname(skillPath);
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(skillPath, formatJiraTicketsSkillMd(content), "utf-8");
  fs.writeFileSync(
    path.join(skillDir, "sprint.json"),
    formatJiraTicketsSkillJson(content),
    "utf-8"
  );
}
