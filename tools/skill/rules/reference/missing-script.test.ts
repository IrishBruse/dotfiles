import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { LintContext } from "../core/context.ts";
import { lint } from "./missing-script.ts";

function context(relativeFiles: string[]): LintContext {
  return {
    filePath: "/tmp/demo-skill/SKILL.md",
    skillRoot: "/tmp/demo-skill",
    relativeFiles: new Set(relativeFiles),
    markdownContents: new Map(),
  };
}

describe("missing-script lint", () => {
  it("flags missing scripts in prose", () => {
    const content = "Run `scripts/analyze.py` before continuing.\n";
    const diagnostics = lint(content, context(["SKILL.md"]));
    assert.equal(diagnostics[0]?.code, "missing-script");
  });

  it("allows existing scripts", () => {
    const content = "Run `scripts/analyze.py` before continuing.\n";
    assert.deepEqual(
      lint(content, context(["SKILL.md", "scripts/analyze.py"])),
      []
    );
  });

  it("flags scripts in fenced commands", () => {
    const content = "```bash\npython scripts/validate.py output/\n```\n";
    const diagnostics = lint(content, context(["SKILL.md"]));
    assert.equal(diagnostics[0]?.code, "missing-script");
  });
});
