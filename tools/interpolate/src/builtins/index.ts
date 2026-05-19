import type { InterpolationError } from "../errors.ts";
import * as cwd from "./cwd.ts";
import * as home from "./home.ts";
import * as user from "./user.ts";
import { expand as expandCommand } from "./command.ts";
import { expand as expandEnv } from "./env.ts";

const vars = [cwd, home, user] as const;

export function builtinVars(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const b of vars) {
    out[b.key] = b.resolve();
  }
  return out;
}

export type PatternExpandResult = {
  text: string;
  errors: InterpolationError[];
};

export function expandPatternBuiltins(text: string): PatternExpandResult {
  let out = expandEnv(text);
  return expandCommand(out);
}

export const builtinKeys = vars.map((b) => b.key);
