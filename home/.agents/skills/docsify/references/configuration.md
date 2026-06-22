# Configuration

## index.html setup

The single entry point.
It loads docsify and plugins from a CDN and holds all config.
Place it next to the markdown (e.g. `docs/index.html`).

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

Also add an empty `.nojekyll` next to it so GitHub Pages serves files starting with `_`.
To scaffold the basics, run `npx docsify-cli init ./docs`.

Pin a major version (`@5`) in CDN URLs for fixes without breaking changes.
Use a full version (`@5.0.0`) only when reproducibility matters more.

## Options

Set options on `window.$docsify`.
It can also be a function `(vm) => ({...})` when you need the docsify instance.

```js
window.$docsify = {
  name: "Docs",
  repo: "owner/repo",
  loadSidebar: true,
  loadNavbar: true,
  subMaxLevel: 2,
};
```

## Common options

| Option | Type | Default | Purpose |
| --- | --- | --- | --- |
| `name` | Boolean / String | - | Site name in the sidebar. `true` infers from `<title>`. Accepts HTML. |
| `nameLink` | String / Object | pathname | URL the name links to. |
| `logo` | String | - | Logo image in the sidebar. Only shows when `name` is set. |
| `repo` | String | - | `owner/repo` or full URL. Adds the GitHub corner widget. |
| `homepage` | String | `README.md` | File used as the home page. |
| `loadSidebar` | Boolean / String | `false` | Load `_sidebar.md` (or the named file). |
| `loadNavbar` | Boolean / String | `false` | Load `_navbar.md` (or the named file). |
| `subMaxLevel` | Number | `0` | Heading depth pulled into a custom sidebar TOC. |
| `maxLevel` | Number | `6` | Max TOC level. |
| `autoHeader` | Boolean | `false` | Prepend an H1 per sidebar link when missing. With `loadSidebar`. |
| `auto2top` | Boolean | `false` | Scroll to top on route change. |
| `coverpage` | Boolean / String / Array / Object | `false` | Load `_coverpage.md`. |
| `onlyCover` | Boolean | `false` | Show only the cover on the home route. |
| `mergeNavbar` | Boolean | `false` | Merge navbar into sidebar on small screens. |
| `hideSidebar` | Boolean | `false` | Hide the sidebar entirely. |
| `relativePath` | Boolean | `false` | Resolve links relative to the current file. |
| `alias` | Object | - | Route aliases (RegExp supported). Order matters. |
| `notFoundPage` | Boolean / String / Object | `false` | Load `_404.md` (or named/localized file). |
| `ext` | String | `.md` | Request file extension. |
| `basePath` | String | - | Base path. Can point to another dir, domain, or raw repo URL. |
| `routerMode` | String | `hash` | `hash` or `history`. See below. |
| `routes` | Object | - | Virtual routes mapping paths to markdown strings or functions. |
| `externalLinkTarget` | String | `_blank` | Target for external links. |
| `externalLinkRel` | String | `noopener` | `rel` for external `_blank` links. |
| `requestHeaders` | Object | - | Headers added to file requests, e.g. cache-control. |
| `keyBindings` | Boolean / Object | - | Custom or disabled keyboard shortcuts. |
| `skipLink` | Boolean / String / Object | "Skip to main content" | Accessibility skip-nav link. |
| `markdown` | Object / Function | - | Customize the marked parser. See `markdown-helpers.md`. |

## routerMode

- `hash` (default): URLs look like `https://site/#/path/to/page`.
  The server only ever loads `index.html`, which is simplest for static hosts like GitHub Pages.
- `history`: clean URLs like `https://site/path/to/page`.
  Better for SEO, but the host must rewrite all requests to `index.html`.

In `history` mode, add aliases so the nav files load on every path:

```js
window.$docsify = {
  routerMode: "history",
  alias: {
    "/.*/_sidebar.md": "/_sidebar.md",
    "/.*/_navbar.md": "/_navbar.md",
  },
};
```

## Virtual routes

Map a path to a markdown string or a function returning markdown.
Declare specific routes before broad ones.
Return `false` to fall through to a real file, or a falsy value to ignore the request.

```js
window.$docsify = {
  routes: {
    "/foo": "# Custom Markdown",
    "/bar/(.*)"(route, matched) {
      return "# Generated for " + matched[0];
    },
  },
};
```
