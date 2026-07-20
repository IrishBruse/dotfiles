import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getCodeBlockLineRanges,
  isCodeFenceLine,
  isLineInCodeBlock,
  mapDocumentLines,
} from "./fix-shared.ts";

describe("code block helpers", () => {
  it("detects fenced code block line ranges", () => {
    const content = [
      "before",
      "```bash",
      "inside; unchanged —",
      "```",
      "after",
    ].join("\n");
    const ranges = getCodeBlockLineRanges(content);
    assert.deepEqual(ranges, [{ start: 1, end: 3 }]);
    assert.equal(isLineInCodeBlock(0, ranges), false);
    assert.equal(isLineInCodeBlock(2, ranges), true);
    assert.equal(isLineInCodeBlock(4, ranges), false);
  });

  it("never mutates lines inside fenced code blocks", () => {
    const content = [
      "idea; outside",
      "```bash",
      "idea; inside —",
      "```",
    ].join("\n");

    const fixed = mapDocumentLines(content, (rawLine, _lineNumber, inCodeBlock) => {
      if (inCodeBlock) return rawLine;
      return rawLine.replace(";", ",");
    });

    assert.match(fixed, /idea, outside/);
    assert.match(fixed, /idea; inside —/);
    assert.equal(isCodeFenceLine("```ts"), true);
    assert.equal(isCodeFenceLine("  ```"), true);
    assert.equal(isCodeFenceLine("not code"), false);
  });
});
