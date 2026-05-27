import { readFileSync } from "node:fs";
import { markdown } from "./api.ts";

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function readInput(): Promise<string> {
  const path = process.argv[2];
  if (path !== undefined) return readFileSync(path, "utf8");

  if (!process.stdin.isTTY) return readStdin();

  console.error(`md — render markdown for the terminal

Usage:
  md < file.md
  cat file.md | md
  md path/to/file.md`);
  process.exit(1);
}

process.stdout.write(markdown(await readInput()));
