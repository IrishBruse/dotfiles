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

  it("keeps long descriptions on one line", () => {
    const longDescription = `${"word ".repeat(40).trim()} Use when the user mentions demos.`;
    const content = `---
name: demo-skill
description: ${longDescription}
---

# Demo
`;
    const fixed = fix(content);
    assert.equal(fixed, content);
    assert.match(fixed, new RegExp(`description: ${longDescription}`));
    assert.doesNotMatch(fixed, /\n  /);
  });

  it("merges long orphan lines onto one description line", () => {
    const longDescription = `${"word ".repeat(40).trim()} Use when the user mentions demos.`;
    const content = `---
name: demo-skill
description: ${longDescription.split(" ").slice(0, 20).join(" ")}
${longDescription.split(" ").slice(20).join(" ")}
---

# Demo
`;
    const fixed = fix(content);
    assert.match(fixed, new RegExp(`description: '${longDescription.replace(/'/g, "''")}'`));
    assert.doesNotMatch(fixed, /\n  /);
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
