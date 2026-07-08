import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { describe, it } from "node:test";

import {
  buildJiraTicketsSkillContent,
  formatJiraTicketsSkillJson,
  formatJiraTicketsSkillMd,
  ticketsSkillOneLine,
  writeJiraTicketsSkill
} from "./commands/board/skill.ts";
import { runBoardCommand } from "./commands/board.ts";
import {
  isSprintInRetentionWindow,
  miscDeleteCutoffMs,
  shouldDeleteMiscTicket,
  sprintsInRetentionWindow,
  SPRINT_RETENTION_BUFFER_MS,
  writeBoard
} from "./commands/board/write.ts";
import { printHelp } from "./commands/help.ts";
import { runPullCommand } from "./commands/pull.ts";
import { runPushCommand } from "./commands/push.ts";
import { runSyncCommand } from "./commands/sync.ts";
import {
  issueTypeSlug,
  pulledTicketPath,
  ticketFolderName,
  ticketMarkdownFilename
} from "./commands/pull.ts";
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
  featureTeamLabel,
  formatTicketMarkdown,
  isHierarchyRoot,
  issueDescriptionMarkdown,
  issueTypeName,
  JIRA_PULL_FIELDS,
  normalizeSiteHost,
  statusBucketFromFields,
  yamlScalar
} from "./lib/format.ts";
import { parseJiraKey } from "./lib/jiraInput.ts";
import {
  buildLocalTicketIndex,
  jiraRootDir,
  jiraTicketKeyInMarkdown,
  listLocalTickets,
  localTicketPath,
  parseTicketMarkdown
} from "./lib/local.ts";
import {
  printChildIssues,
  printPulled,
  printPullSummary
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
          content: [{ type: "text", text: "Hello world" }]
        }
      ]
    };
    const md = adfToMarkdown(adf);
    assert.match(md, /## Overview/);
    assert.match(md, /Hello world/);
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

describe("board skill content", () => {
  it("sanitizes one-line summaries", () => {
    assert.equal(
      ticketsSkillOneLine("Line\nbreak ```code```"),
      "Line break '''code'''"
    );
  });

  it("groups issues into skill sections and statuses", () => {
    const content = buildJiraTicketsSkillContent(
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
      ME
    );
    assert.equal(content.sections.myTickets.statuses.todo.length, 1);
    assert.equal(content.sections.teammates.statuses.inProgress.length, 1);
    const md = formatJiraTicketsSkillMd(content);
    assert.match(md, /name: jira-board/);
    assert.match(md, /PROJ-1: Mine/);
    assert.match(md, /PROJ-2: Theirs/);
  });

  it("places unassigned and done tickets in the right sections", () => {
    const content = buildJiraTicketsSkillContent(
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
      ME
    );
    assert.equal(content.sections.unassigned.statuses.done.length, 1);
    assert.equal(content.sections.myTickets.statuses.codeReview.length, 1);
    const json = JSON.parse(formatJiraTicketsSkillJson(content)) as {
      sections: { unassigned: { statuses: { done: unknown[] } } };
    };
    assert.equal(json.sections.unassigned.statuses.done.length, 1);
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

describe("writeJiraTicketsSkill", () => {
  it("writes skill markdown and sprint json beside the skill file", () => {
    withTempDir((root) => {
      const boardRoot = path.join(root, "references");
      const skillPath = path.join(root, "skill", "SKILL.md");
      writeJiraTicketsSkill(
        [
          {
            key: "PROJ-1",
            fields: issueFields("Alpha", {
              accountId: "account-me",
              displayName: "Me"
            })
          }
        ],
        skillPath,
        "account-me",
        boardRoot
      );
      const skillDir = path.dirname(skillPath);
      assert.ok(fs.existsSync(skillPath));
      assert.ok(fs.existsSync(path.join(skillDir, "sprint.json")));
      const md = fs.readFileSync(skillPath, "utf-8");
      assert.match(md, /name: jira-board/);
      assert.match(md, /PROJ-1: Alpha/);
    });
  });
});

describe("command dispatch", () => {
  it("rejects invalid pull and push keys", async () => {
    assert.equal(await runPullCommand(["node", "jira", "pull", "not-a-key"]), 1);
    assert.equal(await runPushCommand(["node", "jira", "push", "not-a-key"]), 1);
  });

  it("fails board sync for unknown subcommands", async () => {
    assert.equal(await runBoardCommand(["node", "jira", "board", "nope"]), 1);
  });

  it("fails sync when no local tickets exist", async () => {
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
    assert.match(JIRA_PULL_FIELDS, /key,summary,assignee/);
    assert.match(JIRA_PULL_FIELDS, /created/);
    assert.match(JIRA_PULL_FIELDS, /updated/);
  });
});

describe("board skill edge cases", () => {
  it("skips issues without keys", () => {
    const content = buildJiraTicketsSkillContent(
      [{ fields: { summary: "Ghost" } }, { key: "PROJ-1", fields: { summary: "Real" } }],
      ME
    );
    const all = Object.values(content.sections).flatMap((section) =>
      Object.values(section.statuses).flat()
    );
    assert.equal(all.length, 1);
    assert.equal(all[0]!.key, "PROJ-1");
  });

  it("renders empty sections in markdown output", () => {
    const content = buildJiraTicketsSkillContent([], ME);
    const md = formatJiraTicketsSkillMd(content);
    assert.match(md, /## My tickets/);
    assert.match(md, /## Unassigned/);
    const json = formatJiraTicketsSkillJson(content);
    assert.match(json, /"myTickets"/);
  });
});

describe("children parent extraction", () => {
  it("reads epic link objects", () => {
    assert.equal(
      parentKeyFromFields({ parent: { key: "PROJ-1" } }),
      "PROJ-1"
    );
    assert.equal(
      parentKeyFromFields({ "": { key: "PROJ-EPIC" } }),
      "PROJ-EPIC"
    );
  });
});

describe("cli output", () => {
  it("prints help and pull summaries", () => {
    const help = captureStdout(() => printHelp());
    assert.match(help, /jira pull/);
    assert.match(help, /jira board sync/);

    const pulled = captureStdout(() => printPulled("PROJ-1", "Title"));
    assert.match(pulled, /PROJ-1/);
    assert.match(pulled, /Title/);

    const summary = captureStdout(() => printPullSummary(2));
    assert.match(summary, /Pulled 2 issues/);
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
