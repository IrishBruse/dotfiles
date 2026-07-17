import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { markdown } from "./api.ts";
import { collectLinkRefs, isLinkRefDefLine } from "./links.ts";
import { wrapInlineSpans } from "./inline.ts";

describe("collectLinkRefs", () => {
  it("parses reference-style link definitions", () => {
    const refs = collectLinkRefs("[Docs]: https://example.com/docs\n");
    assert.equal(refs.get("docs"), "https://example.com/docs");
  });
});

describe("isLinkRefDefLine", () => {
  it("detects reference definition lines", () => {
    assert.equal(isLinkRefDefLine("[label]: /path"), true);
    assert.equal(isLinkRefDefLine("# heading"), false);
  });
});

describe("wrapInlineSpans", () => {
  it("wraps long text at word boundaries", () => {
    const lines = wrapInlineSpans(
      "Surface as Ticket Hygiene and ask whether to search for or assign a parent",
      20
    );
    assert.ok(lines.length > 1);
    for (const spans of lines) {
      const length = spans.reduce((n, span) => n + span.text.length, 0);
      assert.ok(length <= 20);
    }
  });
});

describe("markdown tables", () => {
  it("wraps long cell content inside column boundaries", () => {
    const previous = process.stdout.columns;
    Object.defineProperty(process.stdout, "columns", {
      value: 72,
      configurable: true
    });
    try {
      const out = markdown(`| Gate | When | Action |
| --- | --- | --- |
| Missing parent | Sub-task without parent | Surface as Ticket Hygiene and ask whether to search for or assign a parent |`);
      const rows = out.split("\n").filter((line) => line.includes("│"));
      const continuationRows = rows.filter((line) =>
        /search for|assign a parent/.test(line)
      );
      assert.ok(continuationRows.length > 0);
      for (const row of continuationRows) {
        assert.match(row, /│.*assign a parent.*│/);
      }
    } finally {
      Object.defineProperty(process.stdout, "columns", {
        value: previous,
        configurable: true
      });
    }
  });
});

describe("markdown", () => {
  it("renders headings and paragraphs", () => {
    const out = markdown("# Title\n\nHello world.");
    assert.match(out, /Title/);
    assert.match(out, /Hello world/);
  });

  it("renders bullet lists", () => {
    const out = markdown("- one\n- two");
    assert.match(out, /one/);
    assert.match(out, /two/);
  });
});
