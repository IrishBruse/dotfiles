import { existsSync, readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Connect } from "vite";
import type { Plugin, ViteDevServer } from "vite";

import { runWithResult as runJiraSync } from "../tools/jira/sync.ts";

const VIRTUAL_ID = "virtual:jira-board";
const RESOLVED_ID = `\0${VIRTUAL_ID}`;

const STATUS_ORDER = [
  "inProgress",
  "codeReview",
  "inTest",
  "todo",
  "done"
] as const;

const STATUS_LABELS: Record<(typeof STATUS_ORDER)[number], string> = {
  todo: "Todo",
  inProgress: "In Progress",
  codeReview: "Code Review",
  inTest: "In Test",
  done: "Done"
};

type SprintTicket = {
  key: string;
  summary: string;
  assignee: string;
};

type SprintJson = {
  sections: {
    myTickets: {
      statuses: Record<(typeof STATUS_ORDER)[number], SprintTicket[]>;
    };
    teammates?: {
      statuses: Record<(typeof STATUS_ORDER)[number], SprintTicket[]>;
    };
    unassigned?: {
      statuses: Record<(typeof STATUS_ORDER)[number], SprintTicket[]>;
    };
    misc?: {
      statuses: Record<(typeof STATUS_ORDER)[number], SprintTicket[]>;
    };
  };
};

export type BoardSubtask = {
  summary: string;
  done: boolean;
};

export type BoardTicket = {
  key: string;
  summary: string;
  assignee: string;
  status: string;
  statusBucket: (typeof STATUS_ORDER)[number];
  priority: string;
  createdAt: string;
  updatedAt: string;
  url: string;
  description: string;
  subtasks: BoardSubtask[];
};

export type BoardData = {
  myTickets: BoardTicket[];
  otherTickets: BoardTicket[];
};

function skillDir(): string {
  return path.join(homedir(), ".agents", "skills", "jira-board");
}

function sprintPath(): string {
  const live = path.join(skillDir(), "sprint.json");
  if (existsSync(live)) {
    return live;
  }
  return path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../jira/fixtures/sprint.json"
  );
}

function parseFrontmatter(text: string): {
  meta: Record<string, string>;
  body: string;
} {
  const lines = text.split("\n");
  if (lines[0]?.trim() !== "---") {
    return { meta: {}, body: text };
  }
  const end = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (end < 0) {
    return { meta: {}, body: text };
  }
  const meta: Record<string, string> = {};
  for (const line of lines.slice(1, end)) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (match) {
      let value = match[2]!.trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      meta[match[1]!] = value;
    }
  }
  return { meta, body: lines.slice(end + 1).join("\n").trim() };
}

function stripSubtaskLines(body: string): string {
  return body
    .split("\n")
    .filter((line) => !/^\s*-\s+\[[\sxX]\]\s+/.test(line))
    .join("\n")
    .trim();
}

function parseSubtasks(body: string): BoardSubtask[] {
  const items: BoardSubtask[] = [];
  for (const line of body.split("\n")) {
    const open = line.match(/^\s*-\s+\[\s\]\s+(.+)$/);
    if (open) {
      items.push({ summary: open[1]!.trim(), done: false });
      continue;
    }
    const done = line.match(/^\s*-\s+\[[xX]\]\s+(.+)$/);
    if (done) {
      items.push({ summary: done[1]!.trim(), done: true });
    }
  }
  return items;
}

function defaultPriority(type: string | undefined): string {
  if (!type) {
    return "Medium";
  }
  const lower = type.toLowerCase();
  if (lower.includes("bug")) {
    return "High";
  }
  if (lower.includes("spike")) {
    return "Low";
  }
  return "Medium";
}

function ticketMarkdownPath(key: string): string | null {
  const refs = path.join(skillDir(), "references");
  for (const bucket of ["me", "team", "unassigned", "misc"] as const) {
    const candidate = path.join(refs, bucket, `${key}.md`);
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function enrichTicket(
  row: SprintTicket,
  bucket: (typeof STATUS_ORDER)[number]
): BoardTicket {
  const mdPath = ticketMarkdownPath(row.key);
  let description = row.summary;
  let url = `https://globalization-partners.atlassian.net/browse/${row.key}`;
  let priority = "Medium";
  let createdAt = "";
  let updatedAt = "";

  if (mdPath) {
    const raw = readFileSync(mdPath, "utf8");
    const { meta, body } = parseFrontmatter(raw);
    if (meta.url) {
      url = meta.url;
    }
    priority = meta.priority ?? defaultPriority(meta.type);
    description = stripSubtaskLines(body) || row.summary;
    createdAt = meta.created ?? "";
    updatedAt = meta.updated ?? "";
    return {
      key: row.key,
      summary: row.summary,
      assignee: row.assignee,
      status: STATUS_LABELS[bucket],
      statusBucket: bucket,
      priority,
      createdAt,
      updatedAt,
      url,
      description,
      subtasks: parseSubtasks(body)
    };
  }

  return {
    key: row.key,
    summary: row.summary,
    assignee: row.assignee,
    status: STATUS_LABELS[bucket],
    statusBucket: bucket,
    priority,
    createdAt,
    updatedAt,
    url,
    description,
    subtasks: []
  };
}

function loadSectionTickets(
  statuses: Record<(typeof STATUS_ORDER)[number], SprintTicket[]>
): BoardTicket[] {
  const tickets: BoardTicket[] = [];
  for (const bucket of STATUS_ORDER) {
    for (const row of statuses[bucket] ?? []) {
      tickets.push(enrichTicket(row, bucket));
    }
  }
  return tickets;
}

function loadBoardData(): BoardData {
  const sprint = JSON.parse(readFileSync(sprintPath(), "utf8")) as SprintJson;
  const { sections } = sprint;
  const myTickets = loadSectionTickets(sections.myTickets.statuses);
  const otherTickets = [
    ...(sections.teammates
      ? loadSectionTickets(sections.teammates.statuses)
      : []),
    ...(sections.unassigned
      ? loadSectionTickets(sections.unassigned.statuses)
      : []),
    ...(sections.misc ? loadSectionTickets(sections.misc.statuses) : [])
  ];

  return { myTickets, otherTickets };
}

function boardModuleSource(): string {
  return `export default ${JSON.stringify(loadBoardData())}`;
}

function watchPaths(): string[] {
  const dir = skillDir();
  if (!existsSync(dir)) {
    return [sprintPath()];
  }
  const refs = path.join(dir, "references");
  const paths = [path.join(dir, "sprint.json")];
  if (existsSync(refs)) {
    for (const bucket of readdirSync(refs)) {
      paths.push(path.join(refs, bucket));
    }
  }
  return paths;
}

function reloadBoardModule(server: ViteDevServer): void {
  const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
  if (mod) {
    server.reloadModule(mod);
  }
}

let syncing = false;

function jiraSyncMiddleware(server: ViteDevServer): Connect.NextHandleFunction {
  return (req, res, next) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (url.pathname !== "/api/jira/sync" || req.method !== "POST") {
      next();
      return;
    }

    res.setHeader("Content-Type", "application/json");

    if (syncing) {
      res.statusCode = 409;
      res.end(JSON.stringify({ ok: false, error: "Sync already in progress" }));
      return;
    }

    syncing = true;
    try {
      const result = runJiraSync();
      if (result.code !== 0) {
        res.statusCode = 500;
        res.end(
          JSON.stringify({ ok: false, error: result.error ?? "Sync failed" })
        );
        return;
      }
      reloadBoardModule(server);
      res.end(JSON.stringify({ ok: true, ...loadBoardData() }));
    } finally {
      syncing = false;
    }
  };
}

/** Load sprint.json and local ticket markdown for the dashboard board. */
export function jiraBoard(): Plugin {
  return {
    name: "jira-board",
    resolveId(id) {
      if (id === VIRTUAL_ID) {
        return RESOLVED_ID;
      }
    },
    load(id) {
      if (id === RESOLVED_ID) {
        return boardModuleSource();
      }
    },
    configureServer(server) {
      for (const target of watchPaths()) {
        server.watcher.add(target);
      }
      server.middlewares.use(jiraSyncMiddleware(server));
    },
    handleHotUpdate({ file, server }) {
      const normalized = path.normalize(file);
      if (!watchPaths().some((target) => normalized.startsWith(target))) {
        return;
      }
      const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
      if (mod) {
        server.reloadModule(mod);
      }
    }
  };
}
