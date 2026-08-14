import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { lint, MAX_SKILL_TOKENS } from "./skill-token-budget.ts";

const SKILL_PATH = "/tmp/demo-skill/SKILL.md";

describe("skill-token-budget lint", () => {
  it("flags SKILL.md bodies over the token budget", () => {
    const body = "x".repeat(MAX_SKILL_TOKENS * 4 + 1);
    const content = `---
name: demo-skill
description: Use when testing token budgets.
---

${body}
`;
    const diagnostics = lint(content, SKILL_PATH);
    assert.equal(diagnostics[0]?.code, "skill-token-budget");
  });

  it("ignores other markdown files", () => {
    const body = "x".repeat(MAX_SKILL_TOKENS * 4 + 1);
    assert.deepEqual(lint(body, "/tmp/demo-skill/reference.md"), []);
  });
});
