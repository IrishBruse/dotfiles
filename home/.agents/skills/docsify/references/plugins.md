# Plugins

Add a `<script>` for each plugin after the docsify script. Some also need config on `window.$docsify`.

## Full text search

```html
<script>
  window.$docsify = {
    search: "auto", // or an array of paths
    // search: { placeholder: "Type to search", depth: 2, noData: "No results" },
  };
</script>
<script src="//cdn.jsdelivr.net/npm/docsify@5/dist/plugins/search.min.js"></script>
```

Ignores diacritics ("cafe" matches "cafe"). Use `namespace` to avoid index collisions between sites on one domain.

## Copy to clipboard

```html
<script src="//cdn.jsdelivr.net/npm/docsify-copy-code/dist/docsify-copy-code.min.js"></script>
```

## Pagination

```html
<script src="//cdn.jsdelivr.net/npm/docsify-pagination/dist/docsify-pagination.min.js"></script>
```

## Tabs

```html
<script src="//cdn.jsdelivr.net/npm/docsify-tabs@1/dist/docsify-tabs.min.js"></script>
```

## Zoom image

```html
<script src="//cdn.jsdelivr.net/npm/docsify@5/dist/plugins/zoom-image.min.js"></script>
```

Skip an image with `![](img.png ':no-zoom')`.

## External script

Needed when a markdown page loads a script via `src`.

```html
<script src="//cdn.jsdelivr.net/npm/docsify@5/dist/plugins/external-script.min.js"></script>
```

## Analytics (GA4)

```html
<script>
  window.$docsify = { gtag: "G-XXXXXXXX" };
</script>
<script src="//cdn.jsdelivr.net/npm/docsify@5/dist/plugins/gtag.min.js"></script>
```

## Comments

- Disqus: set `disqus: "shortname"` and load `dist/plugins/disqus.min.js`.
- Gitalk: GitHub Issue based, load `dist/plugins/gitalk.min.js` plus the gitalk assets.

## More

Browse community plugins and themes at awesome-docsify. To build your own, see docsify's "Write a Plugin" guide.
