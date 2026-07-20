import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { lint } from "./generic-advice.ts";

describe("generic-advice lint", () => {
  it("flags generic filler phrases", () => {
    const content = "Handle errors appropriately when the API fails.\n";
    const diagnostics = lint(content);
    assert.equal(diagnostics[0]?.code, "generic-advice");
  });

  it("ignores code blocks", () => {
    const content = "```\nHandle errors appropriately\n```\n";
    assert.deepEqual(lint(content), []);
  });
});
