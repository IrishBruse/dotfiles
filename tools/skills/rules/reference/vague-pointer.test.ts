import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { lint } from "./vague-pointer.ts";

const SKILL_PATH = "/tmp/demo-skill/SKILL.md";

describe("vague-pointer lint", () => {
  it("flags see references without a specific file", () => {
    const content = "See references/ for more details.\n";
    const diagnostics = lint(content, SKILL_PATH);
    assert.equal(diagnostics[0]?.code, "vague-pointer");
  });

  it("allows conditional pointers to specific files", () => {
    const content =
      "If the API returns non-200, read [errors](references/api-errors.md).\n";
    assert.deepEqual(lint(content, SKILL_PATH), []);
  });

  it("ignores non-SKILL files", () => {
    const content = "See references/ for more details.\n";
    assert.deepEqual(lint(content, "/tmp/demo-skill/reference.md"), []);
  });
});
