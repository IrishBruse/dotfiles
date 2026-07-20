import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { lint } from "./name-folder-mismatch.ts";

const SKILL_PATH = "/tmp/demo-skill/SKILL.md";

describe("name-folder-mismatch lint", () => {
  it("flags when name does not match folder", () => {
    const content = `---
name: wrong-name
description: Use when testing folder names.
---

# Demo
`;
    const diagnostics = lint(content, SKILL_PATH);
    assert.equal(diagnostics[0]?.code, "name-folder-mismatch");
    assert.equal(diagnostics[0]?.severity, "error");
  });

  it("passes when name matches folder", () => {
    const content = `---
name: demo-skill
description: Use when testing folder names.
---

# Demo
`;
    assert.deepEqual(lint(content, SKILL_PATH), []);
  });

  it("ignores non-SKILL files", () => {
    const content = `---
name: wrong
description: Use when testing.
---
`;
    assert.deepEqual(lint(content, "/tmp/demo-skill/reference.md"), []);
  });
});
