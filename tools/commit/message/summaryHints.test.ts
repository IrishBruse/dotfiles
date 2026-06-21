import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  deduplicateHumanizedSymbols,
  extractCliFlags,
  formatCliFlagSummary,
  formatSymbolSummary,
  humanizeSymbol,
  isLowQualitySymbolSummary,
  rankSummarySymbols
} from "./summaryHints.ts";

describe("extractCliFlags", () => {
  it("collects long flags from option lines", () => {
    const lines = ["  -v, --verbose   Show extra output"];
    assert.deepEqual(extractCliFlags(lines), ["--verbose"]);
  });

  it("collects inline flags when the line mentions flags", () => {
    const lines = ["Use -n and --dry-run flags"];
    assert.deepEqual(extractCliFlags(lines), ["-n", "--dry-run"]);
  });

  it("skips help and version boilerplate flags", () => {
    const lines = ["  -h, --help   Usage", "  --version   Print version"];
    assert.deepEqual(extractCliFlags(lines), []);
  });
});

describe("humanizeSymbol", () => {
  it("splits camelCase and strips common verb prefixes", () => {
    assert.equal(humanizeSymbol("parseSlug"), "slug");
    assert.equal(humanizeSymbol("buildTree"), "build tree");
  });
});

describe("rankSummarySymbols", () => {
  it("omits symbols with non-positive scores", () => {
    assert.deepEqual(rankSummarySymbols(["parse", "parseSlug"]), ["parseSlug"]);
  });
});

describe("formatCliFlagSummary", () => {
  it("describes added flags", () => {
    assert.equal(
      formatCliFlagSummary(["-v", "--verbose"], "feature"),
      "add -v and --verbose flags"
    );
  });
});

describe("deduplicateHumanizedSymbols", () => {
  it("drops shorter prefixes when a longer symbol exists", () => {
    assert.deepEqual(
      deduplicateHumanizedSymbols(["commit message", "commit"]),
      ["commit message"]
    );
  });
});

describe("formatSymbolSummary", () => {
  it("returns empty when symbols echo the scope", () => {
    assert.equal(formatSymbolSummary(["memory"], "feature", "memory"), "");
  });

  it("formats the top ranked symbol", () => {
    assert.equal(formatSymbolSummary(["parseSlug"], "feature", "memory"), "add slug");
  });
});

describe("isLowQualitySymbolSummary", () => {
  it("rejects empty and overly long summaries", () => {
    assert.equal(isLowQualitySymbolSummary([]), true);
    assert.equal(
      isLowQualitySymbolSummary([
        "extraordinarily verbose symbol name that should not become a subject"
      ]),
      true
    );
  });
});
