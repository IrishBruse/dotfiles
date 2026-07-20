import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { fix } from "./em-dash.fix.ts";
import { lint } from "./em-dash.ts";

describe("em-dash lint", () => {
  it("flags em and en dashes in prose", () => {
    const content = "First idea\u2014second idea.\n";
    const diagnostics = lint(content);
    assert.equal(diagnostics[0]?.code, "em-dash");
  });

  it("fixes em dashes to commas", () => {
    const content = "First idea\u2014second idea.\n";
    assert.equal(fix(content), "First idea, second idea.\n");
  });
});
