import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseBoardMarkdown, sortRows } from "./board.ts";
import { parseJiraKey } from "./jiraInput.ts";
import {
  adfToMarkdown,
  classifyFolder,
  isSprintInRetentionWindow,
  shouldDeleteMiscTicket,
  statusBucketFromFields,
  ticketsSkillOneLine,
  yamlScalar
} from "./sync.ts";

describe("parseJiraKey", () => {
  it("accepts bare issue keys", () => {
    assert.equal(parseJiraKey("PROJ-123"), "PROJ-123");
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

describe("ticketsSkillOneLine", () => {
  it("flattens multiline summaries for skill tables", () => {
    assert.equal(ticketsSkillOneLine("line one\nline two"), "line one line two");
  });
});

describe("isSprintInRetentionWindow", () => {
  it("includes dates within the buffered sprint window", () => {
    const sprint = {
      id: 1,
      startDate: "2026-01-08T00:00:00.000Z",
      endDate: "2026-01-21T23:59:59.000Z"
    };
    const midSprint = Date.parse("2026-01-15T12:00:00.000Z");
    assert.equal(isSprintInRetentionWindow(sprint, midSprint), true);
  });
});

describe("shouldDeleteMiscTicket", () => {
  it("never deletes tickets still in the current fetch", () => {
    assert.equal(shouldDeleteMiscTicket(true, [], Date.now()), false);
  });
});

describe("parseBoardMarkdown", () => {
  it("parses grouped ticket rows from skill markdown", () => {
    const md = `# My tickets

**Todo:**

- PROJ-1: First ticket — \`Ada\`
`;
    const rows = parseBoardMarkdown(md);
    assert.equal(rows.length, 1);
    assert.deepEqual(rows[0], {
      group: "My tickets",
      status: "Todo",
      key: "PROJ-1",
      title: "First ticket",
      assignee: "Ada"
    });
  });
});

describe("sortRows", () => {
  it("orders rows by group, status, then key", () => {
    const sorted = sortRows([
      {
        group: "Teammates",
        status: "Todo",
        key: "B-2",
        title: "b",
        assignee: "Bob"
      },
      {
        group: "My tickets",
        status: "Done",
        key: "A-1",
        title: "a",
        assignee: "Ada"
      }
    ]);
    assert.equal(sorted[0]!.group, "My tickets");
    assert.equal(sorted[1]!.group, "Teammates");
  });
});
