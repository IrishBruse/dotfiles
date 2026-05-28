type StreamMessage = {
  content?: Array<{ type?: string; text?: string }>;
};

type StreamEvent = {
  type?: string;
  subtype?: string;
  is_error?: boolean;
  result?: string;
  message?: StreamMessage;
};

function messageText(message: StreamMessage | undefined): string {
  const blocks = message?.content ?? [];
  const parts: string[] = [];
  for (const block of blocks) {
    if (block.type === "text" && typeof block.text === "string") {
      parts.push(block.text);
    }
  }
  return parts.join("").trimEnd();
}

/** Last assistant reply or successful `result` text from stream-json stdout. */
export function extractAgentReplyText(output: string): string {
  const lines = output.trim().split("\n");
  let sawJson = false;
  let lastAssistant = "";
  let resultText = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "") {
      continue;
    }
    let event: StreamEvent;
    try {
      event = JSON.parse(trimmed) as StreamEvent;
    } catch {
      continue;
    }
    sawJson = true;

    if (event.type === "assistant") {
      const text = messageText(event.message);
      if (text !== "") {
        lastAssistant = text;
      }
      continue;
    }

    if (
      event.type === "result" &&
      event.subtype === "success" &&
      event.is_error !== true &&
      typeof event.result === "string" &&
      event.result.trim() !== ""
    ) {
      resultText = event.result;
    }
  }

  if (resultText !== "") {
    return resultText.trim();
  }
  if (lastAssistant !== "") {
    return lastAssistant.trim();
  }
  if (!sawJson) {
    return output.trim();
  }
  throw new Error("could not extract PR text from agent output");
}
