import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { before, describe, it } from "node:test";

import { setJiraConfigPathForTests } from "./lib/CONFIG.ts";

const FIXTURE_CONFIG = path.join(
  path.dirname(new URL(import.meta.url).pathname),
  "fixtures",
  "config.json"
);

before(() => {
  setJiraConfigPathForTests(FIXTURE_CONFIG);
});

import {
  boardTicketOneLine,
  buildBoardContent,
  formatBoardPlainText
} from "./commands/workspace/board-content.ts";
import { runBoardCommand } from "./commands/workspace/board.ts";
import { runBatchCommand } from "./commands/workspace/batch.ts";
import {
  buildSyncSummary,
  formatSyncSummaryHuman
} from "./commands/workspace/sync.ts";
import { gatherDoctorChecksForTest, runDoctorCommand } from "./commands/workspace/doctor.ts";
import {
  isSprintInRetentionWindow,
  miscDeleteCutoffMs,
  shouldDeleteMiscTicket,
  sprintsInRetentionWindow,
  SPRINT_RETENTION_BUFFER_MS,
  writeBoard
} from "./commands/workspace/write.ts";
import { runAcliPassthroughCommand } from "./commands/other/acli.ts";
import { runInfoCommand } from "./commands/workspace/info.ts";
import { printHelp } from "./commands/help.ts";
import { runSearchCommand } from "./commands/read/search.ts";
import { runShowCommand } from "./commands/read/show.ts";
import { runPullCommand } from "./commands/local/pull.ts";
import { runPushCommand } from "./commands/local/push.ts";
import { runSyncCommand } from "./commands/workspace/sync.ts";
import {
  classifyPullChange,
  issueTypeSlug,
  pulledTicketPath,
  ticketFolderName,
  ticketMarkdownFilename
} from "./commands/local/pull.ts";
import {
  bulkChildIssuesJql,
  childIssuesJql,
  parentKeyFromFields,
  parentSummaryFromFields
} from "./lib/children.ts";
import {
  adfToMarkdown,
  assigneeLabel,
  assigneeRecord,
  classifyFolder,
  epicLinkFieldId,
  featureTeamLabel,
  formatTicketMarkdown,
  isHierarchyRoot,
  issueDescriptionMarkdown,
  issueTypeName,
  jiraPullFields,
  normalizeSiteHost,
  statusBucketFromFields,
  yamlScalar
} from "./lib/format.ts";
import {
  markdownToAdf,
  parseAdfDoc,
  parseInlineMarkdown,
  writeAcliDescriptionFile
} from "./lib/markdown-adf.ts";
import {
  applyCreateFieldDefaults,
  buildCreateWorkitemJson,
  buildEditWorkitemJson,
  capitalizableYesField,
  collectFieldFlags,
  JIRA_SPRINT_FIELD,
  JIRA_STORY_POINTS_FIELD,
  NOVACORE_FEATURE_TEAM_FIELD,
  parseFieldFlags,
  pickCurrentSprintId
} from "./lib/custom-fields.ts";
import { parseSubcommandArgv } from "./lib/argv.ts";
import {
  boardCachePath,
  boardInfoCachePath,
  readBoardCache,
  readBoardInfoCache,
  writeBoardCache,
  writeBoardInfoCache
} from "./lib/board-cache.ts";
import {
  featureTeamOptionFromIssues,
  formatJiraInfoPlainText,
  meDisplayNameFromIssues,
  parseFeatureTeamFromBoardJql,
  parseProjectIssueTypeDetails,
  parseProjectIssueTypeNames,
  parseProjectName,
  statusNamesFromIssues
} from "./lib/info.ts";
import { parseGlobalFlags } from "./lib/output-mode.ts";
import {
  blockedAcliJiraReason,
  buildAcliJiraArgs
} from "./lib/acli-policy.ts";
import { parseCreatedIssueKey } from "./lib/acli-jira.ts";
import { parseJiraKey } from "./lib/jiraInput.ts";
import {
  buildLocalTicketIndex,
  jiraRootDir,
  jiraTicketKeyInMarkdown,
  listLocalTickets,
  localTicketPath,
  parseDraftFrontmatter,
  parseTicketMarkdown,
  summarizeLocalTickets
} from "./lib/local.ts";
import {
  printChildIssues,
  printJsonError,
  printJsonSuccess,
  printPulled,
  pullChangeMark
} from "./lib/output.ts";

const ME = "account-me";

function withTempDir(run: (dir: string) => void): void {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "jira-test-"));
  try {
    run(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function writeTicket(
  cwd: string,
  typeDir: string,
  filename: string,
  body: string
): string {
  const filePath = path.join(cwd, "jira", typeDir, filename);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, body, "utf-8");
  return filePath;
}

function captureStdout(run: () => void): string {
  const original = process.stdout.write.bind(process.stdout);
  let out = "";
  process.stdout.write = ((chunk: string | Uint8Array) => {
    out += String(chunk);
    return true;
  }) as typeof process.stdout.write;
  try {
    run();
  } finally {
    process.stdout.write = original;
  }
  return out;
}

function issueFields(
  summary: string,
  assignee: { accountId: string; displayName: string } | null
): Record<string, unknown> {
  return {
    summary,
    issuetype: { name: "Task" },
    assignee,
    status: { name: "To Do", statusCategory: { key: "new" } }
  };
}

describe("parseJiraKey", () => {
  it("parses bare keys case-insensitively", () => {
    assert.equal(parseJiraKey("PROJ-42"), "PROJ-42");
    assert.equal(parseJiraKey("proj-9"), "PROJ-9");
  });

  it("parses browse URLs", () => {
    assert.equal(
      parseJiraKey("https://example.atlassian.net/browse/PROJ-1"),
      "PROJ-1"
    );
    assert.equal(
      parseJiraKey(
        "https://example.atlassian.net/jira/software/projects/PROJ/board?selectedIssue=PROJ-99"
      ),
      null
    );
  });

  it("rejects invalid input", () => {
    assert.equal(parseJiraKey(""), null);
    assert.equal(parseJiraKey("not-a-key"), null);
    assert.equal(parseJiraKey("PROJ"), null);
  });

  it("parses browse URLs embedded in longer paths", () => {
    assert.equal(
      parseJiraKey("https://example.atlassian.net/jira/browse/TEAM-100"),
      "TEAM-100"
    );
  });
});

describe("pull path helpers", () => {
  it("slugifies issue type names", () => {
    assert.equal(issueTypeSlug("User Story"), "user-story");
    assert.equal(issueTypeSlug("  Epic  "), "epic");
  });

  it("builds safe markdown filenames from summaries", () => {
    const fields = { summary: "Fix: foo/bar?" };
    assert.equal(
      ticketMarkdownFilename(fields, "PROJ-1"),
      "Fix- foo-bar- - PROJ-1.md"
    );
    assert.equal(ticketMarkdownFilename({ summary: "" }, "PROJ-2"), "PROJ-2.md");
  });

  it("truncates very long summaries in filenames", () => {
    const long = "x".repeat(250);
    const name = ticketMarkdownFilename({ summary: long }, "PROJ-99");
    assert.ok(name.endsWith(" - PROJ-99.md"));
    assert.ok(name.length < long.length);
  });

  it("collapses newlines in summaries", () => {
    const name = ticketMarkdownFilename(
      { summary: "Line one\nLine two" },
      "PROJ-3"
    );
    assert.equal(name, "Line one Line two - PROJ-3.md");
  });

  it("nests stories under parent epic folders", () => {
    const cwd = "/tmp/workspace";
    const storyFields = {
      summary: "Child story",
      issuetype: { name: "Story" }
    };
    const parent = {
      key: "PROJ-10",
      fields: { summary: "Parent epic" }
    };
    const out = pulledTicketPath(cwd, storyFields, "PROJ-11", parent);
    assert.equal(
      out,
      path.join(
        cwd,
        "jira",
        "story",
        "Parent epic - PROJ-10",
        "Child story - PROJ-11.md"
      )
    );
  });

  it("places non-story tickets directly under type dir", () => {
    const cwd = "/tmp/workspace";
    const fields = {
      summary: "Big epic",
      issuetype: { name: "Epic" }
    };
    const out = pulledTicketPath(cwd, fields, "PROJ-5");
    assert.equal(
      out,
      path.join(cwd, "jira", "epic", "Big epic - PROJ-5.md")
    );
  });

  it("derives folder names without .md suffix", () => {
    const fields = { summary: "Title" };
    assert.equal(ticketFolderName(fields, "PROJ-3"), "Title - PROJ-3");
  });

  it("classifies pull file changes", () => {
    assert.equal(
      classifyPullChange({
        priorPath: null,
        outPath: "/tmp/jira/task/A - PROJ-1.md",
        priorBody: null,
        newBody: "body"
      }),
      "added"
    );
    assert.equal(
      classifyPullChange({
        priorPath: "/tmp/jira/task/A - PROJ-1.md",
        outPath: "/tmp/jira/task/A - PROJ-1.md",
        priorBody: "old",
        newBody: "new"
      }),
      "updated"
    );
    assert.equal(
      classifyPullChange({
        priorPath: "/tmp/jira/task/A - PROJ-1.md",
        outPath: "/tmp/jira/task/A - PROJ-1.md",
        priorBody: "same",
        newBody: "same"
      }),
      "unchanged"
    );
    assert.equal(
      classifyPullChange({
        priorPath: "/tmp/jira/story/Old - PROJ-1/Child - PROJ-2.md",
        outPath: "/tmp/jira/story/New - PROJ-3/Child - PROJ-2.md",
        priorBody: "body",
        newBody: "body"
      }),
      "moved"
    );
  });
});

describe("format helpers", () => {
  it("normalizes site hosts", () => {
    assert.equal(
      normalizeSiteHost("https://example.atlassian.net/"),
      "example.atlassian.net"
    );
  });

  it("classifies assignee folders", () => {
    assert.equal(classifyFolder(null, ME), "unassigned");
    assert.equal(classifyFolder({ accountId: ME }, ME), "me");
    assert.equal(classifyFolder({ accountId: "other" }, ME), "team");
  });

  it("labels assignees", () => {
    assert.equal(assigneeLabel(null), "Unassigned");
    assert.equal(assigneeLabel({ displayName: "Ada" }), "Ada");
    assert.equal(assigneeLabel({ accountId: "x" }), "Unknown");
  });

  it("reads feature team custom field values", () => {
    const fields = {
      customfield_10001: [{ value: "Alpha" }, { name: "Beta" }]
    };
    assert.equal(featureTeamLabel(fields, "customfield_10001"), "Alpha, Beta");
    assert.equal(featureTeamLabel({}, "customfield_10001"), "None");
  });

  it("converts ADF paragraphs and headings to markdown", () => {
    const adf = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Overview" }]
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Hello " },
            { type: "text", text: "world", marks: [{ type: "strong" }] }
          ]
        }
      ]
    };
    const md = adfToMarkdown(adf);
    assert.match(md, /## Overview/);
    assert.match(md, /Hello \*\*world\*\*/);
    assert.equal(issueDescriptionMarkdown({ description: adf }), md);
  });

  it("converts ADF lists and code blocks", () => {
    const adf = {
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "First" }]
                }
              ]
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Second" }]
                }
              ]
            }
          ]
        },
        {
          type: "codeBlock",
          attrs: { language: "ts" },
          content: [{ type: "text", text: "const x = 1;" }]
        }
      ]
    };
    const md = adfToMarkdown(adf);
    assert.match(md, /- First/);
    assert.match(md, /- Second/);
    assert.match(md, /```ts\nconst x = 1;\n```/);
  });

  it("reads plain string descriptions", () => {
    assert.equal(
      issueDescriptionMarkdown({ description: "Plain text" }),
      "Plain text"
    );
    assert.equal(issueDescriptionMarkdown({ description: null }), "");
    assert.equal(issueDescriptionMarkdown({}), "");
  });
});

describe("markdown to ADF", () => {
  it("converts headings, bold, and paragraphs", () => {
    const adf = markdownToAdf("## User Story\n\n**As a** developer");
    assert.equal(adf.type, "doc");
    assert.equal(adf.content[0]?.type, "heading");
    assert.deepEqual((adf.content[0] as { attrs?: { level?: number } }).attrs, {
      level: 2
    });
    const paragraph = adf.content[1];
    assert.equal(paragraph?.type, "paragraph");
    assert.deepEqual(parseInlineMarkdown("**As a** developer"), [
      { type: "text", text: "As a", marks: [{ type: "strong" }] },
      { type: "text", text: " developer" }
    ]);
  });

  it("converts bullet lists and code blocks", () => {
    const adf = markdownToAdf("```ts\nconst x = 1;\n```\n\n- First\n- Second");
    assert.equal(adf.content[0]?.type, "codeBlock");
    assert.equal(adf.content[1]?.type, "bulletList");
  });

  it("round-trips common description markdown", () => {
    const source = "## Scope\n\n**Goal:** ship it\n\n- one\n- two";
    const roundTrip = adfToMarkdown(markdownToAdf(source));
    assert.match(roundTrip, /## Scope/);
    assert.match(roundTrip, /\*\*Goal:\*\* ship it/);
    assert.match(roundTrip, /- one/);
    assert.match(roundTrip, /- two/);
  });

  it("writes ADF JSON for acli description files", () => {
    withTempDir((root) => {
      const filePath = path.join(root, "description.adf.json");
      writeAcliDescriptionFile("# Title\n\n**bold**", filePath);
      const parsed = parseAdfDoc(fs.readFileSync(filePath, "utf-8"));
      assert.ok(parsed);
      assert.equal(parsed?.content[0]?.type, "heading");
    });
  });

  it("builds create JSON with ADF descriptions", () => {
    const json = buildCreateWorkitemJson({
      project: "PROJ",
      issueType: "Task",
      summary: "Title",
      description: "## Notes\n\n**Important**"
    });
    const description = json.fields.description as {
      type?: string;
      content?: Array<{ type?: string }>;
    };
    assert.equal(description.type, "doc");
    assert.equal(description.content?.[0]?.type, "heading");
  });
});

describe("format helpers continued", () => {
  it("reads issue type names", () => {
    assert.equal(
      issueTypeName({ issuetype: { name: "Story" } }),
      "Story"
    );
    assert.equal(issueTypeName({}), "Issue");
  });

  it("detects hierarchy roots", () => {
    assert.equal(isHierarchyRoot("Epic"), true);
    assert.equal(isHierarchyRoot("initiative"), true);
    assert.equal(isHierarchyRoot("Story"), false);
  });

  it("maps status names into buckets", () => {
    assert.equal(
      statusBucketFromFields({ status: { name: "To Do", statusCategory: { key: "new" } } }),
      "todo"
    );
    assert.equal(
      statusBucketFromFields({ status: { name: "In QA" } }),
      "inTest"
    );
    assert.equal(
      statusBucketFromFields({ status: { name: "Done", statusCategory: { key: "done" } } }),
      "done"
    );
    assert.equal(
      statusBucketFromFields({ status: { name: "Code Review" } }),
      "codeReview"
    );
    assert.equal(
      statusBucketFromFields({ status: { name: "Backlog" } }),
      "todo"
    );
    assert.equal(
      statusBucketFromFields({ status: { name: "Retest in QA" } }),
      "inTest"
    );
    assert.equal(statusBucketFromFields({ status: { name: "Building" } }), "inProgress");
    assert.equal(statusBucketFromFields({}), "inProgress");
  });

  it("formats pulled ticket markdown with frontmatter", () => {
    const { folder, body } = formatTicketMarkdown(
      "PROJ-1",
      {
        summary: "Hello",
        issuetype: { name: "Task" },
        assignee: { accountId: ME, displayName: "Me" },
        status: { name: "In Progress", statusCategory: { key: "indeterminate" } },
        description: "Body text",
        created: "2026-01-01T00:00:00.000Z",
        updated: "2026-01-02T00:00:00.000Z"
      },
      "example.atlassian.net",
      ME
    );
    assert.equal(folder, "me");
    assert.match(body, /^---\n/);
    assert.match(body, /title: "Hello"/);
    assert.match(body, /url: https:\/\/example\.atlassian\.net\/browse\/PROJ-1/);
    assert.match(body, /status: inProgress/);
    assert.match(body, /Body text/);
  });
});

describe("local markdown", () => {
  const sample = `---
title: "Fix login"
assigned: "Ada"
feature_team: "None"
type: "Story"
url: https://example.atlassian.net/browse/PROJ-7
status: todo
created: ""
updated: ""
---

Description here.
`;

  it("parses ticket frontmatter", () => {
    const ticket = parseTicketMarkdown(
      sample,
      "/tmp/workspace/jira/story/Fix login - PROJ-7.md",
      "/tmp/workspace"
    );
    assert.ok(ticket);
    assert.equal(ticket!.key, "PROJ-7");
    assert.equal(ticket!.title, "Fix login");
    assert.equal(ticket!.description, "Description here.");
    assert.equal(ticket!.typeDir, "story");
  });

  it("detects browse links in markdown", () => {
    assert.equal(
      jiraTicketKeyInMarkdown("See [x](https://x/browse/PROJ-1)", "PROJ-1"),
      true
    );
    assert.equal(jiraTicketKeyInMarkdown("no link", "PROJ-1"), false);
  });

  it("returns null for invalid frontmatter", () => {
    assert.equal(parseTicketMarkdown("not yaml", "/tmp/x.md", "/tmp"), null);
    assert.equal(
      parseTicketMarkdown(
        "---\ntitle: \"x\"\nurl: https://example.com\n---\n",
        "/tmp/x.md",
        "/tmp"
      ),
      null
    );
  });

  it("resolves jira root and indexes local tickets", () => {
    withTempDir((cwd) => {
      assert.equal(jiraRootDir(cwd), path.join(cwd, "jira"));
      const body = `---
title: "Alpha"
assigned: "Ada"
feature_team: "None"
type: "Task"
url: https://example.atlassian.net/browse/PROJ-1
status: todo
created: ""
updated: ""
---

Body.
`;
      writeTicket(cwd, "task", "Alpha - PROJ-1.md", body);
      writeTicket(cwd, "task", "Beta - PROJ-2.md", body.replace(/PROJ-1/g, "PROJ-2").replace(/Alpha/g, "Beta"));

      const tickets = listLocalTickets(cwd);
      assert.equal(tickets.length, 2);
      assert.equal(tickets[0]!.key, "PROJ-1");
      assert.equal(tickets[1]!.key, "PROJ-2");

      const index = buildLocalTicketIndex(cwd);
      assert.equal(localTicketPath("PROJ-2", cwd, index), tickets[1]!.path);
      assert.equal(localTicketPath("PROJ-999", cwd, index), null);

      const summary = summarizeLocalTickets(cwd);
      assert.equal(summary.count, 2);
      assert.deepEqual(summary.byType, [
        { typeDir: "task", keys: ["PROJ-1", "PROJ-2"] }
      ]);
    });
  });
});

describe("children JQL helpers", () => {
  it("builds single-parent child JQL", () => {
    assert.equal(
      childIssuesJql("PROJ-1"),
      'parent = PROJ-1 OR "Epic Link" = PROJ-1'
    );
  });

  it("builds bulk child JQL", () => {
    assert.equal(
      bulkChildIssuesJql(["PROJ-1", "PROJ-2"]),
      'parent IN (PROJ-1, PROJ-2) OR "Epic Link" IN (PROJ-1, PROJ-2)'
    );
  });

  it("extracts parent keys from fields", () => {
    assert.equal(
      parentKeyFromFields({ parent: { key: "PROJ-9" } }),
      "PROJ-9"
    );
    assert.equal(parentKeyFromFields({ parent: { key: "" } }), null);
    assert.equal(parentKeyFromFields({}), null);
  });

  it("reads parent summaries when embedded", () => {
    assert.equal(
      parentSummaryFromFields({
        parent: { fields: { summary: " Epic title " } }
      }),
      "Epic title"
    );
    assert.equal(
      parentSummaryFromFields({ parent: { summary: "Direct summary" } }),
      "Direct summary"
    );
    assert.equal(parentSummaryFromFields({}), null);
  });

  it("builds empty bulk JQL for no parents", () => {
    assert.equal(
      bulkChildIssuesJql([]),
      "parent IN () OR \"Epic Link\" IN ()"
    );
  });
});

describe("board content", () => {
  it("sanitizes one-line summaries", () => {
    assert.equal(
      boardTicketOneLine("Line\nbreak ```code```"),
      "Line break '''code'''"
    );
  });

  it("groups issues into board sections and statuses", () => {
    const content = buildBoardContent(
      [
        {
          key: "PROJ-1",
          fields: {
            summary: "Mine",
            assignee: { accountId: ME, displayName: "Me" },
            status: { name: "To Do", statusCategory: { key: "new" } }
          }
        },
        {
          key: "PROJ-2",
          fields: {
            summary: "Theirs",
            assignee: { accountId: "other", displayName: "Bob" },
            status: { name: "In Progress", statusCategory: { key: "indeterminate" } }
          }
        }
      ],
      ME,
      "2026-07-17T12:00:00.000Z"
    );
    assert.equal(content.sections.myTickets.statuses.todo.length, 1);
    assert.equal(content.sections.teammates.statuses.inProgress.length, 1);
    const md = formatBoardPlainText(content);
    assert.match(md, /PROJ-1: Mine/);
    assert.doesNotMatch(md, /PROJ-2: Theirs/);
    const full = formatBoardPlainText(content, { full: true });
    assert.match(full, /PROJ-2: Theirs/);
  });

  it("does not include last sync time in plain-text output", () => {
    const content = buildBoardContent([], ME, "2026-07-17T12:00:00.000Z");
    const md = formatBoardPlainText(content);
    assert.match(md, /^Here is the current Jira board status\./m);
    assert.doesNotMatch(md, /Last synced:/);
  });

  it("places unassigned and done tickets in the right sections", () => {
    const content = buildBoardContent(
      [
        {
          key: "PROJ-3",
          fields: {
            summary: "Nobody",
            assignee: null,
            status: { name: "Done", statusCategory: { key: "done" } }
          }
        },
        {
          key: "PROJ-4",
          fields: {
            summary: "Review me",
            assignee: { accountId: ME, displayName: "Me" },
            status: { name: "Peer Review" }
          }
        }
      ],
      ME,
      "2026-07-17T12:00:00.000Z"
    );
    assert.equal(content.sections.unassigned.statuses.done.length, 1);
    assert.equal(content.sections.myTickets.statuses.codeReview.length, 1);
    assert.equal(content.sections.unassigned.statuses.done.length, 1);
  });
});

describe("sprint retention", () => {
  const sprint = {
    id: 1,
    name: "Sprint 1",
    startDate: "2026-01-01T00:00:00.000Z",
    endDate: "2026-01-14T23:59:59.000Z"
  };

  it("includes sprints inside the padded window", () => {
    const mid = Date.parse("2026-01-08T12:00:00.000Z");
    assert.equal(isSprintInRetentionWindow(sprint, mid), true);
    assert.equal(sprintsInRetentionWindow([sprint], mid).length, 1);
  });

  it("excludes sprints far outside the window", () => {
    const far = Date.parse("2026-03-01T00:00:00.000Z");
    assert.equal(isSprintInRetentionWindow(sprint, far), false);
  });

  it("excludes sprints with missing dates", () => {
    assert.equal(
      isSprintInRetentionWindow({ id: 2, name: "No dates" }, Date.now()),
      false
    );
  });

  it("includes sprints just inside the padded start boundary", () => {
    const start = Date.parse("2026-01-01T00:00:00.000Z");
    const justInside = start - SPRINT_RETENTION_BUFFER_MS + 1;
    assert.equal(isSprintInRetentionWindow(sprint, justInside), true);
  });

  it("computes misc delete cutoff after sprint end buffer", () => {
    const afterEnd =
      Date.parse("2026-01-14T23:59:59.000Z") + SPRINT_RETENTION_BUFFER_MS + 1;
    const cutoff = miscDeleteCutoffMs([sprint], afterEnd);
    assert.ok(cutoff > 0);
    assert.equal(shouldDeleteMiscTicket(false, [sprint], afterEnd), true);
    assert.equal(shouldDeleteMiscTicket(true, [sprint], afterEnd), false);
  });

  it("returns zero cutoff when no sprint has ended past buffer", () => {
    const early = Date.parse("2026-01-02T00:00:00.000Z");
    assert.equal(miscDeleteCutoffMs([sprint], early), 0);
    assert.equal(shouldDeleteMiscTicket(false, [sprint], early), false);
  });
});

describe("writeBoard", () => {
  const me = "account-me";
  const site = "example.atlassian.net";
  const sprint = {
    id: 1,
    name: "Sprint 1",
    startDate: "2026-01-01T00:00:00.000Z",
    endDate: "2026-01-14T23:59:59.000Z"
  };

  it("writes new tickets under assignee folders", () => {
    withTempDir((root) => {
      const outputRoot = path.join(root, "references");
      const result = writeBoard(
        [{ key: "PROJ-1", fields: issueFields("Alpha", { accountId: me, displayName: "Me" }) }],
        {
          outputRoot,
          meAccountId: me,
          siteHost: site,
          clean: true,
          boardSprints: [sprint]
        }
      );
      assert.deepEqual(result.added, ["PROJ-1"]);
      assert.equal(result.counts.me, 1);
      assert.ok(fs.existsSync(path.join(outputRoot, "me", "PROJ-1.md")));
    });
  });

  it("archives sprint tickets missing from the fetch into misc", () => {
    withTempDir((root) => {
      const outputRoot = path.join(root, "references");
      fs.mkdirSync(path.join(outputRoot, "team"), { recursive: true });
      fs.writeFileSync(
        path.join(outputRoot, "team", "PROJ-9.md"),
        "# stale\n",
        "utf-8"
      );

      const result = writeBoard(
        [{ key: "PROJ-1", fields: issueFields("Fresh", { accountId: me, displayName: "Me" }) }],
        {
          outputRoot,
          meAccountId: me,
          siteHost: site,
          clean: false,
          boardSprints: [sprint],
          nowMs: Date.parse("2026-01-08T12:00:00.000Z")
        }
      );

      assert.deepEqual(result.archived, ["PROJ-9"]);
      assert.ok(fs.existsSync(path.join(outputRoot, "misc", "PROJ-9.md")));
      assert.equal(fs.existsSync(path.join(outputRoot, "team", "PROJ-9.md")), false);
    });
  });

  it("detects updates and assignee moves", () => {
    withTempDir((root) => {
      const outputRoot = path.join(root, "references");
      const first = writeBoard(
        [{ key: "PROJ-1", fields: issueFields("Alpha", { accountId: me, displayName: "Me" }) }],
        {
          outputRoot,
          meAccountId: me,
          siteHost: site,
          clean: true,
          boardSprints: [sprint]
        }
      );
      assert.deepEqual(first.updated, []);

      const second = writeBoard(
        [{ key: "PROJ-1", fields: issueFields("Alpha revised", { accountId: me, displayName: "Me" }) }],
        {
          outputRoot,
          meAccountId: me,
          siteHost: site,
          clean: false,
          boardSprints: [sprint]
        }
      );
      assert.deepEqual(second.updated, ["PROJ-1"]);

      const third = writeBoard(
        [
          {
            key: "PROJ-1",
            fields: issueFields("Alpha revised", {
              accountId: "other",
              displayName: "Bob"
            })
          }
        ],
        {
          outputRoot,
          meAccountId: me,
          siteHost: site,
          clean: false,
          boardSprints: [sprint]
        }
      );
      assert.deepEqual(third.moved, [{ key: "PROJ-1", from: "me", to: "team" }]);
      assert.ok(fs.existsSync(path.join(outputRoot, "team", "PROJ-1.md")));
    });
  });

  it("deletes stale misc tickets after sprint retention ends", () => {
    withTempDir((root) => {
      const outputRoot = path.join(root, "references");
      fs.mkdirSync(path.join(outputRoot, "misc"), { recursive: true });
      fs.writeFileSync(
        path.join(outputRoot, "misc", "PROJ-99.md"),
        "# old\n",
        "utf-8"
      );
      const afterEnd =
        Date.parse("2026-01-14T23:59:59.000Z") + SPRINT_RETENTION_BUFFER_MS + 1;

      const result = writeBoard([], {
        outputRoot,
        meAccountId: me,
        siteHost: site,
        clean: false,
        boardSprints: [sprint],
        nowMs: afterEnd
      });

      assert.deepEqual(result.deleted, ["PROJ-99"]);
      assert.equal(fs.existsSync(path.join(outputRoot, "misc", "PROJ-99.md")), false);
    });
  });
});

describe("writeBoardCache", () => {
  it("writes board.json under the home config dir", () => {
    withTempDir((dir) => {
      const home = path.join(dir, "home");
      fs.mkdirSync(home, { recursive: true });
      const content = buildBoardContent(
        [
          {
            key: "PROJ-1",
            fields: issueFields("Alpha", {
              accountId: "account-me",
              displayName: "Me"
            })
          }
        ],
        "account-me",
        "2026-07-17T12:00:00.000Z"
      );
      writeBoardCache(content, home);
      const md = formatBoardPlainText(content);
      assert.doesNotMatch(md, /Last synced:/);
      assert.match(md, /PROJ-1: Alpha/);
      assert.doesNotMatch(md, /references\//);
    });
  });
});

describe("command dispatch", () => {
  it("rejects invalid pull and push keys", async () => {
    assert.equal(await runPullCommand(["node", "jira", "pull", "not-a-key"]), 1);
    assert.equal(await runPushCommand(["node", "jira", "push", "not-a-key"]), 1);
  });

  it("fails sync when config is incomplete", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "jira-sync-test-"));
    const prev = process.cwd();
    try {
      process.chdir(dir);
      assert.equal(await runSyncCommand(), 1);
    } finally {
      process.chdir(prev);
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("format misc helpers", () => {
  it("json-encodes yaml scalars", () => {
    assert.equal(yamlScalar("hello"), '"hello"');
    assert.equal(yamlScalar('say "hi"'), '"say \\"hi\\""');
  });

  it("coerces assignee records", () => {
    assert.equal(assigneeRecord(null), null);
    assert.deepEqual(assigneeRecord({ displayName: "Ada" }), {
      displayName: "Ada"
    });
    assert.equal(assigneeRecord("nope"), null);
  });

  it("includes core fields in pull field list", () => {
    assert.match(jiraPullFields(), /key,summary,assignee/);
    assert.match(jiraPullFields(), /created/);
    assert.match(jiraPullFields(), /updated/);
  });
});

describe("board content edge cases", () => {
  it("skips issues without keys", () => {
    const content = buildBoardContent(
      [{ fields: { summary: "Ghost" } }, { key: "PROJ-1", fields: { summary: "Real" } }],
      ME,
      "2026-07-17T12:00:00.000Z"
    );
    const all = Object.values(content.sections).flatMap((section) =>
      Object.values(section.statuses).flat()
    );
    assert.equal(all.length, 1);
    assert.equal(all[0]!.key, "PROJ-1");
  });

  it("renders empty sections in plain-text output", () => {
    const content = buildBoardContent([], ME, "2026-07-17T12:00:00.000Z");
    const md = formatBoardPlainText(content);
    assert.match(md, /# My tickets/);
    assert.match(md, /# Unassigned/);
    assert.doesNotMatch(md, /# Teammates/);
    assert.doesNotMatch(md, /# Misc/);
    assert.match(formatBoardPlainText(content, { full: true }), /# Teammates/);
    assert.match(JSON.stringify(content), /"myTickets"/);
  });
});

describe("children parent extraction", () => {
  it("reads epic link objects", () => {
    assert.equal(
      parentKeyFromFields({ parent: { key: "PROJ-1" } }),
      "PROJ-1"
    );
    assert.equal(
      parentKeyFromFields({ [epicLinkFieldId()]: { key: "PROJ-EPIC" } }),
      "PROJ-EPIC"
    );
  });
});

describe("cli output", () => {
  it("prints help and pull change markers", () => {
    const help = captureStdout(() => printHelp());
    assert.match(help, /jira pull/);
    assert.match(help, /jira sync/);
    assert.match(help, /Local tickets:/);
    assert.match(help, /Agent workspace:/);
    assert.match(help, /jira show/);
    assert.match(help, /jira acli/);
    assert.match(help, /jira info/);
    assert.match(help, /jira board/);

    assert.equal(pullChangeMark("added"), "+ ");
    assert.equal(pullChangeMark("updated"), "~ ");
    assert.equal(pullChangeMark("deleted"), "- ");
    assert.equal(pullChangeMark("moved"), "> ");
    assert.equal(pullChangeMark("unchanged"), "  ");

    const added = captureStdout(() => printPulled("PROJ-1", "Title", "added"));
    assert.match(added, /\+ PROJ-1/);
    assert.match(added, /Title/);

    const updated = captureStdout(() =>
      printPulled("PROJ-2", "Revised", "updated")
    );
    assert.match(updated, /~ PROJ-2/);
  });

  it("prints child issue listings", () => {
    const out = captureStdout(() =>
      printChildIssues([
        { key: "PROJ-2", summary: "Child", issueType: "Story" }
      ])
    );
    assert.match(out, /PROJ-2/);
    assert.match(out, /Child/);
  });
});

describe("acli passthrough argv", () => {
  it("builds acli jira argv from jira acli", () => {
    assert.deepEqual(
      buildAcliJiraArgs(["node", "jira", "acli", "workitem", "view", "KEY-1"]),
      ["jira", "workitem", "view", "KEY-1"]
    );
    assert.deepEqual(
      buildAcliJiraArgs(["node", "jira", "acli", "jira", "project", "list"]),
      ["jira", "project", "list"]
    );
    assert.deepEqual(buildAcliJiraArgs(["node", "jira", "acli"]), ["jira"]);
  });

  it("blocks unsafe auth and destructive commands", () => {
    assert.match(
      blockedAcliJiraReason(["jira", "auth", "login"]) ?? "",
      /blocked for agents: auth login/
    );
    assert.match(
      blockedAcliJiraReason(["jira", "workitem", "delete", "KEY-1"]) ?? "",
      /blocked for agents: workitem delete/
    );
    assert.match(
      blockedAcliJiraReason(["jira", "workitem", "create", "--summary", "x"]) ?? "",
      /use jira create/
    );
    assert.equal(blockedAcliJiraReason(["jira", "auth", "status"]), null);
    assert.equal(
      blockedAcliJiraReason(["jira", "workitem", "view", "KEY-1", "--json"]),
      null
    );
    assert.match(
      blockedAcliJiraReason(["jira", "--json", "workitem", "create"]) ?? "",
      /blocked for agents: workitem create/
    );
  });

  it("rejects blocked commands before spawning acli", () => {
    const code = runAcliPassthroughCommand([
      "node",
      "jira",
      "acli",
      "workitem",
      "delete",
      "KEY-1"
    ]);
    assert.equal(code, 1);
  });
});

describe("argv and custom fields", () => {
  it("parses subcommand flags", () => {
    const parsed = parseSubcommandArgv(
      ["node", "jira", "search", "project = X", "--fields", "key,summary"],
      3
    );
    assert.equal(parsed.positional[0], "project = X");
    assert.equal(parsed.flags.get("fields"), "key,summary");
  });

  it("parses field flags for create", () => {
    const fields = parseFieldFlags([
      "customfield_10354=16409",
      "customfield_10998=15465",
      "customfield_10021=27857",
      "customfield_10023=1"
    ]);
    assert.deepEqual(fields.customfield_10354, [{ id: "16409" }]);
    assert.deepEqual(fields.customfield_10998, [{ id: "15465" }]);
    assert.equal(fields.customfield_10021, 27857);
    assert.equal(fields.customfield_10023, 1);
  });

  it("collects repeated --field flags from argv", () => {
    assert.deepEqual(
      collectFieldFlags([
        "node",
        "jira",
        "create",
        "--field",
        "customfield_10354=16409",
        "--summary",
        "x",
        "--field",
        "customfield_10023=1"
      ]),
      ["customfield_10354=16409", "customfield_10023=1"]
    );
  });

  it("picks the active or in-window sprint", () => {
    assert.equal(
      pickCurrentSprintId([
        { id: 1, state: "closed" },
        { id: 2, state: "active" }
      ]),
      2
    );
    assert.equal(
      pickCurrentSprintId(
        [
          {
            id: 9,
            startDate: "2026-07-01T00:00:00.000Z",
            endDate: "2026-07-14T00:00:00.000Z"
          }
        ],
        Date.parse("2026-07-10T12:00:00.000Z")
      ),
      9
    );
  });

  it("applies Feature Team, board sprint, story points, and Epic capitalizable", () => {
    const fields = applyCreateFieldDefaults(
      {},
      {
        source: {
          featureTeamField: NOVACORE_FEATURE_TEAM_FIELD,
          featureTeamOptionId: "16409",
          sprintField: JIRA_SPRINT_FIELD,
          storyPointsField: JIRA_STORY_POINTS_FIELD,
          sprints: [{ id: 27857, state: "active" }]
        },
        project: "NOVACORE",
        issueType: "Epic",
        boardDefaults: true,
        storyPoints: 1
      }
    );
    assert.deepEqual(fields[NOVACORE_FEATURE_TEAM_FIELD], [{ id: "16409" }]);
    assert.equal(fields[JIRA_SPRINT_FIELD], 27857);
    assert.equal(fields[JIRA_STORY_POINTS_FIELD], 1);
    assert.deepEqual(fields.customfield_10998, [{ id: "15465" }]);
  });

  it("does not override explicit --field values when applying defaults", () => {
    const fields = applyCreateFieldDefaults(
      {
        [NOVACORE_FEATURE_TEAM_FIELD]: [{ id: "999" }],
        [JIRA_SPRINT_FIELD]: 1
      },
      {
        source: {
          featureTeamField: NOVACORE_FEATURE_TEAM_FIELD,
          featureTeamOptionId: "16409",
          sprintField: JIRA_SPRINT_FIELD,
          storyPointsField: JIRA_STORY_POINTS_FIELD,
          sprints: [{ id: 27857, state: "active" }]
        },
        project: "NOVACORE",
        issueType: "Task",
        boardDefaults: true,
        storyPoints: 3
      }
    );
    assert.deepEqual(fields[NOVACORE_FEATURE_TEAM_FIELD], [{ id: "999" }]);
    assert.equal(fields[JIRA_SPRINT_FIELD], 1);
    assert.equal(fields[JIRA_STORY_POINTS_FIELD], 3);
  });

  it("builds create JSON with parent and custom fields", () => {
    const json = buildCreateWorkitemJson({
      project: "NOVACORE",
      issueType: "Epic",
      summary: "Test epic",
      description: "Body",
      parent: "NOVACORE-1",
      customFields: capitalizableYesField()
    });
    assert.equal((json.fields.project as { key: string }).key, "NOVACORE");
    assert.equal((json.fields.issuetype as { name: string }).name, "Epic");
    assert.equal((json.fields.parent as { key: string }).key, "NOVACORE-1");
  });

  it("builds edit JSON with custom fields as top-level keys", () => {
    const json = buildEditWorkitemJson({
      key: "NOVACORE-1",
      summary: "New title",
      customFields: {
        [JIRA_STORY_POINTS_FIELD]: 2,
        [NOVACORE_FEATURE_TEAM_FIELD]: [{ id: "16409" }]
      }
    });
    assert.deepEqual(json.issues, ["NOVACORE-1"]);
    assert.equal(json.summary, "New title");
    assert.equal(json[JIRA_STORY_POINTS_FIELD], 2);
    assert.deepEqual(json[NOVACORE_FEATURE_TEAM_FIELD], [{ id: "16409" }]);
  });

  it("parses created issue keys from JSON stdout", () => {
    assert.equal(
      parseCreatedIssueKey('{"key":"NOVACORE-99","id":"123"}'),
      "NOVACORE-99"
    );
    assert.equal(parseCreatedIssueKey("Created NOVACORE-42"), "NOVACORE-42");
  });
});

describe("draft frontmatter", () => {
  it("parses local draft fields without a Jira key", () => {
    const draft = parseDraftFrontmatter(`---
title: "Story title"
assigned: "None"
type: "Story"
url: "None"
status: "draft"
project: "NOVACORE"
parent: "NOVACORE-100"
feature_team: "None"
---
## User Story
Body here`);
    assert.ok(draft);
    assert.equal(draft.project, "NOVACORE");
    assert.equal(draft.issueType, "Story");
    assert.equal(draft.parent, "NOVACORE-100");
    assert.match(draft.description, /Body here/);
  });
});

describe("jira info", () => {
  it("parses issue type names from project view JSON", () => {
    assert.deepEqual(
      parseProjectIssueTypeNames({
        issueTypes: [
          { name: "Story", hierarchyLevel: 0 },
          { name: "Epic", hierarchyLevel: 1 }
        ]
      }),
      ["Epic", "Story"]
    );
    assert.deepEqual(parseProjectIssueTypeNames({}), []);
    assert.equal(parseProjectName({ name: "NOVA Core" }), "NOVA Core");
    assert.deepEqual(
      parseProjectIssueTypeDetails({
        issueTypes: [{ name: "Sub-task", hierarchyLevel: -1, subtask: true }]
      }),
      [{ name: "Sub-task", hierarchyLevel: -1, subtask: true }]
    );
  });

  it("parses feature team and board context helpers", () => {
    assert.equal(
      parseFeatureTeamFromBoardJql(
        'project = NOVACORE AND "Feature Team" = dynaFormRaptors ORDER BY key'
      ),
      "dynaFormRaptors"
    );
    assert.deepEqual(
      statusNamesFromIssues([
        { fields: { status: { name: "Code Review" } } },
        { fields: { status: { name: "To Do" } } },
        { fields: { status: { name: "Code Review" } } }
      ]),
      ["Code Review", "To Do"]
    );
    assert.equal(
      meDisplayNameFromIssues(
        [
          {
            fields: {
              assignee: { accountId: "account-me", displayName: "Ada" }
            }
          }
        ],
        "account-me"
      ),
      "Ada"
    );
    assert.deepEqual(
      featureTeamOptionFromIssues(
        [
          {
            fields: {
              customfield_1: [{ id: "9", value: "dynaFormRaptors" }]
            }
          }
        ],
        "customfield_1",
        "dynaFormRaptors"
      ),
      { id: "9", name: "dynaFormRaptors" }
    );
  });

  it("formats plain-text workspace context", () => {
    const text = formatJiraInfoPlainText({
      site: "example.atlassian.net",
      cloudId: "cloud-uuid",
      project: "TEAM",
      boardId: "42",
      boardJql: "project = TEAM",
      effectiveJql: "project = TEAM AND sprint in (99)",
      meAccountId: "account-me",
      meDisplayName: "Ada Lovelace",
      featureTeamField: "customfield_1",
      featureTeamName: "Alpha",
      featureTeamOptionId: "99",
      epicLinkField: "customfield_2",
      sprintField: "customfield_10021",
      storyPointsField: "customfield_10023",
      linkTypes: ["Blocks", "Relates", "Duplicate", "Clones"],
      issueTypes: [
        { name: "Epic", hierarchyLevel: 1, subtask: false },
        { name: "Story", hierarchyLevel: 0, subtask: false },
        { name: "Task", hierarchyLevel: 0, subtask: false }
      ],
      statuses: ["In Progress", "To Do"],
      sprints: [
        {
          id: 99,
          name: "Sprint 12",
          state: "active",
          startDate: "2026-07-01T00:00:00.000Z",
          endDate: "2026-07-14T00:00:00.000Z"
        }
      ],
      localTickets: {
        count: 4,
        byType: [
          { typeDir: "story", keys: ["TEAM-1", "TEAM-2"] },
          { typeDir: "task", keys: ["TEAM-3", "TEAM-4"] }
        ]
      }
    });
    assert.match(text, /^cloudId: cloud-uuid$/m);
    assert.match(text, /^project: TEAM$/m);
    assert.match(text, /^accountId: account-me$/m);
    assert.match(text, /^displayName: Ada Lovelace$/m);
    assert.match(text, /^featureTeamField: customfield_1$/m);
    assert.match(text, /^featureTeam: Alpha \(99\)$/m);
    assert.doesNotMatch(text, /^featureTeamName:/m);
    assert.doesNotMatch(text, /^featureTeamOptionId:/m);
    assert.match(text, /^sprintId: 99$/m);
    assert.match(text, /^sprintName: Sprint 12$/m);
    assert.match(text, /^sprintDates: 2026-07-01 to 2026-07-14$/m);
    assert.match(
      text,
      /^story: TEAM-1, TEAM-2\ntask: TEAM-3, TEAM-4$/m
    );
    assert.doesNotMatch(text, /^statuses:/m);
    assert.doesNotMatch(text, /^linkTypes:/m);
    assert.match(text, /\n\nBoard:\nboardId:/);
    assert.doesNotMatch(text, /^boardJql:/m);
    assert.doesNotMatch(text, /^effectiveJql:/m);
    assert.doesNotMatch(text, /^issueTypes:/m);
    assert.doesNotMatch(text, /^board: run jira board \(/m);
    assert.match(text, /\n\nMe:\naccountId:/);
    assert.match(text, /\n\nLocal:\nstory: TEAM-1, TEAM-2/);
    assert.doesNotMatch(text, /\n\nCache and local\n/);
    assert.doesNotMatch(text, /^syncedAt:/m);
    assert.match(text, /\n\nMore:\nrun `jira board` for tickets and statuses/);
    assert.doesNotMatch(text, /Status buckets|Common statuses|projectName/);
  });

  it("formats empty local tickets in plain-text workspace context", () => {
    const text = formatJiraInfoPlainText({
      site: "example.atlassian.net",
      cloudId: "cloud-uuid",
      project: "TEAM",
      boardId: "42",
      boardJql: "project = TEAM",
      effectiveJql: "project = TEAM",
      meAccountId: "account-me",
      meDisplayName: "Ada Lovelace",
      featureTeamField: "customfield_1",
      featureTeamName: "",
      featureTeamOptionId: "",
      epicLinkField: "customfield_2",
      sprintField: "customfield_10021",
      storyPointsField: "customfield_10023",
      linkTypes: [],
      issueTypes: [],
      statuses: [],
      sprints: [],
      localTickets: { count: 0, byType: [] }
    });
    assert.match(text, /\n\nLocal:\nNo local tickets in \.\/jira\//);
  });

  it("reads and writes the board info cache", () => {
    withTempDir((dir) => {
      const home = path.join(dir, "home");
      fs.mkdirSync(home, { recursive: true });
      const input = {
        syncedAt: "2026-07-15T12:00:00.000Z",
        boardId: "42",
        site: "example.atlassian.net",
        project: "TEAM",
        projectName: "Team Project",
        effectiveJql: "project = TEAM",
        retainedSprints: [],
        counts: { me: 0, team: 0, unassigned: 0, misc: 0 },
        issueCount: 0,
        localTicketCount: 0,
        issueTypes: [],
        issueTypeDetails: [],
        statuses: [],
        featureTeamName: "",
        featureTeamOptionId: "",
        meDisplayName: ""
      };
      writeBoardInfoCache(input, home);
      const cache = readBoardInfoCache(home);
      assert.deepEqual(cache, input);
      assert.match(
        boardInfoCachePath(home),
        /[\\/]\.config[\\/]jira[\\/]info\.json$/
      );
    });
  });

  it("reads legacy board info cache without new fields", () => {
    withTempDir((dir) => {
      const home = path.join(dir, "home");
      fs.mkdirSync(home, { recursive: true });
      const cachePath = boardInfoCachePath(home);
      fs.mkdirSync(path.dirname(cachePath), { recursive: true });
      fs.writeFileSync(
        cachePath,
        JSON.stringify({
          syncedAt: "2026-07-15T12:00:00.000Z",
          boardId: "42",
          site: "example.atlassian.net",
          project: "TEAM",
          effectiveJql: "project = TEAM",
          retainedSprints: [],
          counts: { me: 0, team: 0, unassigned: 0, misc: 0 },
          issueCount: 0,
          localTicketCount: 0,
          issueTypes: ["Story"]
        }),
        "utf-8"
      );
      const cache = readBoardInfoCache(home);
      assert.equal(cache?.projectName, "");
      assert.deepEqual(cache?.statuses, []);
      assert.deepEqual(cache?.issueTypes, ["Story"]);
    });
  });

  it("returns null for corrupt or partial board info cache", () => {
    withTempDir((dir) => {
      const home = path.join(dir, "home");
      fs.mkdirSync(home, { recursive: true });
      const cachePath = boardInfoCachePath(home);
      fs.mkdirSync(path.dirname(cachePath), { recursive: true });

      fs.writeFileSync(cachePath, "{not json", "utf-8");
      assert.equal(readBoardInfoCache(home), null);

      fs.writeFileSync(
        cachePath,
        JSON.stringify({
          syncedAt: "2026-07-15T12:00:00.000Z",
          boardId: "42",
          site: "example.atlassian.net",
          effectiveJql: "project = TEAM",
          retainedSprints: [],
          counts: { me: 0, team: 0, unassigned: 0, misc: 0 },
          issueCount: 0,
          localTicketCount: 0,
          issueTypes: []
        }),
        "utf-8"
      );
      assert.equal(readBoardInfoCache(home), null);
    });
  });

  it("prints plain text from runInfoCommand", () => {
    const out = captureStdout(() => runInfoCommand());
    assert.match(out, /^site: /m);
    assert.match(out, /^accountId: /m);
    assert.match(out, /^featureTeamField: /m);
    assert.match(out, /^cloudId: /m);
    assert.match(out, /^boardId: /m);
    assert.match(out, /\n\nBoard:\nboardId:/);
    assert.doesNotMatch(out, /Jira workspace/);
    assert.doesNotMatch(out, /Config \(~\/\.config\/jira\/config\.json\):/);
  });
});

describe("show and search command validation", () => {
  it("rejects show without a key", () => {
    const code = runShowCommand(["node", "jira", "show"]);
    assert.equal(code, 1);
  });

  it("rejects show with an invalid key", () => {
    const code = runShowCommand(["node", "jira", "show", "not-a-key"]);
    assert.equal(code, 1);
  });

  it("rejects search without jql", () => {
    const code = runSearchCommand(["node", "jira", "search"]);
    assert.equal(code, 1);
  });

  it("rejects search when only flags are given", () => {
    const code = runSearchCommand([
      "node",
      "jira",
      "search",
      "--fields",
      "key,summary"
    ]);
    assert.equal(code, 1);
  });
});


describe("agent json output", () => {
  it("strips global --json from argv", () => {
    const parsed = parseGlobalFlags(["node", "jira", "--json", "info"]);
    assert.equal(parsed.outputMode, "json");
    assert.deepEqual(parsed.argv, ["node", "jira", "info"]);
  });

  it("prints success envelope", () => {
    const out = captureStdout(() => printJsonSuccess({ ok: true }));
    const parsed = JSON.parse(out) as {
      success: boolean;
      data: unknown;
      error: string | null;
    };
    assert.equal(parsed.success, true);
    assert.deepEqual(parsed.data, { ok: true });
    assert.equal(parsed.error, null);
  });

  it("prints error envelope", () => {
    const out = captureStdout(() => printJsonError("bad", "AUTH"));
    const parsed = JSON.parse(out) as {
      success: boolean;
      data: null;
      error: string;
      code?: string;
    };
    assert.equal(parsed.success, false);
    assert.equal(parsed.data, null);
    assert.equal(parsed.error, "bad");
    assert.equal(parsed.code, "AUTH");
  });
});

describe("jira doctor", () => {
  it("returns structured checks in json mode", () => {
    const out = captureStdout(() =>
      runDoctorCommand({ outputMode: "json" })
    );
    const parsed = JSON.parse(out) as {
      success: boolean;
      data: { checks: Array<{ name: string; ok: boolean }> };
    };
    assert.ok(Array.isArray(parsed.data.checks));
    assert.ok(parsed.data.checks.some((c) => c.name === "acli-policy"));
  });

  it("includes acli policy sanity check", () => {
    const checks = gatherDoctorChecksForTest();
    const policy = checks.find((c) => c.name === "acli-policy");
    assert.ok(policy);
    assert.equal(policy?.ok, true);
  });
});

describe("jira batch", () => {
  it("rejects disallowed commands", () => {
    withTempDir((dir) => {
      const filePath = path.join(dir, "batch.json");
      fs.writeFileSync(filePath, JSON.stringify([["create"]]), "utf-8");
      const code = runBatchCommand(
        ["node", "jira", "batch", "--file", filePath],
        { outputMode: "json" }
      );
      assert.equal(code, 1);
    });
  });

  it("runs info in batch json mode", () => {
    withTempDir((dir) => {
      const filePath = path.join(dir, "batch.json");
      fs.writeFileSync(filePath, JSON.stringify([["info"]]), "utf-8");
      const out = captureStdout(() =>
        runBatchCommand(
          ["node", "jira", "batch", "--file", filePath],
          { outputMode: "json" }
        )
      );
      const parsed = JSON.parse(out) as {
        success: boolean;
        data: Array<{ index: number; success: boolean }>;
      };
      assert.equal(parsed.success, true);
      assert.equal(parsed.data[0]?.success, true);
    });
  });
});

describe("jira board command", () => {
  it("fails when board cache is missing", () => {
    withTempDir((dir) => {
      const home = path.join(dir, "home");
      fs.mkdirSync(home, { recursive: true });
      assert.equal(runBoardCommand({ outputMode: "human" }, home), 1);
    });
  });

  it("omits teammates from default output", () => {
    withTempDir((dir) => {
      const home = path.join(dir, "home");
      fs.mkdirSync(home, { recursive: true });
      const content = buildBoardContent(
        [
          {
            key: "PROJ-1",
            fields: issueFields("Mine", { accountId: ME, displayName: "Me" })
          },
          {
            key: "PROJ-2",
            fields: issueFields("Theirs", {
              accountId: "other",
              displayName: "Bob"
            })
          }
        ],
        ME,
        "2026-07-17T12:00:00.000Z"
      );
      writeBoardCache(content, home);
      const brief = captureStdout(() =>
        runBoardCommand({ outputMode: "human" }, home)
      );
      const full = captureStdout(() =>
        runBoardCommand({ outputMode: "human", full: true }, home)
      );
      assert.match(brief, /PROJ-1: Mine/);
      assert.doesNotMatch(brief, /PROJ-2: Theirs/);
      assert.doesNotMatch(brief, /# Teammates/);
      assert.match(full, /PROJ-2: Theirs/);
      assert.match(full, /# Teammates/);
    });
  });
});

describe("board.json cache validation", () => {
  it("returns null for corrupt board cache", () => {
    withTempDir((dir) => {
      const home = path.join(dir, "home");
      fs.mkdirSync(home, { recursive: true });
      const cachePath = boardCachePath(home);
      fs.mkdirSync(path.dirname(cachePath), { recursive: true });
      fs.writeFileSync(cachePath, "{not json", "utf-8");
      assert.equal(readBoardCache(home), null);
    });
  });
});

describe("sync summary formatting", () => {
  it("builds human and structured sync summaries", () => {
    const summary = buildSyncSummary({
      boardId: "42",
      sprintIds: [99],
      issueCount: 3,
      counts: { me: 1, team: 1, unassigned: 1, misc: 0 },
      boardPath: "/tmp/board.json"
    });
    const text = formatSyncSummaryHuman(summary);
    assert.match(text, /Fetched 3 issue/);
    assert.match(text, /Cache: \/tmp\/board\.json/);
  });
});
