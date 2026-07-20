import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { lint } from "./nested-references.ts";

describe("nested-references lint", () => {
  it("flags markdown links between reference files", () => {
    const content = "See [details](details.md) for more.\n";
    const diagnostics = lint(content, "/tmp/demo/reference.md");
    assert.equal(diagnostics[0]?.code, "nested-reference");
  });

  it("allows links back to SKILL.md", () => {
    const content = "See [skill](SKILL.md) for the overview.\n";
    assert.deepEqual(lint(content, "/tmp/demo/GLOSSARY.md"), []);
  });

  it("ignores links in SKILL.md", () => {
    const content = "See [details](details.md) for more.\n";
    assert.deepEqual(lint(content, "/tmp/demo/SKILL.md"), []);
  });
});
