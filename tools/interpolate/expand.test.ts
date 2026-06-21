import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { expandLineConditions } from "./conditions.ts";
import { expandPlaceholders } from "./expand.ts";

describe("expandPlaceholders", () => {
  it("replaces placeholders with provided vars", () => {
    const out = expandPlaceholders("Hello {{name}} from {{place}}", {
      name: "Ada",
      place: "London"
    });
    assert.equal(out, "Hello Ada from London");
  });

  it("applies later keys over earlier passes", () => {
    const out = expandPlaceholders("{{x}}", { x: "one" });
    assert.equal(out, "one");
  });
});

describe("expandLineConditions", () => {
  it("keeps unconditional lines", () => {
    const out = expandLineConditions("always\nshown", {});
    assert.equal(out, "always\nshown");
  });

  it("unwraps lines when a builtin var is truthy", () => {
    const out = expandLineConditions("?branch: on branch {{branch}}", {
      branch: "main"
    });
    assert.equal(out, "on branch {{branch}}");
  });

  it("drops lines when the condition is false", () => {
    const out = expandLineConditions("?missing: hidden line\nvisible", {
      branch: "main"
    });
    assert.equal(out, "visible");
  });
});
