import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { fixSkillContent } from "./fix.ts";
import { lintSkillContent } from "./run.ts";

describe("fixSkillContent", () => {
  it("fixes prose semicolons, repo paths, and non-ascii", () => {
    const content = `---
name: test
description: One line summary
---
Store skills under home/.agents/skills/. First idea; second idea. Use an em dash — here.
`;
    const fixed = fixSkillContent(content);
    assert.match(fixed, /~\/.agents\/skills\//);
    assert.match(fixed, /First idea, second idea/);
    assert.doesNotMatch(fixed, /—/);
    assert.deepEqual(lintSkillContent(fixed), []);
  });

  it("wraps long prose lines after sentence boundaries", () => {
    const partA = "This is the first sentence.";
    const partB = "This is the second sentence.";
    const filler = "word ".repeat(30).trim();
    const content = `${partA} ${filler} ${partB} ${filler}\n`;
    const fixed = fixSkillContent(content);
    assert.ok(fixed.includes("\n"));
    assert.match(fixed, /This is the first sentence\.\n/);
  });
});
