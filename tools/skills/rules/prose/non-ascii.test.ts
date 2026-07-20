import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { lint } from "./non-ascii.ts";

describe("non-ascii lint", () => {
  it("flags emoji in prose", () => {
    const diagnostics = lint("No emojis 😀 allowed.\n");
    assert.equal(diagnostics.length, 1);
    assert.equal(diagnostics[0].code, "non-ascii");
    assert.equal(diagnostics[0].line, 1);
  });

  it("ignores non-ascii inside inline code", () => {
    assert.deepEqual(lint("Use `😀` in a code span.\n"), []);
  });
});
