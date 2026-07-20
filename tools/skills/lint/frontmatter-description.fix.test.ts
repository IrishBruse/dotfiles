import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { fix } from "./frontmatter-description.fix.ts";
import { lint } from "./frontmatter-fields.ts";

const SKILL_PATH = "/tmp/demo/SKILL.md";

describe("frontmatter-description fix", () => {
  it("merges orphan lines into a quoted description", () => {
    const content = `---
name: demo-skill
description: First sentence only.
Use when the user needs the second sentence in the description string.
---

# Demo
`;
    const fixed = fix(content);
    assert.match(
      fixed,
      /description: 'First sentence only\. Use when the user needs the second sentence in the description string\.'/
    );
    assert.deepEqual(lint(fixed, SKILL_PATH), []);
  });

  it("merges indented continuation lines into a quoted description", () => {
    const content = `---
name: demo-skill
description:
  Produces a structured breakdown.
  Use when asked for an interface breakdown.
disable-model-invocation: true
---

# Demo
`;
    const fixed = fix(content);
    assert.match(
      fixed,
      /description: 'Produces a structured breakdown\. Use when asked for an interface breakdown\.'/
    );
    assert.deepEqual(lint(fixed, SKILL_PATH), []);
  });

  it("wraps long descriptions across physical lines", () => {
    const content = `---
name: demo-skill
description: ${"word ".repeat(40).trim()} Use when the user mentions demos.
---

# Demo
`;
    const fixed = fix(content);
    assert.match(fixed, /description: 'word/);
    assert.ok(fixed.includes("\n  "));
    for (const line of fixed.split("\n")) {
      if (line.startsWith("description:") || line.startsWith("  ")) {
        assert.ok(line.length <= 160, `line too long: ${line.length}`);
      }
    }
  });

  it("leaves valid short descriptions unchanged", () => {
    const content = `---
name: demo-skill
description: Use when testing short descriptions.
---

# Demo
`;
    assert.equal(fix(content), content);
  });
});
