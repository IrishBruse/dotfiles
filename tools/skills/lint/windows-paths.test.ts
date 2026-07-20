import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { lint } from "./windows-paths.ts";

describe("windows-paths lint", () => {
  it("flags backslash file paths in prose", () => {
    const diagnostics = lint("Run scripts\\helper.py from the skill folder.\n");
    assert.equal(diagnostics[0]?.code, "windows-path");
    assert.match(diagnostics[0]?.message ?? "", /forward slashes/);
  });

  it("ignores backslashes inside code fences", () => {
    assert.deepEqual(
      lint("```\nscripts\\helper.py\n```\n"),
      []
    );
  });
});
