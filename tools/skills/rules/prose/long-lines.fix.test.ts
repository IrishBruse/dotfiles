import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { MAX_LINE } from "../core/shared.ts";
import { fixSkillContent } from "../engine/fix.ts";
import { lintSkillContent } from "../engine/run.ts";
import {
  canAutoFixLongLine,
  fix,
  isSimpleProseLine,
  isWrappableLine,
  wrapLinePreservingInlineCode,
  wrapProse,
} from "./long-lines.fix.ts";

describe("isWrappableLine", () => {
  it("accepts plain prose and list items", () => {
    assert.equal(
      isWrappableLine(
        "Mechanics: omit `disable-model-invocation`, and write a model-facing description."
      ),
      true
    );
    assert.equal(isWrappableLine("- List item prose."), true);
    assert.equal(isWrappableLine("1. Numbered item."), true);
    assert.equal(isWrappableLine("## Heading"), false);
    assert.equal(isWrappableLine("> Quote"), false);
    assert.equal(isWrappableLine("| table | row |"), false);
  });
});

describe("isSimpleProseLine", () => {
  it("excludes list markers", () => {
    assert.equal(isSimpleProseLine("- List item prose."), false);
    assert.equal(isSimpleProseLine("1. Numbered item."), false);
  });
});

describe("wrapLinePreservingInlineCode", () => {
  it("breaks at the last space before the line limit", () => {
    const line = `${"alpha ".repeat(20).trimEnd()} ${"beta ".repeat(20).trimEnd()}`;
    assert.ok(line.length > MAX_LINE);

    const wrapped = wrapLinePreservingInlineCode(line);
    assert.ok(wrapped.includes("\n"));
    for (const part of wrapped.split("\n")) {
      assert.ok(part.length <= MAX_LINE, `chunk too long (${part.length}): ${part}`);
    }
  });

  it("wraps across inline code spans on one line", () => {
    const line =
      `It contributes to **context load** - the description sits in the window every turn. ` +
      "Mechanics: omit `disable-model-invocation`, and write a model-facing description with " +
      'rich trigger phrasing ("Use when the user wants..., mentions...").';
    assert.ok(line.length > MAX_LINE);

    const wrapped = wrapLinePreservingInlineCode(line);
    assert.ok(wrapped.includes("\n"));
    assert.match(wrapped, /`disable-model-invocation`/);
    for (const part of wrapped.split("\n")) {
      assert.ok(part.length <= MAX_LINE, `chunk too long (${part.length}): ${part}`);
    }
  });

  it("wraps a long simple paragraph under the limit per line", () => {
    const line = `${"word ".repeat(36).trimEnd()} tail`;
    assert.ok(line.length > MAX_LINE);

    const wrapped = wrapProse(line);
    assert.ok(wrapped.includes("\n"));
    for (const part of wrapped.split("\n")) {
      assert.ok(part.length <= MAX_LINE, `chunk too long (${part.length}): ${part}`);
    }
  });

  it("leaves a single long token unchanged", () => {
    const line = "x".repeat(MAX_LINE + 20);
    assert.equal(wrapLinePreservingInlineCode(line), line);
  });
});

describe("canAutoFixLongLine", () => {
  it("accepts wrappable prose with break points", () => {
    const line = `${"word ".repeat(70).trim()}`;
    assert.ok(line.length > MAX_LINE);
    assert.equal(canAutoFixLongLine(line), true);
  });

  it("rejects headings and lines with unbreakable spans", () => {
    assert.equal(canAutoFixLongLine(`## ${"heading ".repeat(40)}`), false);
    const line =
      "before " +
      `\`${"c".repeat(MAX_LINE)}\`` +
      " after " +
      `${"word ".repeat(10)}`;
    assert.ok(line.length > MAX_LINE);
    assert.equal(canAutoFixLongLine(line), false);
  });
});

describe("long-lines fix", () => {
  it("wraps prose outside inline code", () => {
    const prose = "word ".repeat(50).trim();
    const content = `Before \`${"c".repeat(20)}\` ${prose}\n`;
    const fixed = fix(content);
    assert.ok(fixed.includes("\n"));
    assert.match(fixed, /`c{20}`/);
    for (const part of fixed.split("\n")) {
      if (part === "") continue;
      assert.ok(part.length <= MAX_LINE, `chunk too long (${part.length}): ${part}`);
    }
  });

  it("skips code blocks", () => {
    const long = "x".repeat(MAX_LINE + 20);
    const content = `\`\`\`\n${long}\n\`\`\`\n`;
    assert.equal(fix(content), content);
  });

  it("wraps list items and simple continuation paragraphs", () => {
    const longListItem = `- ${"item ".repeat(40).trimEnd()} more`;
    const longParagraph = `${"plain ".repeat(40).trimEnd()} text`;
    assert.ok(longListItem.length > MAX_LINE);
    assert.ok(longParagraph.length > MAX_LINE);

    const content = `${longListItem}\n${longParagraph}\n`;
    const fixed = fix(content);

    assert.ok(fixed.includes("\n"));
    assert.match(fixed, /^- item /m);
    for (const part of fixed.split("\n")) {
      if (part === "") continue;
      assert.ok(part.length <= MAX_LINE, `chunk too long (${part.length}): ${part}`);
    }
  });

  it("wraps long lines over multiple passes when needed", () => {
    const long = `${"segment ".repeat(45).trim()} ${"tail ".repeat(45).trim()}`;
    assert.ok(long.length > MAX_LINE);
    const content = `${long}\n`;
    const fixed = fix(content);
    assert.notEqual(fixed, content);
    assert.equal(
      fixed.split("\n").filter((line) => line.length > MAX_LINE).length,
      0
    );
  });

  it("fixes long lines in a real skill body with inline code", () => {
    const path = "/home/econn/git/skills/skills/productivity/writing-great-skills/SKILL.md";
    let content: string;
    try {
      content = readFileSync(path, "utf8");
    } catch {
      return;
    }

    const before = lintSkillContent(content, path).filter(
      (diagnostic) => diagnostic.code === "long-line" && diagnostic.fixable
    );
    if (before.length === 0) return;

    const fixed = fixSkillContent(content, path);
    assert.notEqual(fixed, content);
    assert.equal(
      lintSkillContent(fixed, path).filter((diagnostic) => diagnostic.code === "long-line")
        .length,
      0
    );
    assert.equal(
      fixed.split("\n").filter((line) => line.length > MAX_LINE).length,
      0
    );
  });
});
