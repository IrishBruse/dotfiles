import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MAX_LINE } from "./shared.ts";
import { fix, wrapProse } from "./long-lines.fix.ts";

describe("wrapProse", () => {
  it("breaks at sentence boundaries", () => {
    const partA = "First sentence.";
    const partB = "Second sentence.";
    const filler = "word ".repeat(30).trim();
    const line = `${partA} ${filler} ${partB}`;
    const wrapped = wrapProse(line);
    assert.ok(wrapped.includes("\n"));
    assert.match(wrapped, /First sentence\.\n/);
  });

  it("breaks at commas when there is no sentence boundary", () => {
    const line = `${"alpha, ".repeat(40)}beta`;
    const wrapped = wrapProse(line);
    assert.ok(wrapped.includes("\n"));
    for (const part of wrapped.split("\n")) {
      assert.ok(part.length <= MAX_LINE, `chunk too long (${part.length}): ${part}`);
    }
  });

  it("breaks at word boundaries when there is no punctuation", () => {
    const line = "word ".repeat(50).trim();
    const wrapped = wrapProse(line);
    assert.ok(wrapped.includes("\n"));
    for (const part of wrapped.split("\n")) {
      assert.ok(part.length <= MAX_LINE, `chunk too long (${part.length}): ${part}`);
    }
  });

  it("leaves a single long token unchanged", () => {
    const line = "x".repeat(MAX_LINE + 20);
    assert.equal(wrapProse(line), line);
  });
});

describe("long-lines fix", () => {
  it("wraps prose outside inline code", () => {
    const prose = "word ".repeat(50).trim();
    const content = `Before \`${"c".repeat(20)}\` ${prose}\n`;
    const fixed = fix(content);
    assert.ok(fixed.includes("\n"));
    assert.match(fixed, /`c{20}`/);
  });

  it("skips code blocks", () => {
    const long = "x".repeat(MAX_LINE + 20);
    const content = `\`\`\`\n${long}\n\`\`\`\n`;
    assert.equal(fix(content), content);
  });
});
