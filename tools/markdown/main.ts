import { readFileSync } from "node:fs";
import { writeMarkdown } from "./api.ts";

function readInput(): string {
  const path = process.argv[2];
  if (path !== undefined) return readFileSync(path, "utf8");

  if (!process.stdin.isTTY) return readFileSync(0, "utf8");

  console.error(`md — render markdown for the terminal

Usage:
  md < file.md
  cat file.md | md
  md path/to/file.md`);
  process.exit(1);
}

writeMarkdown(readInput());
