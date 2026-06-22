import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseGlobalFlag, takeOptionalFlag } from "./args.ts";

describe("parseGlobalFlag", () => {
  it("detects -g and --global anywhere", () => {
    assert.deepEqual(parseGlobalFlag(["-g", "add", "id", "text"]), {
      rest: ["add", "id", "text"],
      global: true
    });
    assert.deepEqual(parseGlobalFlag(["add", "--global", "id", "text"]), {
      rest: ["add", "id", "text"],
      global: true
    });
  });

  it("leaves args unchanged when no global flag", () => {
    assert.deepEqual(parseGlobalFlag(["view", "my-id"]), {
      rest: ["view", "my-id"],
      global: false
    });
  });
});

describe("takeOptionalFlag", () => {
  it("reads spaced flag values", () => {
    const { rest, value } = takeOptionalFlag(
      ["add", "my-id", "--detail", "extra notes"],
      "--detail"
    );
    assert.deepEqual(rest, ["add", "my-id"]);
    assert.equal(value, "extra notes");
  });

  it("reads equals-form flag values", () => {
    const { rest, value } = takeOptionalFlag(
      ["add", "my-id", "--detail=extra notes"],
      "--detail"
    );
    assert.deepEqual(rest, ["add", "my-id"]);
    assert.equal(value, "extra notes");
  });

  it("throws when a spaced flag has no value", () => {
    assert.throws(
      () => takeOptionalFlag(["add", "my-id", "--detail"], "--detail"),
      /--detail requires a value/
    );
  });
});
