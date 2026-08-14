import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { lint } from "./tool-menu.ts";

describe("tool-menu lint", () => {
  it("flags multiple tool options", () => {
    const content =
      "You can use pypdf, pdfplumber, or PyMuPDF for extraction.\n";
    const diagnostics = lint(content);
    assert.equal(diagnostics[0]?.code, "tool-menu");
  });

  it("allows a single default tool", () => {
    const content = "Use pdfplumber for text extraction.\n";
    assert.deepEqual(lint(content), []);
  });
});
