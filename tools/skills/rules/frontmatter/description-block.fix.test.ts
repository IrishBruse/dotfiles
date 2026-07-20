import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { fix } from "./description-block.fix.ts";

describe("description-block fix", () => {
  it("converts folded block description to a plain string", () => {
    const content = `---
name: test
description: >-
  Keep a PR merge-ready by triaging comments, resolving clear conflicts, and
  fixing CI in a loop.
---
# Test
`;
    const fixed = fix(content);
    assert.match(
      fixed,
      /description: "Keep a PR merge-ready by triaging comments, resolving clear conflicts, and fixing CI in a loop\."/
    );
  });
});
