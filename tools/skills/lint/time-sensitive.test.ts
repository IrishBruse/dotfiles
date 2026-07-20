import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { lint } from "./time-sensitive.ts";

describe("time-sensitive lint", () => {
  it("flags dated guidance", () => {
    const content =
      "If you are doing this before August 2025, use the old API.\n";
    const diagnostics = lint(content);
    assert.equal(diagnostics[0]?.code, "time-sensitive");
  });

  it("ignores undated prose", () => {
    const content = "Use the v2 API endpoint.\n";
    assert.deepEqual(lint(content), []);
  });
});
