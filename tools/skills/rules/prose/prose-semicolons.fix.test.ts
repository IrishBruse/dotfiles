import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { fix } from "./prose-semicolons.fix.ts";

describe("prose-semicolons fix", () => {
  it("replaces prose semicolons with commas", () => {
    const fixed = fix("First idea; second idea.\n");
    assert.equal(fixed, "First idea, second idea.\n");
  });

  it("ignores semicolons in code blocks", () => {
    const content = "```js\nfoo(); bar\n```\n";
    assert.equal(fix(content), content);
  });
});
