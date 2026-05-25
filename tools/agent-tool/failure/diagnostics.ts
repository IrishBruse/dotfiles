/// <reference types="node" />
import process from "node:process";

export type Diagnostics = {
  timestamp: string;
  cwd: string;
};

export function collectDiagnostics(): Diagnostics {
  return {
    timestamp: new Date().toISOString(),
    cwd: process.cwd()
  };
}
