import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MAX_LINE } from "./shared.ts";
import { lint } from "./long-lines.ts";

describe("long-lines lint", () => {
  it("flags lines over the max length", () => {
    const content = `${"a".repeat(MAX_LINE + 1)}\n`;
    const diagnostics = lint(content);
    assert.equal(diagnostics.length, 1);
    assert.equal(diagnostics[0].code, "long-line");
    assert.equal(diagnostics[0].line, 1);
  });

  it("ignores long URLs", () => {
    const content = `See https://${"a".repeat(MAX_LINE)}.example\n`;
    assert.deepEqual(lint(content), []);
  });
});
