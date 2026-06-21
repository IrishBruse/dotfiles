import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { findUndefinedVariables } from "./validate.ts";

describe("findUndefinedVariables", () => {
  it("reports unknown placeholders", () => {
    const errors = findUndefinedVariables("Hello {{missing}}", {});
    assert.equal(errors.length, 1);
    assert.match(errors[0]!.message, /undefined variable "missing"/);
    assert.equal(errors[0]!.line, 1);
    assert.equal(errors[0]!.column, 7);
  });

  it("accepts builtin and override variables", () => {
    const errors = findUndefinedVariables("{{cwd}} and {{custom}}", {
      custom: "value"
    });
    assert.deepEqual(errors, []);
  });
});
