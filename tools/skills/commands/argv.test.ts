import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseLintArgs, parseSkillsArgs } from "./argv.ts";

describe("parseSkillsArgs", () => {
  it("parses --cursor-builtin", () => {
    assert.deepEqual(parseSkillsArgs(["--cursor-builtin"]), {
      cursorBuiltin: true,
      positional: [],
    });
  });

  it("rejects unknown flags", () => {
    assert.equal(parseSkillsArgs(["--fix"]), "error");
  });
});

describe("parseLintArgs", () => {
  it("parses --fix and --cursor-builtin together", () => {
    assert.deepEqual(parseLintArgs(["--fix", "--cursor-builtin", "foo.md"]), {
      fix: true,
      cursorBuiltin: true,
      positional: ["foo.md"],
    });
  });
});
