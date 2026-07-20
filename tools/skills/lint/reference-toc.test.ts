import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MIN_REFERENCE_LINES, lint } from "./reference-toc.ts";

describe("reference-toc lint", () => {
  it("flags long reference files without a contents heading", () => {
    const content = `${Array.from({ length: MIN_REFERENCE_LINES + 1 }, () => "line").join("\n")}\n`;
    const diagnostics = lint(content, "/tmp/demo/reference.md");
    assert.equal(diagnostics[0]?.code, "reference-toc");
  });

  it("allows long reference files with a contents heading", () => {
    const body = Array.from({ length: MIN_REFERENCE_LINES }, () => "line").join(
      "\n"
    );
    const content = `# Reference\n\n## Contents\n- One\n\n${body}\n`;
    assert.deepEqual(lint(content, "/tmp/demo/reference.md"), []);
  });

  it("ignores SKILL.md", () => {
    const content = `${Array.from({ length: MIN_REFERENCE_LINES + 1 }, () => "line").join("\n")}\n`;
    assert.deepEqual(lint(content, "/tmp/demo/SKILL.md"), []);
  });
});
