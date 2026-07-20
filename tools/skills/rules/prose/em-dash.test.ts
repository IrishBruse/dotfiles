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

  it("fixes em dashes to ASCII hyphens", () => {
    const content = "First idea\u2014second idea.\n";
    assert.equal(fix(content), "First idea-second idea.\n");
  });

  it("preserves em dashes inside inline code", () => {
    const content = "See `range\u20131` and then this\u2014clause.\n";
    assert.equal(fix(content), "See `range\u20131` and then this-clause.\n");
  });
});

