/**
 * Create empty jira-tickets skill directory structure with sample tickets.
 * Usage: jira init [path]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TOOL_DIR = path.dirname(fileURLToPath(import.meta.url));

const defaultSkillDir = path.join(
  TOOL_DIR,
  "..",
  "..",
  "..",
  "home",
  ".agents",
  "skills",
  "jira-tickets",
);

/** Run the init subcommand; returns exit code. */
export function run(userPath: string | undefined): number {
  const skillDir = userPath
    ? path.resolve(userPath)
    : defaultSkillDir;

  const refsDir = path.join(skillDir, "references");
  const skillMdPath = path.join(skillDir, "SKILL.md");

  if (fs.existsSync(skillMdPath)) {
    console.error(`jira init: skill file already exists at ${skillMdPath}`);
    return 1;
  }

  const skillMd = `---
name: jira-tickets
description: This skill contains in plaintext the current state of the board no need for MCP
---

Here is the current Jira board status. For the full description of any ticket below, read \`references/{me,team,unassigned}/<KEY>.md\` relative to this skill (e.g. \`references/me/JIRA-100.md\`).

# My tickets

**Todo:**

- JIRA-101: Set up CI pipeline — \`You\`

**In progress:**

- JIRA-102: Refactor auth middleware — \`You\`
- JIRA-103: Add pagination to search — \`You\`

**Code review:**

- JIRA-104: Fix race condition in worker — \`You\`

**Done:**

- JIRA-100: Initialize project scaffold — \`You\`

# Teammates

**Todo:**

- JIRA-201: Update API docs — \`Alice\`

**In progress:**

- JIRA-202: Migrate to new DB schema — \`Bob\`
- JIRA-203: Add e2e test suite — \`Alice\`

**Done:**

- JIRA-200: Configure linting rules — \`Bob\`

# Unassigned

**Todo:**

- JIRA-301: Implement dark mode — \`Unassigned\`
- JIRA-302: Add rate limiting — \`Unassigned\`

**In progress:**

- JIRA-303: Optimize image uploads — \`Unassigned\`
`;

  const fakeTicketTemplate = (key: string, title: string) => `---
title: "${title}"
assigned: "placeholder"
type: "Issue"
url: "https://placeholder/browse/${key}"
---

Sample ticket description for **${key}**.
`;

  const tickets: { folder: string; key: string; title: string }[] = [
    { folder: "me", key: "JIRA-100", title: "Initialize project scaffold" },
    { folder: "me", key: "JIRA-101", title: "Set up CI pipeline" },
    { folder: "me", key: "JIRA-102", title: "Refactor auth middleware" },
    { folder: "me", key: "JIRA-103", title: "Add pagination to search" },
    { folder: "me", key: "JIRA-104", title: "Fix race condition in worker" },
    { folder: "team", key: "JIRA-200", title: "Configure linting rules" },
    { folder: "team", key: "JIRA-201", title: "Update API docs" },
    { folder: "team", key: "JIRA-202", title: "Migrate to new DB schema" },
    { folder: "team", key: "JIRA-203", title: "Add e2e test suite" },
    { folder: "unassigned", key: "JIRA-301", title: "Implement dark mode" },
    { folder: "unassigned", key: "JIRA-302", title: "Add rate limiting" },
    { folder: "unassigned", key: "JIRA-303", title: "Optimize image uploads" },
  ];

  fs.mkdirSync(path.join(refsDir, "me"), { recursive: true });
  fs.mkdirSync(path.join(refsDir, "team"), { recursive: true });
  fs.mkdirSync(path.join(refsDir, "unassigned"), { recursive: true });

  for (const { folder, key, title } of tickets) {
    fs.writeFileSync(
      path.join(refsDir, folder, `${key}.md`),
      fakeTicketTemplate(key, title),
      "utf-8",
    );
  }

  fs.writeFileSync(skillMdPath, skillMd, "utf-8");

  console.log(`Created jira-tickets skill at ${skillDir}`);
  return 0;
}
