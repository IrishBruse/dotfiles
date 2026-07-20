import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { LintContext } from "../core/context.ts";
import { lint } from "./orphan-reference.ts";

const SKILL_PATH = "/tmp/demo-skill/SKILL.md";

function context(
  relativeFiles: string[],
  skillMdContent: string,
  markdownContents?: Map<string, string>
): LintContext {
  const contents =
    markdownContents ??
    new Map<string, string>([["SKILL.md", skillMdContent]]);
  return {
    filePath: SKILL_PATH,
    skillRoot: "/tmp/demo-skill",
    relativeFiles: new Set(relativeFiles),
    skillMdContent,
    markdownContents: contents,
  };
}

describe("orphan-reference lint", () => {
  it("flags reference files not linked from SKILL.md", () => {
    const skillMd = `---
name: demo-skill
description: Use when testing orphan references.
---

See [guide](references/guide.md).
`;
    const diagnostics = lint(
      skillMd,
      context(
        ["SKILL.md", "references/guide.md", "references/unlinked.md"],
        skillMd
      )
    );
    assert.equal(diagnostics[0]?.code, "orphan-reference");
    assert.match(diagnostics[0]?.message ?? "", /unlinked\.md/);
  });

  it("passes when all reference files are linked", () => {
    const skillMd = `---
name: demo-skill
description: Use when testing orphan references.
---

See [guide](references/guide.md).
`;
    assert.deepEqual(
      lint(
        skillMd,
        context(["SKILL.md", "references/guide.md"], skillMd)
      ),
      []
    );
  });

  it("counts backtick markdown references", () => {
    const skillMd = `---
name: demo-skill
description: Use when testing orphan references.
---

See \`references/guide.md\` when needed.
`;
    assert.deepEqual(
      lint(
        skillMd,
        context(["SKILL.md", "references/guide.md"], skillMd)
      ),
      []
    );
  });

  it("counts relative backtick references from route files", () => {
    const skillMd = `---
name: demo-skill
description: Use when testing orphan references.
---

See \`references/breakdown/breakdown.md\` for the breakdown route.
`;
    const breakdown = "Use `template.md` for the output format.\n";
    const contents = new Map<string, string>([
      ["SKILL.md", skillMd],
      ["references/breakdown/breakdown.md", breakdown],
    ]);
    assert.deepEqual(
      lint(
        skillMd,
        context(
          [
            "SKILL.md",
            "references/breakdown/breakdown.md",
            "references/breakdown/template.md",
          ],
          skillMd,
          contents
        )
      ),
      []
    );
  });
});
