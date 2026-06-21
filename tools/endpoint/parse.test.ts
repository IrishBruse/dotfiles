import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseBody, parseEndpointArgs, parsePortValue } from "./parse.ts";

describe("parseBody", () => {
  it("returns raw text for non-json content types", () => {
    assert.equal(parseBody("plain", "text/plain"), "plain");
  });

  it("parses json bodies", () => {
    assert.deepEqual(parseBody('{"ok":true}', "application/json"), { ok: true });
  });

  it("returns null for empty json bodies", () => {
    assert.equal(parseBody("   ", "application/json"), null);
  });

  it("falls back to raw text on invalid json", () => {
    assert.equal(parseBody("{bad", "application/json"), "{bad");
  });
});

describe("parsePortValue", () => {
  it("accepts valid ports", () => {
    assert.equal(parsePortValue("8080"), 8080);
    assert.equal(parsePortValue("0"), 0);
  });

  it("rejects invalid ports", () => {
    assert.throws(() => parsePortValue(undefined), /--port requires a value/);
    assert.throws(() => parsePortValue("99999"), /invalid port/);
    assert.throws(() => parsePortValue("abc"), /invalid port/);
  });
});

describe("parseEndpointArgs", () => {
  it("defaults to ephemeral port and endpoint.jsonl", () => {
    assert.deepEqual(parseEndpointArgs([]), { port: 0, outPath: "endpoint.jsonl" });
  });

  it("parses --port and output path", () => {
    assert.deepEqual(parseEndpointArgs(["--port", "3000", "/tmp/out.jsonl"]), {
      port: 3000,
      outPath: "/tmp/out.jsonl"
    });
  });

  it("accepts legacy port-first argv", () => {
    assert.deepEqual(parseEndpointArgs(["4000", "hooks.jsonl"]), {
      port: 4000,
      outPath: "hooks.jsonl"
    });
  });
});
