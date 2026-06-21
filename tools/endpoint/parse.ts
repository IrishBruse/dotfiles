/** Pure helpers for endpoint request parsing. */
export function parseBody(raw: string, contentType: string | undefined): unknown {
  const isJson =
    contentType?.split(";")[0]?.trim().toLowerCase() === "application/json";
  if (!isJson) {
    return raw;
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return raw;
  }
}

export function parsePortValue(arg: string | undefined): number {
  if (arg === undefined) {
    throw new Error("endpoint: --port requires a value");
  }
  const port = Number(arg);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`endpoint: invalid port: ${arg}`);
  }
  return port;
}

/** Parse argv into listen port and output path. */
export function parseEndpointArgs(argv: string[]): { port: number; outPath: string } {
  let port: number | undefined;
  const rest: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--port") {
      port = parsePortValue(argv[++i]);
      continue;
    }
    if (arg.startsWith("--port=")) {
      port = parsePortValue(arg.slice("--port=".length));
      continue;
    }
    rest.push(arg);
  }

  if (port === undefined && rest[0] !== undefined) {
    port = parsePortValue(rest.shift());
  }

  return {
    port: port ?? 0,
    outPath: rest[0] ?? "endpoint.jsonl"
  };
}
