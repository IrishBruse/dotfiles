import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MAX_LINE } from "../core/shared.ts";
import { lint } from "./long-lines.ts";

describe("long-lines lint", () => {
  it("flags lines over the max length", () => {
    const content = `${"a".repeat(MAX_LINE + 1)}\n`;
    const diagnostics = lint(content);
    assert.equal(diagnostics.length, 1);
    assert.equal(diagnostics[0].code, "long-line");
    assert.equal(diagnostics[0].line, 1);
    assert.match(
      diagnostics[0].message,
      /Wrap or split into shorter lines/
    );
  });

  it("ignores long URLs", () => {
    const content = `See https://${"a".repeat(MAX_LINE)}.example\n`;
    assert.deepEqual(lint(content), []);
  });

  it("marks only auto-wrappable lines as fixable", () => {
    const wrappable = `${"word ".repeat(70).trim()}\n`;
    const heading = `## ${"heading ".repeat(40)}\n`;
    const diagnostics = lint(`${wrappable}${heading}`);
    assert.equal(diagnostics.length, 2);
    assert.equal(diagnostics[0]?.fixable, true);
    assert.equal(diagnostics[1]?.fixable, false);
  });
});
