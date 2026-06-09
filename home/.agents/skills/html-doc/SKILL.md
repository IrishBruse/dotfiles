---
name: html-doc
description: Create polished standalone HTML documentation pages with a shared dark-mode stylesheet. Use when the user asks for an HTML doc or other readable single-page HTML artifact.
---

# HTML Doc

Create standalone HTML documentation pages that are readable, polished, and easy to share.

## Quick Start

1. Read the user's source material and identify the audience, purpose, and main sections.
2. Use the shared stylesheet in `references/html-doc.css`.
3. Create semantic HTML with one clear `<header>`, a `<main>` containing focused `<section>` blocks, and an optional `<footer>`.
4. Keep the page generic unless the user asks for a branded or domain-specific variant.

## Required HTML Pattern

Use this structure as the default:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Document Title</title>
  <link rel="stylesheet" href="path/to/references/html-doc.css">
</head>
<body>
  <div class="doc-shell">
    <header class="hero">
      <p class="eyebrow">Category</p>
      <h1>Document Title</h1>
      <p class="lead">Short summary of the document's value.</p>
      <div class="meta">
        <span class="badge">Audience</span>
        <span class="badge">Status</span>
      </div>
    </header>

    <main>
      <section class="card">
        <h2>Section Title</h2>
        <p>Section content.</p>
      </section>
    </main>
  </div>
</body>
</html>
```

Set the `href` relative to the output file. For an example file in `examples/`, use `../references/html-doc.css`.

## Content Guidelines

- Prefer direct explanatory headings: Overview, Workflow, Inputs, Outputs, Decision Points, Examples, Risks, Next Steps.
- Use `.card` for major sections and `.subtle-card` for nested details.
- Use `.flow` and `.flow-step` for ordered processes.
- Use `.grid`, `.grid.two`, or `.grid.three` for comparison cards.
- Use `.callout`, `.callout.warning`, `.callout.success`, or `.callout.danger` for important notes.
- Use semantic tables for matrices and `pre` blocks for file trees or command snippets.
- Use inline Mermaid diagrams when a workflow, dependency map, sequence, state machine, or architecture relationship is clearer as a diagram.
- Keep copy concise. The page should explain the topic, not decorate it with filler.

## Mermaid Diagrams

When Mermaid is useful, add this script at the end of  `<head>`:

```html
<script defer type="module">
  import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs";

  mermaid.initialize({
    startOnLoad: true,
    theme: "dark",
    themeVariables: {
      background: "#182131",
      primaryColor: "#202c40",
      primaryTextColor: "#e8eef7",
      primaryBorderColor: "#6aa7d8",
      lineColor: "#6aa7d8",
      secondaryColor: "#141c2a",
      tertiaryColor: "#0d121a",
      fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    }
  });
</script>
```

Write inline diagrams like this:

```html
<section class="card">
  <h2>System Flow</h2>
  <pre class="mermaid">
    flowchart LR
      A[Input] --> B[Process]
      B --> C[Output]
  </pre>
</section>
```

Use simple labels, short node names, and semantic diagram types. Prefer `flowchart`, `sequenceDiagram`, `stateDiagram-v2`, and `classDiagram` unless another Mermaid type is a better fit.

## Quality Bar

- The document should work as a static file without JavaScript unless Mermaid diagrams are requested or clearly useful.
- Mermaid diagrams require JavaScript and network access when loaded from the CDN. If offline use is required, bundle Mermaid locally and update the import path.
- The HTML must be accessible: meaningful headings, descriptive links, table headers, and no color-only meaning.
- Each Mermaid diagram must have a nearby heading or paragraph explaining what it shows.
- The CSS should stay in `references/html-doc.css`; do not inline page-specific CSS unless the user explicitly asks.
- Do not mention this skill's visual inspirations or any source examples in generated documents.
