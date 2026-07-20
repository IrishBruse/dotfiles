import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { lint } from "./negation-steering.ts";

describe("negation-steering lint", () => {
  it("flags negation-only lines", () => {
    const content = "Do not commit state files.\n";
    const diagnostics = lint(content, "/tmp/demo-skill/SKILL.md");
    assert.equal(diagnostics[0]?.code, "negation-steering");
  });

  it("allows paired positive steering", () => {
    const content = "Do not commit state files. Use .gitignore instead.\n";
    assert.deepEqual(lint(content, "/tmp/demo-skill/SKILL.md"), []);
  });

  it("ignores reference files", () => {
    const content = "Do not commit state files.\n";
    assert.deepEqual(lint(content, "/tmp/demo-skill/references/guide.md"), []);
  });
});
