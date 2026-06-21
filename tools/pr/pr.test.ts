import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolvePrAction } from "./detect.ts";
import { unresolvedThreads } from "./reviewContext.ts";
import type { ReviewThread } from "./reviewContext.ts";
import { failedChecks } from "./workflowContext.ts";
import type { PrCheck } from "./workflowContext.ts";

describe("resolvePrAction", () => {
  it("updates when an explicit PR target is provided", () => {
    assert.deepEqual(resolvePrAction("/tmp", "42"), {
      mode: "update",
      prTarget: "42"
    });
  });
});

describe("failedChecks", () => {
  it("keeps only failed workflow conclusions", () => {
    const checks: PrCheck[] = [
      check("lint", "SUCCESS"),
      check("test", "FAILURE"),
      check("deploy", "CANCELLED")
    ];
    const failed = failedChecks(checks);
    assert.deepEqual(
      failed.map((c) => c.name),
      ["test", "deploy"]
    );
  });
});

describe("unresolvedThreads", () => {
  it("filters out resolved review threads", () => {
    const threads: ReviewThread[] = [
      thread(true),
      thread(false)
    ];
    assert.equal(unresolvedThreads(threads).length, 1);
    assert.equal(unresolvedThreads(threads)[0]!.isResolved, false);
  });
});

function check(name: string, conclusion: string): PrCheck {
  return {
    name,
    workflowName: "ci",
    conclusion,
    status: "completed",
    detailsUrl: "",
    startedAt: "",
    completedAt: ""
  };
}

function thread(isResolved: boolean): ReviewThread {
  return {
    isResolved,
    path: "file.ts",
    line: 1,
    comments: []
  };
}
