# Cover page

A full-screen landing page rendered before the docs.

## Enable

```js
window.$docsify = { coverpage: true };
```

Create `docs/_coverpage.md`:

```markdown
<!-- _coverpage.md -->
![logo](_media/icon.svg)

# Docs

> A short tagline

- Point one
- Point two

[GitHub](https://github.com/owner/repo)
[Get Started](#/quickstart)
```

## Background

Set a color or image inside the markdown:

```markdown
<!-- background color -->
![color](#f0f0f0)

<!-- background image -->
![](_media/bg.png)
```

Or use theme properties in `index.html`:

```css
:root {
  --cover-bg: url('path/to/image.png');
  --cover-bg-overlay: rgba(0, 0, 0, 0.5);
  --cover-color: #fff;
  --cover-title-color: var(--theme-color);
}
```

## Options

- `onlyCover: true` shows only the cover on the home route, separate from the home page.
- Multiple covers for localized sites: `coverpage: ['/', '/zh-cn/']` or `coverpage: { '/': 'cover.md', '/zh-cn/': 'cover.md' }`.
