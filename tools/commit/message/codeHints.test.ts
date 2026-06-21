import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { hintsFromAddedLines } from "./codeHints.ts";

describe("hintsFromAddedLines", () => {
  it("collects exported TypeScript symbols", () => {
    const lines = [
      "export function greetUser() {",
      "  return 'hi';",
      "}"
    ];
    const hints = hintsFromAddedLines("src/greet.ts", lines);
    assert.deepEqual(hints.newSymbols, ["greetUser"]);
    assert.ok(hints.featureSignals > 0);
  });

  it("counts fix signals in comments", () => {
    const lines = ["// fixed null crash when input missing"];
    const hints = hintsFromAddedLines("src/fix.ts", lines);
    assert.equal(hints.fixSignals, 1);
  });

  it("detects new C# types", () => {
    const lines = ["public class WidgetService {"];
    const hints = hintsFromAddedLines("Services/WidgetService.cs", lines);
    assert.deepEqual(hints.newSymbols, ["WidgetService"]);
  });
});
