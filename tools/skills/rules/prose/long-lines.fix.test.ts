import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MAX_LINE } from "../core/shared.ts";
import { fix, isSimpleProseLine, wrapProse } from "./long-lines.fix.ts";

describe("isSimpleProseLine", () => {
  it("accepts plain paragraphs and rejects block markdown", () => {
    assert.equal(
      isSimpleProseLine(
        "Mechanics: omit `disable-model-invocation`, and write a model-facing description."
      ),
      true
    );
    assert.equal(isSimpleProseLine("- List item prose."), false);
    assert.equal(isSimpleProseLine("1. Numbered item."), false);
    assert.equal(isSimpleProseLine("## Heading"), false);
    assert.equal(isSimpleProseLine("> Quote"), false);
    assert.equal(isSimpleProseLine("| table | row |"), false);
  });
});

describe("wrapProse", () => {
  it("breaks at the last space before the line limit", () => {
    const line = `${"alpha ".repeat(20).trimEnd()} ${"beta ".repeat(20).trimEnd()}`;
    assert.ok(line.length > MAX_LINE);

    const wrapped = wrapProse(line);
    assert.ok(wrapped.includes("\n"));
    for (const part of wrapped.split("\n")) {
      assert.ok(part.length <= MAX_LINE, `chunk too long (${part.length}): ${part}`);
    }
    assert.equal(wrapped.split("\n").length, 2);
    assert.ok(wrapped.startsWith("alpha "));
    assert.ok(wrapped.includes("\nbeta "));
  });

  it("wraps a long simple paragraph under the limit per line", () => {
    const line = `${"word ".repeat(36).trimEnd()} tail`;
    assert.ok(line.length > MAX_LINE);

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

  it("skips list items and wraps simple continuation paragraphs", () => {
    const longListItem = `- ${"item ".repeat(40).trimEnd()} more`;
    const longParagraph = `${"plain ".repeat(40).trimEnd()} text`;
    assert.ok(longListItem.length > MAX_LINE);
    assert.ok(longParagraph.length > MAX_LINE);

    const content = `${longListItem}\n${longParagraph}\n`;
    const fixed = fix(content);

    assert.equal(fixed.split("\n")[0], longListItem);
    assert.ok(fixed.split("\n").length > 2);
    for (const part of fixed.split("\n").slice(1)) {
      if (part === "") continue;
      assert.ok(part.length <= MAX_LINE, `chunk too long (${part.length}): ${part}`);
    }
  });
});
