import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { lint } from "./broken-link.ts";
import type { LintContext } from "../core/context.ts";

function context(
  filePath: string,
  relativeFiles: string[]
): LintContext {
  return {
    filePath,
    skillRoot: "/tmp/demo-skill",
    relativeFiles: new Set(relativeFiles),
    markdownContents: new Map(),
  };
}

describe("broken-link lint", () => {
  it("flags missing markdown targets", () => {
    const content = "See [guide](references/missing.md) for details.\n";
    const diagnostics = lint(
      content,
      context("/tmp/demo-skill/SKILL.md", ["SKILL.md"])
    );
    assert.equal(diagnostics[0]?.code, "broken-link");
    assert.equal(diagnostics[0]?.severity, "error");
  });

  it("allows existing relative links", () => {
    const content = "See [guide](references/guide.md) for details.\n";
    assert.deepEqual(
      lint(
        content,
        context("/tmp/demo-skill/SKILL.md", [
          "SKILL.md",
          "references/guide.md",
        ])
      ),
      []
    );
  });

  it("skips http links", () => {
    const content = "See [site](https://example.com/doc.md) for details.\n";
    assert.deepEqual(
      lint(content, context("/tmp/demo-skill/SKILL.md", ["SKILL.md"])),
      []
    );
  });

  it("allows links back to SKILL.md from reference files", () => {
    const content = "See [skill](../SKILL.md) for the overview.\n";
    assert.deepEqual(
      lint(
        content,
        context("/tmp/demo-skill/references/guide.md", [
          "SKILL.md",
          "references/guide.md",
        ])
      ),
      []
    );
  });

  it("requires lint context", () => {
    const content = "See [guide](references/missing.md) for details.\n";
    assert.deepEqual(lint(content, "/tmp/demo-skill/SKILL.md"), []);
  });
});
