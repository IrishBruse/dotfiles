import { spawn } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);

function readMermaidBundle(): string {
  const bundlePath = require.resolve("mermaid/dist/mermaid.min.js");
  return fs.readFileSync(bundlePath, "utf8");
}

/** Avoid breaking out of `<script>` if the bundle ever contains `</script>`. */
function escapeEmbeddedScript(s: string): string {
  return s.replace(/<\/script>/gi, "<\\/script>");
}

function parseViewArgs(argv: string[]): {
  file: string;
  out: string;
  help: boolean;
  openBrowser: boolean;
} {
  let file = path.join(".context", "architecture", "full.mmd");
  let out = "";
  let help = false;
  let openBrowser = true;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") help = true;
    else if (a === "--file" || a === "-f") {
      file = argv[++i] ?? file;
    } else if (a === "--out" || a === "-o") {
      out = argv[++i] ?? out;
    } else if (a === "--no-open") {
      openBrowser = false;
    }
  }
  const fileAbs = path.resolve(process.cwd(), file);
  const stem = path.basename(fileAbs, path.extname(fileAbs));
  const outAbs = out
    ? path.resolve(process.cwd(), out)
    : path.join(path.dirname(fileAbs), `${stem}-view.html`);
  return { file: fileAbs, out: outAbs, help, openBrowser };
}

export function printViewHelp(): void {
  console.log(`ts-callgraph view — open a .mmd file in the browser (pan, zoom, reset).

Reads a Mermaid file and writes a self-contained HTML viewer next to it by default,
then opens it in your default browser (use --no-open to skip).

Usage:
  ts-callgraph view [options]

Options:
  -f, --file <path>   Input .mmd (default: .context/architecture/full.mmd)
  -o, --out <path>    Output .html (default: <input-dir>/<stem>-view.html)
      --no-open       Do not launch a browser after writing the file
  -h, --help          Show this help
`);
}

/** Strip optional markdown code fence so pasted .md works as .mmd. */
export function normalizeMermaidSource(raw: string): string {
  let t = raw.trim();
  const fence = /^```(?:mermaid)?\s*\r?\n([\s\S]*?)\r?\n```\s*$/i;
  const m = t.match(fence);
  if (m) return m[1]!.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:mermaid)?\s*\r?\n?/i, "");
    t = t.replace(/\r?\n?```\s*$/i, "");
  }
  return t.trim();
}

function openInDefaultBrowser(htmlPath: string): void {
  const url = pathToFileURL(path.resolve(htmlPath)).href;
  const opts = { detached: true, stdio: "ignore" as const };
  let child: ReturnType<typeof spawn> | undefined;
  if (process.platform === "darwin") {
    child = spawn("open", [url], opts);
  } else if (process.platform === "win32") {
    child = spawn("cmd", ["/c", "start", "", url], { ...opts, shell: false });
  } else {
    child = spawn("xdg-open", [url], opts);
  }
  child.unref();
}

export function runView(argv: string[]): void {
  const { file, out, help, openBrowser } = parseViewArgs(argv);
  if (help) {
    printViewHelp();
    return;
  }

  let source: string;
  try {
    source = fs.readFileSync(file, "utf8");
  } catch {
    console.error(`Cannot read diagram file: ${file}`);
    process.exitCode = 1;
    return;
  }

  source = normalizeMermaidSource(source);
  const html = buildViewerHtml(source, path.basename(file));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html, "utf8");
  console.log(`Wrote ${out}`);
  if (openBrowser) {
    openInDefaultBrowser(out);
    console.log("Opened in browser");
  }
}

function buildViewerHtml(mermaidSource: string, title: string): string {
  const embeddedSource = JSON.stringify(mermaidSource);
  const mermaidBundle = escapeEmbeddedScript(readMermaidBundle());

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${escapeHtml(title)} — ts-callgraph</title>
  <style>
    html, body { margin: 0; height: 100%; overflow: hidden; font-family: system-ui, sans-serif; }
    body { display: flex; flex-direction: column; height: 100vh; background: #0d1117; color: #c9d1d9; }
    #toolbar {
      padding: 8px 12px; flex-shrink: 0; display: flex; gap: 14px; align-items: center; flex-wrap: wrap;
      border-bottom: 1px solid #30363d; font-size: 13px;
    }
    #toolbar button {
      cursor: pointer; padding: 6px 12px; border-radius: 6px;
      border: 1px solid #30363d; background: #21262d; color: #c9d1d9; font: inherit;
    }
    #toolbar button:hover { background: #30363d; }
    #hint { opacity: 0.85; }
    #err { color: #f85149; flex: 1; min-width: 200px; }
    #viewport {
      flex: 1; position: relative; overflow: hidden; background: #161b22;
      cursor: grab; touch-action: none;
    }
    #viewport:active { cursor: grabbing; }
    #stage { position: absolute; left: 0; top: 0; transform-origin: 0 0; }
    #stage svg { display: block; max-width: none !important; }
  </style>
</head>
<body>
  <div id="toolbar">
    <span id="hint">Drag to pan · Wheel to zoom · Double-click or Reset to fit</span>
    <button type="button" id="reset">Reset view</button>
    <span id="err"></span>
  </div>
  <div id="viewport"><div id="stage"></div></div>

  <script>
    ${mermaidBundle}
  </script>

  <script>
    const SOURCE = ${embeddedSource};

    async function run() {
      const stage = document.getElementById("stage");
      const viewport = document.getElementById("viewport");
      const errEl = document.getElementById("err");

      try {
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "loose",
          theme: "dark",
          flowchart: { htmlLabels: true, curve: "basis" },
        });

        const rid = "mermaid-" + Math.random().toString(36).slice(2, 11);
        const result = await mermaid.render(rid, SOURCE);
        stage.innerHTML = result.svg;

        setupPanZoom(stage, viewport);
      } catch (e) {
        errEl.textContent = e?.message || String(e);
        console.error(e);
      }
    }

    /* ---- simple pan/zoom ---- */
    function setupPanZoom(stage, viewport) {
      let scale = 1, x = 0, y = 0;
      const setTransform = () =>
        stage.style.transform = \`translate(\${x}px,\${y}px) scale(\${scale})\`;

      viewport.addEventListener('wheel', e => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        scale = Math.min(Math.max(scale * delta, 0.2), 5);
        setTransform();
      });

      let dragging = false, startX, startY;
      viewport.addEventListener('mousedown', e => { dragging = true; startX = e.clientX - x; startY = e.clientY - y; });
      window.addEventListener('mousemove', e => {
        if (!dragging) return;
        x = e.clientX - startX; y = e.clientY - startY;
        setTransform();
      });
      window.addEventListener('mouseup', () => dragging = false);

      document.getElementById('reset').addEventListener('click', () => {
        scale = 1; x = 0; y = 0; setTransform();
      });

      setTransform();
    }

    run();
  </script>
</body>
</html>
`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
