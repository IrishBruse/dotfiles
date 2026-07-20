import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MAX_SKILL_LINES, lint } from "./skill-length.ts";

describe("skill-length lint", () => {
  it("flags SKILL.md files over the max line count as errors", () => {
    const content = Array.from({ length: MAX_SKILL_LINES + 1 }, () => "line").join(
      "\n"
    );
    const diagnostics = lint(content, "/tmp/demo/SKILL.md");
    assert.equal(diagnostics.length, 1);
    assert.equal(diagnostics[0]?.severity, "error");
    assert.equal(diagnostics[0]?.code, "skill-length");
  });

  it("ignores other markdown files in the skill folder", () => {
    const content = Array.from({ length: MAX_SKILL_LINES + 1 }, () => "line").join(
      "\n"
    );
    assert.deepEqual(lint(content, "/tmp/demo/references/guide.md"), []);
  });

  it("allows SKILL.md at the line limit", () => {
    const content = Array.from({ length: MAX_SKILL_LINES }, () => "line").join("\n");
    assert.deepEqual(lint(content, "/tmp/demo/SKILL.md"), []);
  });
});
