---
name: docsify
description: Writes and structures markdown for a docsify site.
Use when authoring docsify content or mentioning docsify, _sidebar.md, _navbar.md, or _coverpage.md.
---

# Docsify

Docsify renders a folder of markdown as a website at runtime, with no build step.
This skill is about writing the markdown: how files map to pages, how to author the sidebar and navbar, and the markdown extensions docsify adds.

For setup, config, themes, plugins, and deploy, read the reference files listed at the end.
Do not move or rewrite existing markdown to fit docsify, only add the docsify files (`index.html`, `_sidebar.md`, etc.) alongside it.

## Pages and routes

Each markdown file is a page.
The route follows the path under the docs root:

```text
README.md        => /
guide.md         => /#/guide
api/auth.md      => /#/api/auth
api/README.md    => /#/api/
```

`README.md` is the home page.
A `README.md` inside any folder is that folder's landing page.
Links between pages are relative markdown links (`[Auth](api/auth.md)`), never pre-rendered HTML.
Heading anchors are `#/page?id=heading-text`.

## Sidebar (`_sidebar.md`)

The primary navigation, a nested markdown list.
Keep paths relative to the docs root.

```markdown
- [Home](/)

- Reference
  - [Configuration](configuration.md)
  - [API](api/README.md)

- Explanation
  - [Architecture](architecture.md)
```

- Top-level text without a link becomes a section header.
- Per-page title for SEO: `- [Guide](guide.md 'The greatest guide')`.
- A heading TOC is generated automatically per page (depth set by config).
  Suppress headings with `<!-- {docsify-ignore} -->` on one heading or `<!-- {docsify-ignore-all} -->` on the first.
- Nested folders can each have their own `_sidebar.md`.
  See `references/sidebar.md`.

## Navbar (`_navbar.md`)

Top bar links.
Indent to create drop-down menus.
Documentation links start with `#/`.

```markdown
- [Home](/)

- Resources
  - [Changelog](changelog.md)
  - [GitHub](https://github.com/owner/repo)
```

See `references/navbar.md`.

## Cover page (`_coverpage.md`)

Optional full-screen landing page shown before the docs.

```markdown
![logo](_media/icon.svg)

# Docs

> A short tagline

[Get Started](#/quickstart)
```

See `references/cover-page.md`.

## Markdown extensions

Docsify adds syntax on top of standard markdown.

Callouts:

```markdown
> [!NOTE]
> Information to note.

> [!TIP]
> Optional advice.

> [!WARNING]
> A risk to be aware of.
```

Link and image attributes:

```markdown
[link](/demo ':target=_blank')
[link](/demo/ ':ignore')                <!-- load as-is, do not compile -->
![logo](icon.svg ':size=50x100')        <!-- WIDTHxHEIGHT, number, or % -->
```

Heading IDs and embeds:

```markdown
### Custom anchor :id=custom-anchor

[file](_media/example.md ':include')            <!-- embed markdown inline -->
[file](_media/example.js ':include :type=code') <!-- embed as code block -->
```

To put markdown inside an HTML tag, leave a blank line between the tag and the content.
See `references/markdown-helpers.md` for the full set, including task lists, embeds, and mermaid.

## Serve

```bash
npx docsify-cli serve docs
```

Opens at `http://localhost:3000`.
Any static server works too since there is no build step.

## References

- `references/configuration.md` - `index.html` setup, `window.$docsify` options, `routerMode`, virtual routes.
- `references/sidebar.md` - nested sidebars, TOC, ignoring headers, custom titles.
- `references/navbar.md` - drop-downs and HTML navbar.
- `references/cover-page.md` - backgrounds and multi-cover.
- `references/themes.md` - core theme, add-ons, body classes, theme properties.
- `references/markdown-helpers.md` - callouts, link/image attributes, embed files, mermaid.
- `references/plugins.md` - search, copy-code, pagination, tabs, analytics, comments.
- `references/deploy.md` - GitHub Pages, Netlify, Vercel, Nginx, Docker, history-mode rewrites.
