import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { takeOptionalFlag } from "./args.ts";

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
