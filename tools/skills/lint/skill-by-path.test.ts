import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { lint } from "./skill-by-path.ts";

describe("skill-by-path lint", () => {
  it("flags skill references by path", () => {
    const content =
      "Follow ~/.agents/skills/writing-great-skills/SKILL.md for style.\n";
    const diagnostics = lint(content);
    assert.equal(diagnostics[0]?.code, "skill-by-path");
  });

  it("allows skill names in backticks", () => {
    const content = "Follow `writing-great-skills` for style.\n";
    assert.deepEqual(lint(content), []);
  });
});
