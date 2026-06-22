# Sidebar and table of contents

## Enable

Set `loadSidebar: true` and create `docs/_sidebar.md`. Add an empty `docs/.nojekyll` so GitHub Pages does not ignore files starting with `_`.

```js
window.$docsify = { loadSidebar: true };
```

## Routes

Files map to routes by path:

```text
docs/README.md        => /
docs/guide.md         => /#/guide
docs/zh-cn/README.md  => /#/zh-cn/
docs/zh-cn/guide.md   => /#/zh-cn/guide
```

## Basic sidebar

```markdown
<!-- docs/_sidebar.md -->
- [Home](/)
- [Page 1](page-1.md)
```

## Section headers

```markdown
- Section Header 1
  - [Home](/)
  - [Page 1](page-1.md)

- Section Header 2
  - [Page 2](page-2.md)
  - [Page 3](page-3.md)
```

## Nested sidebars

Docsify loads `_sidebar.md` from the current folder, falling back to the parent. Add a `_sidebar.md` per folder to make the sidebar reflect the current directory. Set `relativePath: true` so links resolve correctly. To force one shared sidebar everywhere, use `alias`:

```js
window.$docsify = {
  loadSidebar: true,
  alias: { "/.*/_sidebar.md": "/_sidebar.md" },
};
```

A `README.md` in a subdirectory becomes that route's landing page.

## Table of contents

With a custom sidebar, set `subMaxLevel` to auto-generate a TOC from page headings (1 to 6).

```js
window.$docsify = { loadSidebar: true, subMaxLevel: 2 };
```

## Ignore headers in the TOC

```markdown
## Header <!-- {docsify-ignore} -->

# Page Title <!-- {docsify-ignore-all} -->
```

`{docsify-ignore}` skips one header. `{docsify-ignore-all}` on the first header skips every header on the page. Neither marker renders on the page.

## Custom page title

Append a quoted string after a sidebar link to set the document title (better SEO):

```markdown
- [Guide](guide.md 'The greatest guide in the world')
```
