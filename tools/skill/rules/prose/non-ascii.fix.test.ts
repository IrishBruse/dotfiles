import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { fix } from "./non-ascii.fix.ts";

describe("non-ascii fix", () => {
  it("replaces curly single and double quotes with ASCII quotes", () => {
    const fixed = fix("Don\u2019t edit the \u201clegacy\u201d path\u2026\n");
    assert.equal(fixed, "Don't edit the \"legacy\" path...\n");
  });

  it("ignores curly quotes inside inline code", () => {
    const content = "Use `\u201cquoted\u201d` in a code span.\n";
    assert.equal(fix(content), content);
  });

  it("ignores curly quotes inside fenced code blocks", () => {
    const content = "```\nDon\u2019t edit the \u201clegacy\u201d path\n```\n";
    assert.equal(fix(content), content);
  });
});
