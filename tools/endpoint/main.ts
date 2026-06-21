import { appendFile } from "node:fs/promises";
import { createServer, type IncomingMessage } from "node:http";
import process from "node:process";

import { parseBody, parseEndpointArgs } from "./parse.ts";

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

let port: number;
let outPath: string;
try {
  ({ port, outPath } = parseEndpointArgs(process.argv.slice(2)));
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}

const server = createServer((req, res) => {
  void (async () => {
    const path = req.url?.split("?")[0] ?? "/";
    console.log(`${req.method} ${path}`);
    const rawBody = await readBody(req);
    const record = {
      time: new Date().toISOString(),
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: parseBody(rawBody, req.headers["content-type"]),
      remoteAddress: req.socket.remoteAddress
    };
    await appendFile(outPath, `${JSON.stringify(record)}\n`, "utf8");
    res.writeHead(200);
    res.end();
  })().catch(() => {
    res.writeHead(500);
    res.end();
  });
});

server.listen(port, "127.0.0.1", () => {
  const address = server.address();
  if (address === null || typeof address === "string") {
    console.error("endpoint: failed to bind");
    process.exit(1);
  }
  console.log(`http://127.0.0.1:${address.port}`);
});
