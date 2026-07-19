import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { lint } from "./prose-semicolons.ts";

describe("prose-semicolons lint", () => {
  it("flags prose semicolons", () => {
    const diagnostics = lint("First idea; second idea.\n");
    assert.equal(diagnostics.length, 1);
    assert.equal(diagnostics[0].code, "prose-semicolon");
    assert.equal(diagnostics[0].line, 1);
    assert.equal(diagnostics[0].column, 7);
  });

  it("ignores semicolons in code blocks", () => {
    assert.deepEqual(lint("```js\nfoo(); bar\n```\n"), []);
  });

  it("ignores import lines", () => {
    assert.deepEqual(lint("import foo; bar from 'x'\n"), []);
  });
});
