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
      showFixable: false,
      cursorBuiltin: true,
      positional: ["foo.md"],
    });
  });

  it("parses --show-fixable", () => {
    assert.deepEqual(parseLintArgs(["--show-fixable", "foo.md"]), {
      fix: false,
      showFixable: true,
      cursorBuiltin: false,
      positional: ["foo.md"],
    });
  });
});
