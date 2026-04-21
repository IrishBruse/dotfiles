import { spawn } from "node:child_process";
import process from "node:process";

type JsonObject = Record<string, unknown>;

function summarizeToolCall(toolCall: unknown): string {
  if (!toolCall || typeof toolCall !== "object") return "tool";
  const o = toolCall as JsonObject;
  const read = o.readToolCall;
  if (read && typeof read === "object") {
    const args = (read as JsonObject).args as JsonObject | undefined;
    const p = args && typeof args.path === "string" ? args.path : "?";
    return `read ${p}`;
  }
  const shell = o.shellToolCall;
  if (shell && typeof shell === "object") {
    const args = (shell as JsonObject).args as JsonObject | undefined;
    const cmd = args && typeof args.command === "string" ? args.command : "?";
    return cmd.length > 120 ? `${cmd.slice(0, 117)}…` : cmd;
  }
  const ls = o.lsToolCall;
  if (ls && typeof ls === "object") {
    const args = (ls as JsonObject).args as JsonObject | undefined;
    const p = args && typeof args.path === "string" ? args.path : "?";
    return `ls ${p}`;
  }
  const keys = Object.keys(o).filter((k) => k.endsWith("ToolCall"));
  return keys[0] ?? "tool";
}

function assistantText(ev: JsonObject): string | null {
  if (ev.type !== "assistant") return null;
  const message = ev.message;
  if (!message || typeof message !== "object") return null;
  const content = (message as JsonObject).content;
  if (!Array.isArray(content) || content.length === 0) return null;
  const block0 = content[0] as JsonObject;
  return typeof block0.text === "string" ? block0.text : null;
}

/** Stream assistant tokens to stdout without duplicating the final cumulative message. */
function streamAssistantFragment(text: string, st: { acc: string }): void {
  if (text.startsWith(st.acc)) {
    process.stdout.write(text.slice(st.acc.length));
    st.acc = text;
    return;
  }
  if (st.acc.startsWith(text)) return;
  process.stdout.write(text);
  st.acc += text;
}

function handleStreamEvent(ev: JsonObject, assistantSt: { acc: string }): void {
  const type = ev.type;
  const subtype = ev.subtype;

  if (
    type === "thinking" &&
    subtype === "delta" &&
    typeof ev.text === "string"
  ) {
    process.stderr.write(`\x1b[90m${ev.text}\x1b[0m`);
    return;
  }
  if (type === "thinking" && subtype === "completed") {
    process.stderr.write("\n");
    return;
  }

  if (type === "tool_call" && subtype === "started") {
    process.stderr.write(
      `\x1b[36m$\x1b[0m ${summarizeToolCall(ev.tool_call)}\n`,
    );
    return;
  }

  const at = assistantText(ev);
  if (at != null) {
    streamAssistantFragment(at, assistantSt);
  }
}

export function runOpenAgentCapture(
  workspace: string,
  prompt: string,
): Promise<string> {
  const args = [
    "--trust",
    "--workspace",
    workspace,
    "--print",
    "--output-format",
    "stream-json",
    "--stream-partial-output",
    prompt,
  ];
  return new Promise((resolve, reject) => {
    const assistantSt = { acc: "" };
    let finalText: string | null = null;
    let parseError: Error | null = null;
    let lineBuf = "";

    const child = spawn("agent", args, { cwd: workspace, shell: false });
    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");

    child.stderr?.on("data", (chunk: string) => {
      process.stderr.write(chunk);
    });

    const processLine = (trimmed: string): boolean => {
      if (!trimmed) return false;
      let ev: JsonObject;
      try {
        ev = JSON.parse(trimmed) as JsonObject;
      } catch (e) {
        parseError =
          e instanceof Error ? e : new Error("invalid JSON line from agent");
        const snip = trimmed.length > 80 ? `${trimmed.slice(0, 80)}…` : trimmed;
        process.stderr.write(`\npr: agent stdout line was not JSON: ${snip}\n`);
        return false;
      }

      if (ev.type === "result") {
        if (ev.is_error === true) {
          const msg =
            typeof ev.result === "string"
              ? ev.result
              : typeof ev.message === "string"
                ? ev.message
                : "agent reported error";
          parseError = new Error(msg);
          return true;
        }
        if (ev.subtype === "success" && typeof ev.result === "string") {
          finalText = ev.result;
        }
        return true;
      }

      handleStreamEvent(ev, assistantSt);
      return false;
    };

    const pushStdout = (chunk: string, isEnd: boolean) => {
      lineBuf += chunk;
      let nl: number;
      while ((nl = lineBuf.indexOf("\n")) !== -1) {
        const done = processLine(lineBuf.slice(0, nl).trim());
        lineBuf = lineBuf.slice(nl + 1);
        if (done) {
          lineBuf = "";
          return;
        }
      }
      if (isEnd && lineBuf.trim()) {
        processLine(lineBuf.trim());
        lineBuf = "";
      }
    };

    child.stdout?.on("data", (chunk: string) => {
      pushStdout(chunk, false);
    });

    child.on("error", (err: NodeJS.ErrnoException) => {
      reject(err);
    });

    child.on("close", (code, signal) => {
      pushStdout("", true);
      if (signal) {
        reject(new Error(`agent killed (${signal})`));
        return;
      }
      if (parseError) {
        reject(parseError);
        return;
      }
      if (code !== 0) {
        reject(new Error(`agent exited with code ${code}`));
        return;
      }
      if (finalText === null) {
        reject(
          new Error(
            "agent stream ended without a result event (try `agent -p --output-format stream-json …` manually)",
          ),
        );
        return;
      }
      resolve(finalText);
    });
  });
}
