import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { FIXABLE_RULE_CODES, isFixableRule } from "./fixable.ts";
import { formatRuleId } from "./format.ts";

describe("fixable rules", () => {
  it("marks registered auto-fix rules", () => {
    assert.equal(isFixableRule("long-line"), true);
    assert.equal(isFixableRule("prose-semicolon"), true);
    assert.equal(isFixableRule("description-triggers"), false);
    assert.equal(isFixableRule("skill-length"), false);
  });

  it("includes every fixable code in the registry", () => {
    assert.ok(FIXABLE_RULE_CODES.has("frontmatter-description"));
    assert.ok(FIXABLE_RULE_CODES.has("reference-toc"));
    assert.equal(FIXABLE_RULE_CODES.size, 9);
  });
});

describe("formatRuleId", () => {
  it("appends (fixable) for auto-fix rules", () => {
    assert.equal(formatRuleId("long-line"), "@skills/long-line(fixable)");
    assert.equal(formatRuleId("description-triggers"), "@skills/description-triggers");
  });
});
