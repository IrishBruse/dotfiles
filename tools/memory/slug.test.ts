import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseSlug } from "./slug.ts";

describe("parseSlug", () => {
  it("accepts lowercase kebab-case ids", () => {
    assert.equal(parseSlug("stow-symlink"), "stow-symlink");
    assert.equal(parseSlug("  abc-123  "), "abc-123");
  });

  it("rejects invalid characters", () => {
    assert.throws(() => parseSlug("Bad_Id"), /lowercase letters, digits, and hyphens/);
    assert.throws(() => parseSlug("has spaces"), /lowercase letters, digits, and hyphens/);
  });
});
