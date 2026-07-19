import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { fix } from "./home-repo-paths.fix.ts";

describe("home-repo-paths fix", () => {
  it("rewrites home/.agents paths to ~/.agents", () => {
    const fixed = fix("Store skills under home/.agents/skills/.\n");
    assert.equal(fixed, "Store skills under ~/.agents/skills/.\n");
  });

  it("leaves repo paths inside code fences unchanged", () => {
    const content = "```\nhome/.cursor/skills/foo\n```\n";
    assert.equal(fix(content), content);
  });
});
