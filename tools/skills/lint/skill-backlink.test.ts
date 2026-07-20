import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { lint } from "./skill-backlink.ts";

describe("skill-backlink lint", () => {
  it("flags markdown links to SKILL.md from reference files", () => {
    const content =
      "**Related**: `session-management.md` for details, [SKILL.md](../SKILL.md) for quick start.\n";
    const diagnostics = lint(content, "/tmp/browser/references/authentication.md");
    assert.equal(diagnostics[0]?.code, "skill-backlink");
  });

  it("flags backtick SKILL.md references", () => {
    const content =
      "Run the **Jira Write Approval Gate** in `SKILL.md`.\n";
    const diagnostics = lint(content, "/tmp/jira/references/task/task.md");
    assert.equal(diagnostics[0]?.code, "skill-backlink");
  });

  it("flags plain see SKILL.md prose", () => {
    const content =
      "For quick start and common patterns, see SKILL.md.\n";
    const diagnostics = lint(content, "/tmp/browser/references/commands.md");
    assert.equal(diagnostics[0]?.code, "skill-backlink");
  });

  it("ignores SKILL.md itself", () => {
    const content = "See `references/guide.md` when needed.\n";
    assert.deepEqual(lint(content, "/tmp/browser/SKILL.md"), []);
  });
});
