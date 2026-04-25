/// <reference types="node" />

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { printViewHelp, runView } from "./view.ts";
import {
  CallExpression,
  Node,
  Project,
  SyntaxKind,
  type SourceFile,
} from "ts-morph";

type Edge = { caller: string; callee: string; callerRel: string };

function isCallableKind(k: SyntaxKind): boolean {
  return (
    k === SyntaxKind.FunctionDeclaration ||
    k === SyntaxKind.MethodDeclaration ||
    k === SyntaxKind.ArrowFunction ||
    k === SyntaxKind.FunctionExpression
  );
}

function enclosingCallable(call: CallExpression): Node | undefined {
  let n: Node | undefined = call;
  while (n) {
    n = n.getParent();
    if (!n) break;
    if (isCallableKind(n.getKind())) return n;
  }
  return undefined;
}

function labelForCallable(n: Node): string {
  if (Node.isFunctionDeclaration(n)) {
    return n.getName() ?? "anonymous";
  }
  if (Node.isMethodDeclaration(n)) {
    const parent = n.getParent();
    const clsName =
      Node.isClassDeclaration(parent) || Node.isClassExpression(parent)
        ? (parent.getName() ?? "(anonymous class)")
        : "?";
    return `${clsName}.${n.getName()}`;
  }
  if (Node.isArrowFunction(n) || Node.isFunctionExpression(n)) {
    const vd = n.getParentIfKind(SyntaxKind.VariableDeclaration);
    if (vd) return vd.getName() ?? "anonymous";
    const pa = n.getParentIfKind(SyntaxKind.PropertyAssignment);
    const nameNode = pa?.getNameNode();
    if (nameNode && Node.isIdentifier(nameNode)) return nameNode.getText();
    return "anonymous";
  }
  return "anonymous";
}

function collectCallables(file: SourceFile): Node[] {
  const out: Node[] = [];
  out.push(...file.getDescendantsOfKind(SyntaxKind.FunctionDeclaration));
  out.push(...file.getDescendantsOfKind(SyntaxKind.MethodDeclaration));
  for (const vd of file.getDescendantsOfKind(SyntaxKind.VariableDeclaration)) {
    const init = vd.getInitializer();
    if (!init) continue;
    if (Node.isArrowFunction(init) || Node.isFunctionExpression(init)) {
      out.push(init);
    }
  }
  return out;
}

function calleeLabel(project: Project, call: CallExpression): string | undefined {
  const expr = call.getExpression();
  let symbol = expr.getSymbol();
  if (!symbol) {
    symbol = expr.getType().getSymbol();
  }
  if (!symbol) return undefined;
  const decls = symbol.getDeclarations();
  const d0 = decls[0];
  if (!d0) return undefined;
  if (d0.getSourceFile().isInNodeModules()) return undefined;
  const checker = project.getTypeChecker();
  let fq = checker.getFullyQualifiedName(symbol);
  const qdot = fq.indexOf('".');
  if (qdot !== -1) fq = fq.slice(qdot + 2);
  return fq;
}

function normalizeRel(projectDir: string, filePath: string): string {
  let rel = path.relative(projectDir, filePath);
  rel = rel.split(path.sep).join("/");
  return rel || path.basename(filePath);
}

function collectEdges(
  project: Project,
  projectDir: string,
  maxEdges: number,
): Edge[] {
  const edges: Edge[] = [];
  for (const file of project.getSourceFiles()) {
    if (file.isInNodeModules()) continue;
    const callerRel = normalizeRel(projectDir, file.getFilePath());
    const callables = collectCallables(file);
    for (const callable of callables) {
      const caller = labelForCallable(callable);
      for (const call of callable.getDescendantsOfKind(SyntaxKind.CallExpression)) {
        if (enclosingCallable(call) !== callable) continue;
        const callee = calleeLabel(project, call);
        if (!callee || callee === caller) continue;
        edges.push({ caller, callee, callerRel });
        if (edges.length >= maxEdges) return edges;
      }
    }
  }
  return edges;
}

function dedupeEdges(edges: Edge[]): Edge[] {
  const seen = new Set<string>();
  const out: Edge[] = [];
  for (const e of edges) {
    const k = `${e.caller}\0${e.callee}\0${e.callerRel}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(e);
  }
  return out;
}

/** Text inside `id["…"]` node labels (Mermaid flowchart). */
function mermaidBracketLabel(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\]/g, "\\]");
}

/** Title string inside `subgraph id ["…"]`. */
function mermaidEscapeTitle(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function buildLabelToId(edges: Edge[]): Map<string, string> {
  const labels = new Set<string>();
  for (const e of edges) {
    labels.add(e.caller);
    labels.add(e.callee);
  }
  const sorted = [...labels].sort();
  const map = new Map<string, string>();
  sorted.forEach((label, i) => {
    map.set(label, `N${i}`);
  });
  return map;
}

function nodeRef(label: string, labelToId: Map<string, string>): string {
  const id = labelToId.get(label);
  if (id === undefined) throw new Error("internal: missing node id for label");
  return `${id}["${mermaidBracketLabel(label)}"]`;
}

function arrowLine(
  indent: string,
  a: string,
  b: string,
  labelToId: Map<string, string>,
): string {
  return `${indent}${nodeRef(a, labelToId)} --> ${nodeRef(b, labelToId)}`;
}

function renderFlatGraph(edges: Edge[], indent: string): string {
  const labelToId = buildLabelToId(edges);
  const lines: string[] = ["graph TD"];
  for (const e of edges) {
    lines.push(arrowLine(indent, e.caller, e.callee, labelToId));
  }
  return lines.join("\n");
}

function renderSubgraphGraph(edges: Edge[]): string {
  const labelToId = buildLabelToId(edges);
  const lines: string[] = ["graph TD"];
  const byRel = new Map<string, Edge[]>();
  for (const e of edges) {
    const list = byRel.get(e.callerRel) ?? [];
    list.push(e);
    byRel.set(e.callerRel, list);
  }

  let subIdx = 0;
  for (const [rel, list] of byRel) {
    let subId = rel.replace(/[^\w]+/g, "_");
    if (!/^[A-Za-z_]/.test(subId)) subId = `M_${subId}`;
    subId = `${subId}_${subIdx++}`;
    lines.push(`  subgraph ${subId} ["${mermaidEscapeTitle(rel)}"]`);
    for (const e of list) {
      lines.push(arrowLine("    ", e.caller, e.callee, labelToId));
    }
    lines.push("  end");
  }
  return lines.join("\n");
}

function moduleSlug(callerRel: string): string {
  return callerRel
    .replace(/\\/g, "__")
    .replace(/\//g, "__")
    .replace(/[^a-zA-Z0-9._-]+/g, "_");
}

function writeArchitecture(
  outDir: string,
  edges: Edge[],
  fullUsesFlat: boolean,
): string[] {
  const written: string[] = [];
  fs.mkdirSync(outDir, { recursive: true });

  const modulesDir = path.join(outDir, "modules");
  fs.mkdirSync(modulesDir, { recursive: true });

  const fullBody = fullUsesFlat ? renderFlatGraph(edges, "  ") : renderSubgraphGraph(edges);
  const fullPath = path.join(outDir, "full.mmd");
  fs.writeFileSync(fullPath, `${fullBody}\n`, "utf8");
  written.push(fullPath);

  if (!fullUsesFlat) {
    const flatPath = path.join(outDir, "full-flat.mmd");
    fs.writeFileSync(flatPath, `${renderFlatGraph(edges, "  ")}\n`, "utf8");
    written.push(flatPath);
  }

  const byRel = new Map<string, Edge[]>();
  for (const e of edges) {
    const list = byRel.get(e.callerRel) ?? [];
    list.push(e);
    byRel.set(e.callerRel, list);
  }

  const slugCounts = new Map<string, number>();
  for (const [rel, list] of byRel) {
    let slug = moduleSlug(rel);
    const n = (slugCounts.get(slug) ?? 0) + 1;
    slugCounts.set(slug, n);
    if (n > 1) slug = `${slug}__${n}`;
    const modPath = path.join(modulesDir, `${slug}.mmd`);
    const header = `%% Calls from ${rel}\n`;
    const body = renderFlatGraph(list, "  ");
    fs.writeFileSync(modPath, `${header}${body}\n`, "utf8");
    written.push(modPath);
  }

  return written;
}

function printHelp(): void {
  console.log(`ts-callgraph — Mermaid call graph from a TypeScript project (ts-morph).

Commands:
  (default)   Analyze the project and write .mmd files under the output directory
  view        Write a pan/zoom HTML viewer for one .mmd file (default: full.mmd)

Writes diagrams under the output directory (default: .context/architecture):
  full.mmd       — full project (subgraphs by source file, unless --flat)
  full-flat.mmd  — same edges as one flat graph (omitted if --flat, since full.mmd is flat)
  modules/*.mmd  — one diagram per source file that has outgoing call edges

Usage:
  ts-callgraph [options]
  ts-callgraph view [options]

Options (default command):
  -p, --tsconfig <path>   Path to tsconfig.json (default: ./tsconfig.json)
  -o, --out <dir>         Output directory (default: .context/architecture)
      --flat              full.mmd is a single flat graph (no subgraphs)
      --max-edges <n>     Stop after collecting n edges (default: 5000)
  -h, --help              Show this help

Run \`ts-callgraph view --help\` for the view subcommand.
`);
}

function parseArgs(argv: string[]): {
  tsConfig: string;
  outDir: string;
  flat: boolean;
  maxEdges: number;
  help: boolean;
} {
  const rest = argv.slice(2);
  let tsConfig = "tsconfig.json";
  let outDir = ".context/architecture";
  let flat = false;
  let maxEdges = 5000;
  let help = false;
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === "--help" || a === "-h") help = true;
    else if (a === "--flat") flat = true;
    else if (a === "--tsconfig" || a === "-p") {
      tsConfig = rest[++i] ?? tsConfig;
    } else if (a === "--out" || a === "-o") {
      outDir = rest[++i] ?? outDir;
    } else if (a === "--max-edges") {
      const n = Number(rest[++i]);
      if (Number.isFinite(n) && n > 0) maxEdges = n;
    }
  }
  return { tsConfig, outDir, flat, maxEdges, help };
}

export function main(argv: string[]): void {
  const args = argv.slice(2);
  if (args[0] === "view") {
    runView(args.slice(1));
    return;
  }
  if (args[0] === "help" && args[1] === "view") {
    printViewHelp();
    return;
  }

  const { tsConfig, outDir, flat, maxEdges, help } = parseArgs(argv);
  if (help) {
    printHelp();
    return;
  }

  const tsConfigPath = path.resolve(process.cwd(), tsConfig);
  const projectDir = path.dirname(tsConfigPath);
  const project = new Project({ tsConfigFilePath: tsConfigPath });
  const edges = dedupeEdges(collectEdges(project, projectDir, maxEdges));
  const outAbs = path.resolve(process.cwd(), outDir);
  const files = writeArchitecture(outAbs, edges, flat);
  console.log(`Wrote ${files.length} file(s) to ${outAbs}`);
  for (const f of files) console.log(`  ${f}`);
}

main(process.argv);
