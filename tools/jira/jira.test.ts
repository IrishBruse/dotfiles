import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { childIssuesJql } from "./children.ts";
import { parseJiraKey } from "./jiraInput.ts";
import {
  issueTypeSlug,
  pulledTicketPath,
  ticketMarkdownFilename
} from "./pull.ts";
import { jiraTicketKeyInMarkdown, parseTicketMarkdown } from "./local.ts";
import {
  adfToMarkdown,
  assigneeLabel,
  classifyFolder,
  featureTeamLabel,
  formatTicketMarkdown,
  JIRA_PULL_FIELDS,
  JIRA_SEARCH_FIELDS,
  JIRA_VIEW_EXTRA_FIELDS,
  statusBucketFromFields,
  yamlScalar
} from "./format.ts";

describe("JIRA field lists", () => {
  it("keeps search fields separate from view-only extras", () => {
    assert.equal(
      JIRA_PULL_FIELDS,
      `${JIRA_SEARCH_FIELDS},${JIRA_VIEW_EXTRA_FIELDS}`
    );
    for (const blocked of ["created", "updated", "customfield_10354"]) {
      assert.ok(
        !JIRA_SEARCH_FIELDS.split(",").includes(blocked),
        `search fields must not include ${blocked}`
      );
      assert.ok(
        JIRA_VIEW_EXTRA_FIELDS.split(",").includes(blocked),
        `view extras must include ${blocked}`
      );
    }
  });
});

describe("childIssuesJql", () => {
  it("matches sub-tasks and epic-linked stories", () => {
    assert.equal(
      childIssuesJql("NOVACORE-1"),
      'parent = NOVACORE-1 OR "Epic Link" = NOVACORE-1'
    );
  });
});

describe("parseJiraKey", () => {
  it("accepts bare issue keys", () => {
    assert.equal(parseJiraKey("PROJ-123"), "PROJ-123");
  });

  it("accepts lowercase issue keys", () => {
    assert.equal(parseJiraKey("proj-123"), "PROJ-123");
  });

  it("extracts keys from browse URLs", () => {
    assert.equal(
      parseJiraKey("https://example.atlassian.net/browse/PROJ-99"),
      "PROJ-99"
    );
  });

  it("returns null for unrelated input", () => {
    assert.equal(parseJiraKey("not a ticket"), null);
  });
});

describe("classifyFolder", () => {
  it("routes tickets by assignee", () => {
    assert.equal(classifyFolder(null, "me"), "unassigned");
    assert.equal(classifyFolder({ accountId: "me" }, "me"), "me");
    assert.equal(classifyFolder({ accountId: "other" }, "me"), "team");
  });
});

describe("issueTypeSlug", () => {
  it("lowercases issue type names for jira pull paths", () => {
    assert.equal(issueTypeSlug("Epic"), "epic");
    assert.equal(issueTypeSlug("Sub-task"), "sub-task");
  });
});

describe("ticketMarkdownFilename", () => {
  it("uses the ticket title for the filename", () => {
    const name = ticketMarkdownFilename(
      { summary: "[DTC] Make repeatable operations deterministic" },
      "NOVACORE-1"
    );
    assert.equal(
      name,
      "[DTC] Make repeatable operations deterministic - NOVACORE-1.md"
    );
  });

  it("replaces characters invalid on common filesystems", () => {
    const name = ticketMarkdownFilename(
      { summary: 'fix: a/b\\c*d?e"f' },
      "NOVACORE-2"
    );
    assert.equal(name, "fix- a-b-c-d-e-f - NOVACORE-2.md");
  });

  it("falls back to the issue key when summary is empty", () => {
    assert.equal(ticketMarkdownFilename({}, "NOVACORE-3"), "NOVACORE-3.md");
  });
});

describe("jiraTicketKeyInMarkdown", () => {
  it("matches browse URLs in frontmatter", () => {
    const md = `---
url: https://example.atlassian.net/browse/NOVACORE-9
---`;
    assert.equal(jiraTicketKeyInMarkdown(md, "NOVACORE-9"), true);
    assert.equal(jiraTicketKeyInMarkdown(md, "NOVACORE-10"), false);
  });
});

describe("parseTicketMarkdown", () => {
  it("reads frontmatter from pulled ticket files", () => {
    const content = `---
title: "Ship it"
assigned: "Ada"
feature_team: "dynaFormRaptors"
type: "Epic"
url: https://example.atlassian.net/browse/NOVACORE-9
status: todo
created: ""
updated: ""
---

Body here`;
    const ticket = parseTicketMarkdown(content, "/repo/jira/epic/Ship it.md", "/repo");
    assert.ok(ticket);
    assert.equal(ticket!.key, "NOVACORE-9");
    assert.equal(ticket!.title, "Ship it");
    assert.equal(ticket!.featureTeam, "dynaFormRaptors");
    assert.equal(ticket!.description, "Body here");
  });
});

describe("pulledTicketPath", () => {
  it("places tickets under jira/<type>/ in cwd", () => {
    const p = pulledTicketPath(
      "/repo",
      {
        issuetype: { name: "Epic" },
        summary: "Ship it"
      },
      "NOVACORE-1"
    );
    assert.equal(p, "/repo/jira/epic/Ship it - NOVACORE-1.md");
  });
});

describe("adfToMarkdown", () => {
  it("extracts paragraph and heading text", () => {
    const adf = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Summary" }]
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Body text" }]
        }
      ]
    };
    const md = adfToMarkdown(adf);
    assert.match(md, /## Summary/);
    assert.match(md, /Body text/);
  });
});

describe("yamlScalar", () => {
  it("JSON-encodes YAML scalar values", () => {
    assert.equal(yamlScalar('say "hi"'), '"say \\"hi\\""');
  });
});

describe("statusBucketFromFields", () => {
  it("maps common Jira statuses into buckets", () => {
    assert.equal(statusBucketFromFields({ status: { name: "To Do" } }), "todo");
    assert.equal(
      statusBucketFromFields({ status: { name: "In Progress" } }),
      "inProgress"
    );
    assert.equal(
      statusBucketFromFields({ status: { name: "Code Review" } }),
      "codeReview"
    );
    assert.equal(statusBucketFromFields({ status: { name: "Done" } }), "done");
  });
});

describe("assigneeLabel", () => {
  it("formats display names and fallbacks", () => {
    assert.equal(assigneeLabel(null), "Unassigned");
    assert.equal(assigneeLabel({ displayName: "Ada Lovelace" }), "Ada Lovelace");
    assert.equal(assigneeLabel({ accountId: "x" }), "Unknown");
  });
});

describe("featureTeamLabel", () => {
  it("reads value labels from the Feature Team custom field", () => {
    assert.equal(
      featureTeamLabel({
        customfield_10354: [{ id: "16409", value: "dynaFormRaptors" }]
      }),
      "dynaFormRaptors"
    );
  });

  it("returns None when Feature Team is unset", () => {
    assert.equal(featureTeamLabel({}), "None");
    assert.equal(featureTeamLabel({ customfield_10354: [] }), "None");
  });
});

describe("formatTicketMarkdown", () => {
  it("writes Jira created and updated timestamps into frontmatter", () => {
    const { body } = formatTicketMarkdown(
      "PROJ-1",
      {
        summary: "Dependabot",
        issuetype: { name: "Task" },
        assignee: null,
        status: { name: "To Do" },
        created: "2025-01-10T08:00:00.000+0000",
        updated: "2025-06-30T14:30:00.000+0000"
      },
      "example.atlassian.net",
      "me"
    );
    assert.match(body, /^created: "2025-01-10T08:00:00\.000\+0000"/m);
    assert.match(body, /^updated: "2025-06-30T14:30:00\.000\+0000"/m);
  });

  it("writes feature_team into frontmatter", () => {
    const { body } = formatTicketMarkdown(
      "PROJ-1",
      {
        summary: "Team ticket",
        issuetype: { name: "Story" },
        assignee: null,
        status: { name: "To Do" },
        created: "",
        updated: "",
        customfield_10354: [{ id: "16409", value: "dynaFormRaptors" }]
      },
      "example.atlassian.net",
      "me"
    );
    assert.match(body, /^feature_team: "dynaFormRaptors"/m);
  });
});
