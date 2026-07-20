import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";

import { buildLintContexts, resolveRelativeLink, resolveSkillRelativePath } from "./context.ts";

describe("lint context helpers", () => {
  let tempDir = "";

  before(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "skills-context-"));
    const skillDir = path.join(tempDir, "demo-skill");
    await mkdir(path.join(skillDir, "references"), { recursive: true });
    await writeFile(
      path.join(skillDir, "SKILL.md"),
      `---
name: demo-skill
description: Use when testing context helpers.
---

See [guide](references/guide.md).
`
    );
    await writeFile(path.join(skillDir, "references", "guide.md"), "# Guide\n");
    await writeFile(path.join(skillDir, "references", "orphan.md"), "# Orphan\n");
  });

  after(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("builds lint contexts for skill files", async () => {
    const skillMd = path.join(tempDir, "demo-skill", "SKILL.md");
    const guide = path.join(tempDir, "demo-skill", "references", "guide.md");
    const contexts = await buildLintContexts([skillMd, guide]);

    const skillContext = contexts.get(skillMd);
    assert.ok(skillContext);
    assert.equal(skillContext.skillRoot, path.join(tempDir, "demo-skill"));
    assert.ok(skillContext.relativeFiles.has("references/guide.md"));
    assert.ok(skillContext.markdownContents.has("SKILL.md"));
    assert.ok(skillContext.skillMdContent?.includes("demo-skill"));
  });

  it("resolves relative markdown links", () => {
    const from = path.join(tempDir, "demo-skill", "SKILL.md");
    assert.equal(
      resolveRelativeLink(from, "references/guide.md"),
      "references/guide.md"
    );
  });

  it("resolves sibling template paths", () => {
    assert.equal(
      resolveSkillRelativePath(
        "references/breakdown/breakdown.md",
        "template.md"
      ),
      "references/breakdown/template.md"
    );
  });
});
