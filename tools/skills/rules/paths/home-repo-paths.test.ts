import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { lint } from "./home-repo-paths.ts";

describe("home-repo-paths lint", () => {
  it("flags home/.agents paths in prose", () => {
    const diagnostics = lint("Store skills under home/.agents/skills/.\n");
    assert.equal(diagnostics.length, 1);
    assert.equal(diagnostics[0].code, "home-repo-path");
    assert.equal(diagnostics[0].line, 1);
  });

  it("ignores repo paths inside code fences", () => {
    assert.deepEqual(
      lint("```\nhome/.cursor/skills/foo\n```\n"),
      []
    );
  });
});
