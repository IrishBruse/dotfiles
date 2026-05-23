#!/usr/bin/env node
import { readFileSync } from "node:fs";

const ESC = "\x1b";
const ANSI_RESET = `${ESC}[0m`;
const ANSI_FG_GRAY = `${ESC}[90m`;
const ANSI_FG_BRIGHT_RED = `${ESC}[91m`;
const ANSI_FG_BRIGHT_YELLOW = `${ESC}[93m`;
/** @param {number | null | undefined} tokenCount */
function fmtk(tokenCount) {
  if (tokenCount == null) return "?";
  const roundedK = Math.round(tokenCount / 100) / 10;
  const whole = Math.floor(roundedK);
  const tenths = Math.round(roundedK * 10) % 10;
  return `${whole}.${tenths}k`;
}

/** @param {number | null | undefined} usedTokens */
function usageColorAnsi(usedTokens) {
  const n = usedTokens ?? 0;
  if (n > 100_000) return ANSI_FG_BRIGHT_RED;
  if (n > 80_000) return ANSI_FG_BRIGHT_YELLOW;
  return ANSI_FG_GRAY;
}

/** @param {{ id?: string, display_name?: string }} model */
function guessedContextLimit(model) {
  const id = String(model.id ?? "").toLowerCase();
  const name = String(model.display_name ?? "");
  if (id.includes("composer-2")) return 200_000;
  if (/composer\s*2(?!\d)/i.test(name)) return 200_000;
  return 100_000;
}

/** @param {string} path */
function pwdWithHomeTilde(path) {
  const home = process.env.HOME ?? "";
  if (path === "" || home === "") return path;
  const homeNorm = home.endsWith("/") ? home.slice(0, -1) : home;
  if (path === homeNorm) return "~";
  if (path.startsWith(`${homeNorm}/`)) return `~${path.slice(homeNorm.length)}`;
  return path;
}

const payload = JSON.parse(readFileSync(0, "utf8"));
const contextWindow = payload.context_window ?? {};
const totalInputTokens = contextWindow.total_input_tokens;
const model = payload.model ?? {};
const effectiveLimit =
  contextWindow.context_window_size ?? guessedContextLimit(model);
const usageDisplay =
  totalInputTokens == null || totalInputTokens === 0
    ? "0"
    : fmtk(totalInputTokens);
const limitDisplay = fmtk(effectiveLimit);
const modelLabel = model.display_name ?? model.id ?? "?";

const usageTone = usageColorAnsi(totalInputTokens);
const cwdRaw = payload.cwd ?? payload.workspace?.current_dir ?? "";
const cwdDisplay = cwdRaw === "" ? "?" : pwdWithHomeTilde(cwdRaw);

const line = `${ANSI_FG_GRAY}${cwdDisplay}  ${modelLabel}  ${ANSI_RESET}${usageTone}${usageDisplay}/${limitDisplay}${ANSI_RESET}`;
process.stdout.write(`${line}\n`);
