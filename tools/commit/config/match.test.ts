import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  expandMessage,
  formatCommitMessage,
  pathMatchesGlob,
  resolveSliceGroup
} from "./match.ts";
import type { CommitConfig } from "./config.ts";

const toolsConfig: CommitConfig = {
  rules: [
    {
      paths: "tools/:scope/**",
      prefix: "tools",
      when: "any"
    }
  ]
};

describe("pathMatchesGlob", () => {
  it("matches literal segments and single-star globs", () => {
    assert.equal(pathMatchesGlob("tools/commit/main.ts", "tools/:scope/**"), true);
    assert.equal(pathMatchesGlob("src/app.ts", "tools/:scope/**"), false);
  });

  it("captures scope from :scope placeholder", () => {
    assert.equal(pathMatchesGlob("tools/memory/slug.ts", "tools/:scope/**"), true);
  });
});

describe("formatCommitMessage", () => {
  it("uses scope from rule when set", () => {
    const msg = formatCommitMessage(
      { paths: "x", prefix: "feat", scope: "api" },
      undefined,
      "add endpoint"
    );
    assert.equal(msg, "feat(api): add endpoint");
  });

  it("uses captured scope when rule scope is unset", () => {
    const msg = formatCommitMessage(
      { paths: "tools/:scope/**", prefix: "tools" },
      "commit",
      "add tests"
    );
    assert.equal(msg, "tools(commit): add tests");
  });

  it("expands custom message template", () => {
    const msg = formatCommitMessage(
      { paths: "x", prefix: "feat", message: "{{scope}}: {{summary}}" },
      "api",
      "ship it"
    );
    assert.equal(msg, "api: ship it");
  });
});

describe("expandMessage", () => {
  it("substitutes scope, type, and summary placeholders", () => {
    const out = expandMessage("{{type}}({{scope}}): {{summary}}", {
      type: "fix",
      scope: "md",
      summary: "render links"
    });
    assert.equal(out, "fix(md): render links");
  });
});

describe("resolveSliceGroup", () => {
  it("groups tools paths by captured scope", () => {
    const group = resolveSliceGroup("tools/commit/foo.ts", toolsConfig);
    assert.equal(group, "tools/:scope/**\0commit");
  });

  it("falls back to top-level directory for unmatched paths", () => {
    const group = resolveSliceGroup("docs/readme.md", toolsConfig);
    assert.equal(group, "docs");
  });
});
