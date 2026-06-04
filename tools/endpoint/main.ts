import { appendFile } from "node:fs/promises";
import { createServer, type IncomingMessage } from "node:http";

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function parsePort(arg: string | undefined): number {
  if (arg === undefined) {
    return 0;
  }
  const port = Number(arg);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    console.error(`endpoint: invalid port: ${arg}`);
    process.exit(1);
  }
  return port;
}

const port = parsePort(process.argv[2]);
const outPath = process.argv[3] ?? "endpoint.jsonl";

const server = createServer((req, res) => {
  void (async () => {
    const body = await readBody(req);
    const record = {
      time: new Date().toISOString(),
      method: req.method,
      url: req.url,
      headers: req.headers,
      body,
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
