import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { locationAt } from "./location.ts";

describe("locationAt", () => {
  it("returns 1-based line and column for the first line", () => {
    assert.deepEqual(locationAt("abc{{x}}", 4), { line: 1, column: 5 });
  });

  it("counts columns after newlines", () => {
    const text = "line one\nline two\n{{here}}";
    const index = text.indexOf("{{");
    assert.deepEqual(locationAt(text, index), { line: 3, column: 1 });
  });
});
