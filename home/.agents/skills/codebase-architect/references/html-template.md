# HTML Template Reference

The template below is the base for the generated `architecture.html`.
Replace `/* DATA_PLACEHOLDER */` with the JSON from `analyze.py`.
All other `/* REPLACEABLE */` comments mark fields to substitute.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>/* REPO_NAME */ — Module Architecture</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js"></script>
<style>
  :root {
    --bg: #0f1117;
    --surface: #1a1d27;
    --border: #2a2d3a;
    --text: #e2e8f0;
    --text-muted: #8892a4;
    --accent: #7c6af7;
    --shallow: #e05252;
    --moderate: #e0a832;
    --deep: #32a88c;
    --very-deep: #32c85a;
    --unknown: #6b7280;
    --panel-w: 360px;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 12px;
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* ── Top bar ─────────────────────────── */
  #topbar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
    flex-shrink: 0;
  }

  #repo-title {
    font-size: 14px;
    font-weight: 700;
    color: var(--text);
    letter-spacing: 0.04em;
  }

  #breadcrumb {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 4px;
    color: var(--text-muted);
    overflow: hidden;
    white-space: nowrap;
  }

  .crumb {
    cursor: pointer;
    color: var(--accent);
    text-decoration: none;
  }
  .crumb:hover { text-decoration: underline; }
  .crumb-sep { color: var(--border); }
  .crumb-current { color: var(--text-muted); cursor: default; }

  #stats {
    font-size: 11px;
    color: var(--text-muted);
    white-space: nowrap;
  }

  /* ── Main layout ──────────────────────── */
  #main {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  /* ── Treemap canvas ───────────────────── */
  #treemap-container {
    flex: 1;
    position: relative;
    overflow: hidden;
  }

  #treemap-container svg {
    width: 100%;
    height: 100%;
  }

  /* Tile styles */
  .tile {
    cursor: pointer;
    transition: filter 0.15s;
  }
  .tile:hover { filter: brightness(1.25); }

  .tile-bg {
    stroke: var(--bg);
    stroke-width: 1.5;
    rx: 3;
  }

  /* Directories: no fill (avoids large empty grey regions); leaves keep depth colour */
  .tile-bg.tile-parent {
    fill: transparent;
    stroke: rgba(226, 232, 240, 0.14);
    stroke-width: 1;
  }

  .layer-under { pointer-events: auto; }
  .layer-over { pointer-events: none; }
  .layer-over .tile-header { pointer-events: auto; cursor: pointer; }

  .tile-header {
    fill: rgba(0,0,0,0.35);
    cursor: pointer;
  }
  .tile-header:hover { fill: rgba(0,0,0,0.55); }

  .tile-label {
    fill: #fff;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    font-weight: 600;
    pointer-events: none;
    dominant-baseline: middle;
    text-anchor: middle;
  }

  .tile-sublabel {
    fill: rgba(255,255,255,0.6);
    font-size: 9px;
    pointer-events: none;
    dominant-baseline: middle;
    text-anchor: middle;
  }

  .tile-header-label {
    fill: #fff;
    font-size: 10px;
    font-weight: 700;
    pointer-events: none;
    dominant-baseline: middle;
  }

  /* ── Side panel ───────────────────────── */
  #panel {
    width: var(--panel-w);
    background: var(--surface);
    border-left: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    transform: translateX(var(--panel-w));
    transition: transform 0.25s ease;
    overflow: hidden;
    flex-shrink: 0;
  }
  #panel.open {
    transform: translateX(0);
  }

  #panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
    background: var(--bg);
  }

  #panel-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--text);
  }

  #panel-close {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 18px;
    line-height: 1;
    padding: 2px 6px;
  }
  #panel-close:hover { color: var(--text); }

  #panel-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }

  .panel-section {
    margin-bottom: 20px;
  }

  .panel-section-title {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 8px;
    padding-bottom: 4px;
    border-bottom: 1px solid var(--border);
  }

  .panel-kv {
    display: grid;
    grid-template-columns: 100px 1fr;
    gap: 4px 8px;
    margin-bottom: 4px;
  }

  .panel-key {
    color: var(--text-muted);
    white-space: nowrap;
  }

  .panel-val {
    color: var(--text);
    word-break: break-all;
  }

  .symbol-list {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 4px;
  }

  .symbol-chip {
    background: rgba(124,106,247,0.15);
    border: 1px solid rgba(124,106,247,0.3);
    color: var(--accent);
    border-radius: 3px;
    padding: 2px 7px;
    font-size: 10px;
    font-family: inherit;
  }

  .depth-bar {
    display: flex;
    gap: 3px;
    margin-top: 4px;
  }
  .depth-pip {
    width: 14px;
    height: 14px;
    border-radius: 2px;
    background: var(--border);
  }
  .depth-pip.filled { background: var(--accent); }

  .depth-label-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-top: 6px;
  }

  .no-interface {
    color: var(--text-muted);
    font-style: italic;
    font-size: 11px;
  }

  /* ── Legend ───────────────────────────── */
  #legend {
    padding: 8px 16px;
    border-top: 1px solid var(--border);
    background: var(--surface);
    display: flex;
    align-items: center;
    gap: 16px;
    flex-shrink: 0;
    flex-wrap: wrap;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 10px;
    color: var(--text-muted);
  }

  .legend-swatch {
    width: 12px;
    height: 12px;
    border-radius: 2px;
    flex-shrink: 0;
  }

  .legend-sep {
    color: var(--border);
  }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
</style>
</head>
<body>

<div id="topbar">
  <span id="repo-title">/* REPO_NAME */</span>
  <nav id="breadcrumb"></nav>
  <span id="stats"></span>
</div>

<div id="main">
  <div id="treemap-container">
    <svg id="treemap"></svg>
  </div>

  <aside id="panel">
    <div id="panel-header">
      <span id="panel-title">Module Interface</span>
      <button id="panel-close">×</button>
    </div>
    <div id="panel-body"></div>
  </aside>
</div>

<footer id="legend">
  <span style="font-size:10px;color:var(--text-muted);font-weight:700;">DEPTH (leverage at interface):</span>
  <div class="legend-item"><div class="legend-swatch" style="background:#e05252"></div>Shallow — interface ≈ implementation</div>
  <div class="legend-item"><div class="legend-swatch" style="background:#e0a832"></div>Moderate</div>
  <div class="legend-item"><div class="legend-swatch" style="background:#32a88c"></div>Deep</div>
  <div class="legend-item"><div class="legend-swatch" style="background:#32c85a"></div>Very Deep — high leverage</div>
  <div class="legend-item"><div class="legend-swatch" style="background:#2a3142;border:1px solid #6b7280"></div>Unknown</div>
  <span class="legend-sep">|</span>
  <div class="legend-item" style="color:var(--text-muted)">Click <strong style="color:var(--text)">header</strong> → interface &nbsp; Click a <strong style="color:var(--text)">child tile</strong> → drill in &nbsp; <strong style="color:var(--text)">Alt+click header</strong> → zoom folder &nbsp; <strong style="color:var(--accent)">Breadcrumb</strong> → zoom out</div>
</footer>

<script>
// ── Data ─────────────────────────────────────────────────────────────────────
const ARCH = /* DATA_PLACEHOLDER */;

// ── Colour helpers ────────────────────────────────────────────────────────────
function depthColour(score) {
  /* Unknown: dark neutral so tiles do not read as huge empty grey panels */
  if (score < 0) return '#2a3142';
  if (score < 0.30) return '#e05252';
  if (score < 0.60) return '#e0a832';
  if (score < 0.80) return '#32a88c';
  return '#32c85a';
}

function depthPips(score) {
  const n = score < 0 ? 0 : Math.round(score * 5);
  return Array.from({ length: 5 }, (_, i) =>
    `<div class="depth-pip ${i < n ? 'filled' : ''}"></div>`
  ).join('');
}

function depthBadgeStyle(label) {
  const map = {
    shallow:   'background:#e05252;color:#fff',
    moderate:  'background:#e0a832;color:#000',
    deep:      'background:#32a88c;color:#fff',
    'very-deep': 'background:#32c85a;color:#000',
    unknown:   'background:#6b7280;color:#fff',
  };
  return map[label] || map.unknown;
}

// ── Treemap ───────────────────────────────────────────────────────────────────
const svg = d3.select('#treemap');
let currentRoot = null;
let ancestorStack = [];

function sizeOf(d) {
  return d.loc > 0 ? d.loc : (d.size || 1);
}

function flatLeaves(node) {
  // Treat directories with children as groups; files as leaves
  if (!node.children || node.children.length === 0) return [node];
  return node.children.flatMap(flatLeaves);
}

function render(node) {
  currentRoot = node;

  const container = document.getElementById('treemap-container');
  const W = container.clientWidth;
  const H = container.clientHeight;

  svg.attr('viewBox', `0 0 ${W} ${H}`).selectAll('*').remove();

  // Build d3 hierarchy
  const hier = d3.hierarchy(node, d => d.children && d.children.length ? d.children : null)
    .sum(d => (!d.children || d.children.length === 0) ? sizeOf(d) : 0)
    .sort((a, b) => b.value - a.value);

  const HEADER_H = 26;
  const MIN_LABEL_W = 40;
  const MIN_LABEL_H = 30;

  d3.treemap()
    .size([W, H])
    .paddingOuter(6)
    .paddingTop(HEADER_H)
    .paddingInner(2)
    .round(true)(hier);

  const tw = d => d.x1 - d.x0;
  const th = d => d.y1 - d.y0;

  const hasKids = d => d.data.children && d.data.children.length > 0;

  const under = svg.append('g').attr('class', 'layer-under');
  const over = svg.append('g').attr('class', 'layer-over');

  const tiles = hier.descendants().filter(d => d.depth > 0);
  /* Large tiles first (underneath) so smaller modules paint on top for clearer edges and clicks */
  const tilesPaintOrder = tiles.slice().sort((a, b) => {
    const aa = (a.x1 - a.x0) * (a.y1 - a.y0);
    const bb = (b.x1 - b.x0) * (b.y1 - b.y0);
    return bb - aa;
  });

  const underG = under.selectAll('g.tile-under')
    .data(tilesPaintOrder)
    .enter()
    .append('g')
    .attr('class', 'tile tile-under')
    .attr('transform', d => `translate(${d.x0},${d.y0})`);

  underG.append('rect')
    .attr('class', d => (hasKids(d) ? 'tile-bg tile-parent' : 'tile-bg'))
    .attr('width', tw)
    .attr('height', th)
    .attr('fill', d => (hasKids(d) ? 'transparent' : depthColour(d.data.depth_score)))
    .on('click', (event, d) => {
      event.stopPropagation();
      if (!hasKids(d)) return;
      ancestorStack.push(currentRoot);
      render(d.data);
      updateBreadcrumb();
    });

  function onHeaderClick(event, d) {
    event.stopPropagation();
    if (event.altKey && hasKids(d)) {
      ancestorStack.push(currentRoot);
      render(d.data);
      updateBreadcrumb();
      return;
    }
    showPanel(d.data);
  }

  const chromeG = over.selectAll('g.tile-chrome')
    .data(tilesPaintOrder)
    .enter()
    .append('g')
    .attr('class', 'tile-chrome')
    .attr('transform', d => `translate(${d.x0},${d.y0})`);

  chromeG.filter(d => tw(d) > 20 && th(d) > HEADER_H)
    .append('rect')
    .attr('class', 'tile-header')
    .attr('width', tw)
    .attr('height', HEADER_H)
    .on('click', onHeaderClick);

  chromeG.filter(d => tw(d) > MIN_LABEL_W && th(d) > HEADER_H)
    .append('text')
    .attr('class', 'tile-header-label')
    .attr('x', 6)
    .attr('y', HEADER_H / 2)
    .attr('dominant-baseline', 'middle')
    .text(d => {
      const maxChars = Math.floor(tw(d) / 7);
      const name = d.data.name;
      return name.length > maxChars ? name.slice(0, maxChars - 1) + '…' : name;
    });

  /* Centered body labels only on leaves so titles are not ghosted under child tiles */
  const leafChrome = chromeG.filter(d => !hasKids(d));

  leafChrome.filter(d => tw(d) > MIN_LABEL_W && th(d) > MIN_LABEL_H + HEADER_H)
    .append('text')
    .attr('class', 'tile-label')
    .attr('x', d => tw(d) / 2)
    .attr('y', d => HEADER_H + (th(d) - HEADER_H) / 2 - 6)
    .text(d => {
      if (tw(d) < 60) return '';
      const maxChars = Math.floor(tw(d) / 7);
      const name = d.data.name;
      return name.length > maxChars ? name.slice(0, maxChars - 1) + '…' : name;
    });

  leafChrome.filter(d => tw(d) > MIN_LABEL_W && th(d) > MIN_LABEL_H + HEADER_H)
    .append('text')
    .attr('class', 'tile-sublabel')
    .attr('x', d => tw(d) / 2)
    .attr('y', d => HEADER_H + (th(d) - HEADER_H) / 2 + 8)
    .text(d => {
      if (tw(d) < 60) return '';
      const loc = d.data.loc;
      const sz = d.data.size;
      if (loc > 0) return `${loc.toLocaleString()} loc`;
      if (sz > 0) return `${(sz / 1024).toFixed(1)} kb`;
      return '';
    });

  // Stats bar
  const totalLoc = (ARCH.summary && ARCH.summary.total_loc) || sizeOf(node);
  document.getElementById('stats').textContent =
    `${(node.loc || node.size || 0).toLocaleString()} loc  ·  ${(node.children || []).length} direct modules`;
}

// ── Breadcrumb ────────────────────────────────────────────────────────────────
function updateBreadcrumb() {
  const bc = document.getElementById('breadcrumb');
  bc.innerHTML = '';

  const all = [...ancestorStack, currentRoot];
  all.forEach((node, i) => {
    if (i > 0) {
      const sep = document.createElement('span');
      sep.className = 'crumb-sep';
      sep.textContent = ' › ';
      bc.appendChild(sep);
    }
    if (i < all.length - 1) {
      const a = document.createElement('span');
      a.className = 'crumb';
      a.textContent = node.name;
      a.addEventListener('click', () => {
        ancestorStack = ancestorStack.slice(0, i);
        render(node);
        updateBreadcrumb();
        closePanel();
      });
      bc.appendChild(a);
    } else {
      const span = document.createElement('span');
      span.className = 'crumb-current';
      span.textContent = node.name;
      bc.appendChild(span);
    }
  });
}

// ── Interface panel ───────────────────────────────────────────────────────────
function buildLangExtrasPanel(node) {
  const lang = node.language;
  const sections = [];

  // ── TypeScript / JavaScript extras ──────────────────────────────────────────
  if (lang === 'typescript' || lang === 'javascript') {
    const decorators = node.decorators || [];
    const adapterCount = node.adapter_count || 0;
    if (decorators.length > 0) {
      sections.push(`
        <div class="panel-section">
          <div class="panel-section-title">Decorators (Seam Markers)</div>
          <div class="symbol-list">
            ${decorators.map(d => `<span class="symbol-chip" style="background:rgba(224,168,50,.15);border-color:rgba(224,168,50,.4);color:#e0a832">@${d}</span>`).join('')}
          </div>
          ${adapterCount > 0
            ? `<p style="margin-top:6px;color:var(--text-muted);font-size:10px">
                ${adapterCount} framework adapter decorator${adapterCount > 1 ? 's' : ''} detected —
                this module sits at a <strong style="color:var(--text)">seam</strong> and delegates to an implementation behind it.
               </p>`
            : ''}
        </div>`);
    }
  }

  // ── C# extras ───────────────────────────────────────────────────────────────
  if (lang === 'csharp') {
    const namespaces = node.namespaces || [];
    const attributes = node.attributes || [];
    const adapterCount = node.adapter_count || 0;
    const injectedDeps = node.injected_deps || [];

    if (namespaces.length > 0) {
      sections.push(`
        <div class="panel-section">
          <div class="panel-section-title">Namespace</div>
          ${namespaces.map(ns => `<div class="panel-kv"><span class="panel-key">namespace</span><span class="panel-val" style="font-family:monospace">${ns}</span></div>`).join('')}
        </div>`);
    }

    if (attributes.length > 0) {
      const adapterAttrs = attributes.filter(a =>
        /ApiController|HttpGet|HttpPost|HttpPut|HttpDelete|HttpPatch|Route|Authorize|FunctionName|HttpTrigger|GrpcService|GraphQL/i.test(a)
      );
      const otherAttrs = attributes.filter(a => !adapterAttrs.includes(a));
      sections.push(`
        <div class="panel-section">
          <div class="panel-section-title">Attributes (Seam Markers)</div>
          ${adapterAttrs.length ? `<div class="symbol-list" style="margin-bottom:6px">
            ${adapterAttrs.map(a => `<span class="symbol-chip" style="background:rgba(224,168,50,.15);border-color:rgba(224,168,50,.4);color:#e0a832">[${a}]</span>`).join('')}
          </div>` : ''}
          ${otherAttrs.length ? `<div class="symbol-list">
            ${otherAttrs.map(a => `<span class="symbol-chip">[${a}]</span>`).join('')}
          </div>` : ''}
          ${adapterCount > 0
            ? `<p style="margin-top:6px;color:var(--text-muted);font-size:10px">
                This type acts as an <strong style="color:var(--text)">adapter</strong> at a framework seam
                (HTTP, messaging, or serverless). It satisfies the framework's interface and delegates to the domain.
               </p>`
            : ''}
        </div>`);
    }

    if (injectedDeps.length > 0) {
      sections.push(`
        <div class="panel-section">
          <div class="panel-section-title">Constructor Injection (Dependencies)</div>
          <div class="symbol-list">
            ${injectedDeps.map(d => `<span class="symbol-chip" style="background:rgba(50,200,90,.1);border-color:rgba(50,200,90,.3);color:#32c85a">${d}</span>`).join('')}
          </div>
          <p style="margin-top:6px;color:var(--text-muted);font-size:10px">
            ${injectedDeps.length} injected interface${injectedDeps.length > 1 ? 's' : ''} — each is a
            <strong style="color:var(--text)">seam</strong> where the implementation can vary.
          </p>
        </div>`);
    }
  }

  return sections.join('\n');
}

function showPanel(node) {
  const panel = document.getElementById('panel');
  const body = document.getElementById('panel-body');
  document.getElementById('panel-title').textContent = node.name;

  const iface = node.interface || {};
  const exports = iface.exports || [];
  const types = iface.types || [];
  const reExports = iface.re_exports || [];
  const hasInterface = exports.length > 0 || types.length > 0;

  const depthScore = node.depth_score != null ? node.depth_score : -1;
  const depthLbl = node.depth_label || 'unknown';
  const depthRationale = node.depth_rationale || '';
  const importerCount = node.importer_count || 0;
  const directImports = (node.imports || []).length;

  body.innerHTML = `
    <div class="panel-section">
      <div class="panel-section-title">Module</div>
      <div class="panel-kv"><span class="panel-key">Name</span><span class="panel-val">${node.name}</span></div>
      <div class="panel-kv"><span class="panel-key">Path</span><span class="panel-val">${node.path || '—'}</span></div>
      <div class="panel-kv"><span class="panel-key">Type</span><span class="panel-val">${node.module_type || 'file'}</span></div>
      <div class="panel-kv"><span class="panel-key">Language</span><span class="panel-val">${node.language || 'unknown'}</span></div>
      <div class="panel-kv"><span class="panel-key">LOC</span><span class="panel-val">${(node.loc || 0).toLocaleString()}</span></div>
      <div class="panel-kv"><span class="panel-key">Size</span><span class="panel-val">${((node.size || 0) / 1024).toFixed(1)} kb</span></div>
    </div>

    <div class="panel-section">
      <div class="panel-section-title">Depth (Leverage at Interface)</div>
      <div class="depth-bar">${depthPips(depthScore)}</div>
      <div class="depth-label-badge" style="${depthBadgeStyle(depthLbl)}">${depthLbl}${depthScore >= 0 ? ' · ' + (depthScore * 100).toFixed(0) + '%' : ''}</div>
      ${depthRationale ? `<p style="margin-top:8px;color:var(--text-muted);font-size:10px;line-height:1.5">${depthRationale}</p>` : ''}
    </div>

    <div class="panel-section">
      <div class="panel-section-title">Interface (what callers must know)</div>
      ${hasInterface ? `
        ${exports.length ? `
          <div style="margin-bottom:8px">
            <div style="color:var(--text-muted);font-size:10px;margin-bottom:4px">Exports</div>
            <div class="symbol-list">${exports.map(e => `<span class="symbol-chip">${e}</span>`).join('')}</div>
          </div>` : ''}
        ${types.length ? `
          <div style="margin-bottom:8px">
            <div style="color:var(--text-muted);font-size:10px;margin-bottom:4px">Types / Interfaces</div>
            <div class="symbol-list">${types.map(t => `<span class="symbol-chip">${t}</span>`).join('')}</div>
          </div>` : ''}
        ${reExports.length ? `
          <div>
            <div style="color:var(--text-muted);font-size:10px;margin-bottom:4px">Re-exports</div>
            <div class="symbol-list">${reExports.map(r => `<span class="symbol-chip">${r}</span>`).join('')}</div>
          </div>` : ''}
      ` : '<p class="no-interface">No interface data — non-source file or unparsed language</p>'}
    </div>

    <div class="panel-section">
      <div class="panel-section-title">Seam Indicators</div>
      <div class="panel-kv"><span class="panel-key">Direct deps</span><span class="panel-val">${directImports}</span></div>
      <div class="panel-kv"><span class="panel-key">Importers</span><span class="panel-val">${importerCount} module${importerCount !== 1 ? 's' : ''} depend on this</span></div>
      ${node.is_test ? '<div style="color:var(--text-muted);font-size:10px;margin-top:4px">⚗ Test file</div>' : ''}
      ${node.is_generated ? '<div style="color:var(--text-muted);font-size:10px;margin-top:4px">⚙ Generated file</div>' : ''}
    </div>

    ${buildLangExtrasPanel(node)}
  `;

  panel.classList.add('open');
}

function closePanel() {
  document.getElementById('panel').classList.remove('open');
}

document.getElementById('panel-close').addEventListener('click', closePanel);

// ── Bootstrap ─────────────────────────────────────────────────────────────────
document.getElementById('repo-title').textContent = ARCH.root.name;

window.addEventListener('resize', () => { render(currentRoot); });

render(ARCH.root);
updateBreadcrumb();
</script>
</body>
</html>
```

## How to embed data

In your Python generation code (or inline in the skill workflow):

```python
import json, re

with open('/tmp/arch_data.json') as f:
    data = json.load(f)

with open('references/html-template.md') as f:
    template_raw = f.read()

# Extract just the HTML between the first ``` and last ```
html = re.search(r'```html\n(.+?)```', template_raw, re.DOTALL).group(1)

json_str = json.dumps(data, separators=(',', ':'))
html = html.replace('/* DATA_PLACEHOLDER */', json_str)
html = html.replace('/* REPO_NAME */', data['root']['name'])

with open('/mnt/user-data/outputs/architecture.html', 'w') as f:
    f.write(html)
```
