import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { fix } from "./nested-references.fix.ts";
import { lint } from "./nested-references.ts";

describe("nested-references fix", () => {
  it("replaces nested markdown links with backtick paths", () => {
    const content =
      "See [`breakdown.md`](breakdown.md) and [SKILL.md](../SKILL.md).\n";
    const fixed = fix(content, "/tmp/demo/reference.md");
    assert.match(fixed, /`breakdown\.md`/);
    assert.match(fixed, /\[SKILL\.md\]\(\.\.\/SKILL\.md\)/);
    assert.deepEqual(lint(fixed, "/tmp/demo/reference.md"), []);
  });

  it("ignores SKILL.md", () => {
    const content = "See [details](details.md) for more.\n";
    assert.equal(fix(content, "/tmp/demo/SKILL.md"), content);
  });
});
