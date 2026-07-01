/**
 * Create empty jira-board skill directory structure with sample tickets.
 * Usage: jira init [path]
 */
import fs from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import {
  buildJiraTicketsSkillContent,
  formatJiraTicketsSkillJson,
  formatJiraTicketsSkillMd,
  type StatusBucket
} from "./sync.ts";

const defaultSkillDir = path.join(
  homedir(),
  ".agents",
  "skills",
  "jira-board"
);

/** Run the init subcommand; returns exit code. */
export function run(userPath: string | undefined): number {
  const skillDir = userPath ? path.resolve(userPath) : defaultSkillDir;

  const refsDir = path.join(skillDir, "references");
  const skillMdPath = path.join(skillDir, "SKILL.md");

  if (fs.existsSync(skillMdPath)) {
    console.error(`jira init: skill file already exists at ${skillMdPath}`);
    return 1;
  }

  const statusName: Record<StatusBucket, string> = {
    todo: "To Do",
    inProgress: "In Progress",
    codeReview: "Code Review",
    inTest: "In Test",
    done: "Done"
  };

  const fakeTicketTemplate = (key: string, title: string) => `---
title: "${title}"
assigned: "placeholder"
type: "Issue"
url: "https://placeholder/browse/${key}"
---

Sample ticket description for **${key}**.
`;

  const tickets: {
    folder: string;
    key: string;
    title: string;
    assignee: string;
    status: StatusBucket;
  }[] = [
    {
      folder: "me",
      key: "JIRA-100",
      title: "Initialize project scaffold",
      assignee: "You",
      status: "done"
    },
    {
      folder: "me",
      key: "JIRA-101",
      title: "Set up CI pipeline",
      assignee: "You",
      status: "todo"
    },
    {
      folder: "me",
      key: "JIRA-102",
      title: "Refactor auth middleware",
      assignee: "You",
      status: "inProgress"
    },
    {
      folder: "me",
      key: "JIRA-103",
      title: "Add pagination to search",
      assignee: "You",
      status: "inProgress"
    },
    {
      folder: "me",
      key: "JIRA-104",
      title: "Fix race condition in worker",
      assignee: "You",
      status: "codeReview"
    },
    {
      folder: "team",
      key: "JIRA-200",
      title: "Configure linting rules",
      assignee: "Bob",
      status: "done"
    },
    {
      folder: "team",
      key: "JIRA-201",
      title: "Update API docs",
      assignee: "Alice",
      status: "todo"
    },
    {
      folder: "team",
      key: "JIRA-202",
      title: "Migrate to new DB schema",
      assignee: "Bob",
      status: "inProgress"
    },
    {
      folder: "team",
      key: "JIRA-203",
      title: "Add e2e test suite",
      assignee: "Alice",
      status: "inProgress"
    },
    {
      folder: "unassigned",
      key: "JIRA-301",
      title: "Implement dark mode",
      assignee: "Unassigned",
      status: "todo"
    },
    {
      folder: "unassigned",
      key: "JIRA-302",
      title: "Add rate limiting",
      assignee: "Unassigned",
      status: "todo"
    },
    {
      folder: "unassigned",
      key: "JIRA-303",
      title: "Optimize image uploads",
      assignee: "Unassigned",
      status: "inProgress"
    }
  ];

  const sampleIssues = tickets.map(
    ({ key, title, assignee, status }) => ({
      key,
      fields: {
        summary: title,
        assignee:
          assignee === "Unassigned"
            ? null
            : {
                accountId: assignee === "You" ? "me" : "other",
                displayName: assignee
              },
        status: { name: statusName[status] }
      }
    })
  );
  const skillContent = buildJiraTicketsSkillContent(sampleIssues, "me");

  fs.mkdirSync(path.join(refsDir, "me"), { recursive: true });
  fs.mkdirSync(path.join(refsDir, "team"), { recursive: true });
  fs.mkdirSync(path.join(refsDir, "unassigned"), { recursive: true });
  fs.mkdirSync(path.join(refsDir, "misc"), { recursive: true });

  for (const { folder, key, title } of tickets) {
    fs.writeFileSync(
      path.join(refsDir, folder, `${key}.md`),
      fakeTicketTemplate(key, title),
      "utf-8"
    );
  }

  fs.writeFileSync(skillMdPath, formatJiraTicketsSkillMd(skillContent), "utf-8");
  fs.writeFileSync(
    path.join(skillDir, "sprint.json"),
    formatJiraTicketsSkillJson(skillContent),
    "utf-8"
  );

  console.log(`Created jira-board skill at ${skillDir}`);
  return 0;
}
