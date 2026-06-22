---
name: docsify
description: Scaffolds and serves a docsify documentation site over a repo's markdown docs without a build step. Use when the user wants a docsify site, a docs site for a docs/ folder, to serve or preview markdown as a website, or mentions docsify, _sidebar.md, or _coverpage.md.
---

# Docsify

Docsify turns a folder of markdown into a documentation website at runtime. No build, no generated HTML. A single `index.html` loads docsify from a CDN, fetches the markdown over HTTP, and renders it client side.

## When to use

- A repo has a `docs/` folder of markdown (ADRs, RFCs, primers, playbooks, runbooks) and the user wants it browsable as a site.
- The user wants a zero-build alternative to mkdocs or a static site generator.
- The user asks to preview or serve markdown locally.

## Conventions

Serve docs from the repo's existing `docs/` directory. Keep the home page as `docs/README.md`. Organize by Diataxis (tutorials, how-to, reference, explanation) when the content fits. Do not move or rewrite existing markdown to fit docsify, only add the docsify files alongside it.

## Scaffold

Create these files inside `docs/`.

1. `docs/index.html` (the entry point):

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>Docs</title>
    <link rel="stylesheet" href="//cdn.jsdelivr.net/npm/docsify@5/dist/themes/core.min.css" />
  </head>
  <body class="loading">
    <div id="app"></div>
    <script>
      window.$docsify = {
        name: "Docs",
        loadSidebar: true,
        loadNavbar: true,
        subMaxLevel: 2,
        auto2top: true,
        relativePath: true,
        search: "auto",
      };
    </script>
    <script src="//cdn.jsdelivr.net/npm/docsify@5"></script>
    <script src="//cdn.jsdelivr.net/npm/docsify@5/dist/plugins/search.min.js"></script>
    <script src="//cdn.jsdelivr.net/npm/docsify-copy-code/dist/docsify-copy-code.min.js"></script>
  </body>
</html>
```

2. `docs/.nojekyll` (empty file, stops GitHub Pages ignoring files that start with `_`).

3. `docs/_sidebar.md` (navigation, requires `loadSidebar: true`):

```markdown
- [Home](README.md)
- Reference
  - [Some ADR](ADR-073-example.md)
- Explanation
  - [JWT primer](auth-session-jwt-primer.md)
```

4. `docs/_navbar.md` (top bar, optional, requires `loadNavbar: true`):

```markdown
- [Home](/)
- [GitHub](https://github.com/owner/repo)
```

Build `_sidebar.md` from the actual markdown files in `docs/`. Use relative paths from `docs/`. With `relativePath: true`, nested folders can have their own `_sidebar.md`.

## Serve and preview

Prefer running without a global install:

```bash
npx docsify-cli serve docs
```

Site is at `http://localhost:3000`. If `npx` is unavailable, any static server works since there is no build step:

```bash
python3 -m http.server 3000 --directory docs
```

To scaffold from scratch instead of by hand, `npx docsify-cli init ./docs` creates `index.html`, `README.md`, and `.nojekyll`.

## Common config

Set these in the `window.$docsify` object as needed:

- `loadSidebar` / `loadNavbar` - load `_sidebar.md` / `_navbar.md`.
- `subMaxLevel` - heading depth pulled into the sidebar (2 is a good default).
- `coverpage: true` - render a `_coverpage.md` landing page.
- `homepage: "intro.md"` - use a file other than `README.md` as home.
- `alias` - map paths, e.g. reuse one sidebar everywhere: `alias: { "/.*/_sidebar.md": "/_sidebar.md" }`.
- `relativePath: true` - resolve links relative to the current file.
- `themeColor` or swap the theme CSS (`core`, `vue`, `dark`) for styling.

## Plugins

Add a `<script>` tag for each. Common ones:

- Full text search - `dist/plugins/search.min.js` with `search: "auto"`.
- Copy code button - `docsify-copy-code/dist/docsify-copy-code.min.js`.
- Pagination - `docsify-pagination/dist/docsify-pagination.min.js`.
- Tabs - `docsify-tabs`.

For Mermaid, GitHub-style alerts, or other diagrams, pull the matching docsify plugin from jsDelivr and add its script tag.

## Notes

- Pin a major version (`@5`) in CDN URLs so the site gets fixes but not breaking changes. Use a full version (`@5.0.0`) only if reproducibility matters more.
- Docsify renders client side, so links must be relative markdown paths, not pre-rendered HTML.
- Anchor ids come from headings, e.g. `#/page?id=section-heading`.
