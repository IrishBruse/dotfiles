import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizeRulePaths } from "./config.ts";

describe("normalizeRulePaths", () => {
  it("wraps a single non-empty string", () => {
    assert.deepEqual(normalizeRulePaths("tools/**"), ["tools/**"]);
  });

  it("drops empty strings from arrays", () => {
    assert.deepEqual(normalizeRulePaths(["a", "", "b"]), ["a", "b"]);
    assert.deepEqual(normalizeRulePaths(""), []);
    assert.deepEqual(normalizeRulePaths([]), []);
  });
});
