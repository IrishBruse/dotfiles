import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatDate,
  formatSprintBlock,
  parseIsoDateLocal,
  sprintForNumber,
  sprintNumberForDate
} from "./sprint.ts";

describe("sprintForNumber", () => {
  it("anchors sprint 140 to 8 Jan 2026", () => {
    const sprint = sprintForNumber(140);
    assert.equal(sprint.number, 140);
    assert.equal(sprint.start.getFullYear(), 2026);
    assert.equal(sprint.start.getMonth(), 0);
    assert.equal(sprint.start.getDate(), 8);
    assert.equal(sprint.end.getDate(), 21);
  });

  it("steps in 14-day blocks", () => {
    const sprint = sprintForNumber(141);
    assert.equal(sprint.start.getDate(), 22);
    assert.equal(sprint.end.getDate(), 4);
    assert.equal(sprint.end.getMonth(), 1);
  });
});

describe("sprintNumberForDate", () => {
  it("maps dates inside a sprint to its number", () => {
    const date = new Date(2026, 0, 15);
    assert.equal(sprintNumberForDate(date), 140);
  });
});

describe("parseIsoDateLocal", () => {
  it("parses valid YYYY-MM-DD dates", () => {
    const date = parseIsoDateLocal("2026-06-21");
    assert.ok(date);
    assert.equal(date!.getFullYear(), 2026);
    assert.equal(date!.getMonth(), 5);
    assert.equal(date!.getDate(), 21);
  });

  it("rejects invalid calendar dates", () => {
    assert.equal(parseIsoDateLocal("2026-02-30"), undefined);
    assert.equal(parseIsoDateLocal("not-a-date"), undefined);
  });
});

describe("formatDate", () => {
  it("includes weekday and long month", () => {
    const formatted = formatDate(new Date(2026, 0, 8));
    assert.match(formatted, /Thursday/);
    assert.match(formatted, /8 January 2026/);
  });
});

describe("formatSprintBlock", () => {
  it("renders labeled sprint ranges", () => {
    const sprint = sprintForNumber(140);
    const block = formatSprintBlock("Current", sprint);
    assert.match(block, /Current:\s+Sprint 140/);
    assert.match(block, /Start:/);
    assert.match(block, /End:/);
  });
});
