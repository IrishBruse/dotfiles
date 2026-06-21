import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { StaticCommitAnalysis } from "../types.ts";
import { isConfidentEnough } from "./analyze.ts";

function analysis(
  overrides: Partial<StaticCommitAnalysis>
): StaticCommitAnalysis {
  return {
    confidence: 0.8,
    type: "feature",
    scope: "memory",
    summary: "add slug validation",
    ...overrides
  };
}

describe("isConfidentEnough", () => {
  it("rejects empty or generic summaries", () => {
    assert.equal(isConfidentEnough(analysis({ summary: "" })), false);
    assert.equal(
      isConfidentEnough(analysis({ summary: "update memory" })),
      false
    );
    assert.equal(
      isConfidentEnough(analysis({ summary: "memory", confidence: 0.95 })),
      false
    );
  });

  it("requires confidence at or above the threshold", () => {
    assert.equal(
      isConfidentEnough(analysis({ confidence: 0.6, summary: "add slug validation" })),
      false
    );
    assert.equal(
      isConfidentEnough(analysis({ confidence: 0.7, summary: "add slug validation" })),
      true
    );
  });
});
