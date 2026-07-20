import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { fix } from "./reference-toc.fix.ts";
import { MIN_REFERENCE_LINES, lint } from "./reference-toc.ts";

describe("reference-toc fix", () => {
  it("inserts a contents section before the first heading", () => {
    const body = Array.from({ length: MIN_REFERENCE_LINES }, () => "detail").join(
      "\n"
    );
    const content = `# Reference

Intro paragraph.

## Alpha

${body}
`;
    const fixed = fix(content, "/tmp/demo/reference.md");
    assert.match(fixed, /## Contents\n\n- \[Alpha\]\(#alpha\)\n\n## Alpha/);
    assert.deepEqual(lint(fixed, "/tmp/demo/reference.md"), []);
  });

  it("ignores files that already have a contents heading", () => {
    const body = Array.from({ length: MIN_REFERENCE_LINES }, () => "detail").join(
      "\n"
    );
    const content = `# Reference

## Contents

- [Alpha](#alpha)

## Alpha

${body}
`;
    assert.equal(fix(content, "/tmp/demo/reference.md"), content);
  });
});
