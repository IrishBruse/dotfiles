# Custom navbar

Documentation links begin with `#/`.

## Markdown navbar

Set `loadNavbar: true` and create `docs/_navbar.md`. Add an empty `docs/.nojekyll`.

```js
window.$docsify = { loadNavbar: true };
```

```markdown
<!-- docs/_navbar.md -->
- [Home](/)
- [GitHub](https://github.com/owner/repo)
```

## Drop-down menus

Indent items under a parent to nest them:

```markdown
- Getting started
  - [Quick start](quickstart.md)
  - [Configuration](configuration.md)

- Links
  - [En](/)
  - [GitHub](https://github.com/owner/repo)
```

`_navbar.md` loads per directory with parent fallback, same as `_sidebar.md`.

## HTML navbar

For full control, put a `<nav>` in `index.html` instead:

```html
<body>
  <nav>
    <a href="#/">EN</a>
    <a href="#/zh-cn/">zh</a>
  </nav>
  <div id="app"></div>
</body>
```

Use `mergeNavbar: true` to fold the navbar into the sidebar on small screens.
