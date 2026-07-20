import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { lint } from "./description-block.ts";

describe("description-block lint", () => {
  it("flags block scalar description", () => {
    const content = `---
name: test
description: >
  Multi-line block
---
# Test
`;
    const diagnostics = lint(content);
    assert.equal(diagnostics.length, 1);
    assert.equal(diagnostics[0].code, "description-block");
    assert.equal(diagnostics[0].line, 3);
  });

  it("allows plain string description", () => {
    const content = `---
name: test
description: One line summary
---
# Test
`;
    assert.deepEqual(lint(content), []);
  });
});
