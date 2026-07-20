import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { fixSkillContent } from "./fix.ts";
import { lintSkillContent } from "./run.ts";

describe("fixSkillContent", () => {
  it("fixes prose semicolons and non-ascii", () => {
    const content = `---
name: demo
description: One line summary. Use when testing fixes.
---
First idea; second idea. Use an em dash — here.
`;
    const fixed = fixSkillContent(content, "/tmp/demo/SKILL.md");
    assert.match(fixed, /First idea, second idea/);
    assert.doesNotMatch(fixed, /—/);
    assert.deepEqual(
      lintSkillContent(fixed, "/tmp/demo/SKILL.md").filter(
        (diagnostic) => diagnostic.code !== "description-triggers"
      ),
      []
    );
  });

  it("wraps long prose lines at word boundaries", () => {
    const partA = "This is the first sentence.";
    const partB = "This is the second sentence.";
    const filler = "word ".repeat(30).trim();
    const content = `${partA} ${filler} ${partB} ${filler}\n`;
    const fixed = fixSkillContent(content);
    assert.ok(fixed.includes("\n"));
    assert.match(fixed, /This is the first sentence\./);
    assert.match(fixed, /This is the second sentence\./);
  });

  it("fixes frontmatter orphans, nested references, and reference toc", () => {
    const body = Array.from({ length: 100 }, () => "detail").join("\n");
    const content = `---
name: demo-skill
description: First sentence only.
Second sentence with a trigger. Use when testing fixes.
---

# Reference

See [child](child.md) for more.

## Alpha

${body}
`;
    const fixed = fixSkillContent(content, "/tmp/demo/reference.md");
    assert.match(fixed, /description: 'First sentence only\./);
    assert.match(fixed, /`child\.md`/);
    assert.match(fixed, /## Contents/);
    assert.deepEqual(lintSkillContent(fixed, "/tmp/demo/reference.md"), []);
  });

  it("never auto-fixes inside fenced code blocks", () => {
    const long = "word ".repeat(50).trim();
    const body = Array.from({ length: 100 }, () => "detail").join("\n");
    const content = `---
name: demo-skill
description: Test. Use when testing fixes.
---

\`\`\`markdown
## Heading Inside Code
idea; second — ${long}
\`\`\`

## Real Section

${body}
`;
    const fixed = fixSkillContent(content, "/tmp/demo/reference.md");
    const fenced = fixed.match(/```markdown\n([\s\S]*?)\n```/)?.[1] ?? "";
    assert.match(fenced, /idea; second —/);
    assert.doesNotMatch(fenced, /## Contents/);
    assert.doesNotMatch(fenced, /idea, second/);
    assert.match(fixed, /## Contents[\s\S]*Real Section/);
    assert.doesNotMatch(fixed, /Heading Inside Code\]\(#heading-inside-code\)/);
  });
});
