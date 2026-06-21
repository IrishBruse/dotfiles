import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { expandLineConditions } from "./conditions.ts";
import { expandPlaceholders, expandTemplate } from "./expand.ts";

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

describe("expandTemplate", () => {
  it("expands builtins and overrides", () => {
    const result = expandTemplate("cwd={{cwd}} custom={{custom}}", {
      custom: "ok"
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.match(result.text, /cwd=/);
      assert.match(result.text, /custom=ok/);
    }
  });

  it("returns errors for undefined placeholders", () => {
    const result = expandTemplate("missing {{nope}}", {});
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.errors[0]!.message, /undefined variable "nope"/);
    }
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
