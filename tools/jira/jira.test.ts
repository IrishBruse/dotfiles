import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseJiraKey } from "./jiraInput.ts";
import {
  issueTypeSlug,
  jiraTicketKeyInMarkdown,
  pulledTicketPath,
  ticketMarkdownFilename
} from "./pull.ts";
import {
  adfToMarkdown,
  assigneeLabel,
  classifyFolder,
  formatTicketMarkdown,
  statusBucketFromFields,
  yamlScalar
} from "./format.ts";

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
    assert.equal(name, "[DTC] Make repeatable operations deterministic.md");
  });

  it("replaces characters invalid on common filesystems", () => {
    const name = ticketMarkdownFilename(
      { summary: 'fix: a/b\\c*d?e"f' },
      "NOVACORE-2"
    );
    assert.equal(name, "fix- a-b-c-d-e-f.md");
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
    assert.equal(p, "/repo/jira/epic/Ship it.md");
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
});
