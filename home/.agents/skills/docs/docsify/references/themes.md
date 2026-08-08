# Themes and styling

## Core theme

Load the core theme stylesheet.
It is a minimalist base designed for customization via theme properties.

```html
<link rel="stylesheet" href="//cdn.jsdelivr.net/npm/docsify@5/dist/themes/core.min.css" />
```

## Add-ons

Load add-ons after the core theme.

```html
<!-- Dark mode -->
<link rel="stylesheet" href="//cdn.jsdelivr.net/npm/docsify@5/dist/themes/addons/core-dark.min.css" />

<!-- Dark mode only when the OS prefers dark -->
<link rel="stylesheet" href="//cdn.jsdelivr.net/npm/docsify@5/dist/themes/addons/core-dark.min.css" media="(prefers-color-scheme: dark)" />

<!-- The popular v4 Vue theme -->
<link rel="stylesheet" href="//cdn.jsdelivr.net/npm/docsify@5/dist/themes/addons/vue.min.css" />
```

## Body classes

Apply on `<body>` in `index.html`:

- `loading` - loading animation until docsify initializes.
- `sidebar-chevron-right` / `sidebar-chevron-left` - expand/collapse chevrons on links.
- `sidebar-group-box` / `sidebar-group-underline` - visual grouping in the sidebar.
- `sidebar-link-clamp` - clamp multi-line links to one line.
- `sidebar-toggle-chevron` / `sidebar-toggle-hamburger` - toggle button icon style.

Opt a single link out of chevrons: `[My Page](page.md ':class=no-chevron')`.

## Customization with theme properties

Add a `<style>` after the theme stylesheet and set properties on `:root`:

```html
<link rel="stylesheet" href="//cdn.jsdelivr.net/npm/docsify@5/dist/themes/core.min.css" />
<style>
  :root {
    --theme-color: #3f51b5;
    --font-size: 15px;
    --line-height: 1.5;
  }
</style>
```

Light/dark overrides:

```css
@media (prefers-color-scheme: dark) {
  :root { --color-bg: #222; --color-text: #ddd; }
}
```

Prefer theme properties over raw CSS selectors.
Custom selectors can break across docsify versions, so pin a full CDN version if you rely on them.
Theme properties can also be set per page inside a markdown `<style>` block.
