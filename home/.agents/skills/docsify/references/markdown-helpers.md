# Markdown helpers and extensions

Docsify uses marked and adds extra syntax.

## Callouts

GitHub-style alerts:

```markdown
> [!NOTE]
> Information the reader should note.

> [!TIP]
> Optional advice.

> [!IMPORTANT]
> Necessary for success.

> [!WARNING]
> Potential risk.

> [!CAUTION]
> Negative consequences.
```

## Link attributes

```markdown
[link](/demo ':disabled')
[link](/demo/ ':ignore')           <!-- do not compile, load as-is -->
[link](/demo/ ':ignore title')     <!-- ignore but set title -->
[link](/demo ':target=_blank')
```

## Image attributes

```markdown
![logo](icon.svg ':class=someClass')
![logo](icon.svg ':id=someId')
![logo](icon.svg ':size=50x100')   <!-- WIDTHxHEIGHT, single number, or % -->
![](image.png ':no-zoom')          <!-- skip the zoom-image plugin -->
```

## Heading IDs

```markdown
### Hello, world! :id=hello-world
```

Anchors otherwise derive from heading text, e.g. `#/page?id=section-title`.

## Task lists

```markdown
- [ ] todo
- [x] done
```

## Markdown inside HTML

Leave a blank line between the HTML tag and the markdown:

```markdown
<details>
<summary>Click to expand</summary>

- item
- item

</details>
```

## Embed files

Add `:include` to a link to embed instead of linking.
Type is inferred from extension (`.md` markdown, `.html` iframe, `.mp4` video, `.mp3` audio, others as a code block).

```markdown
[file](_media/example.md ':include')
[file](_media/example.md ':include :type=code')
[file](_media/example.js ':include :type=code :fragment=demo')
[site](https://example.com ':include :type=iframe width=100% height=400px')
```

Force a code block with `:type=code`.
Embed a fragment by wrapping source between `/// [name]` markers and using `:fragment=name`.
Raw gist URLs (`gist.githubusercontent.com/USER/ID/raw/FILE`) can be embedded the same way.

## Mermaid

Docsify supports mermaid up to v9.3.0 (sync render only).
Load mermaid, then route `mermaid` code blocks through a custom renderer:

```js
let num = 0;
mermaid.initialize({ startOnLoad: false });
window.$docsify = {
  markdown: {
    renderer: {
      code({ text, lang }) {
        if (lang === "mermaid") {
          return `<div class="mermaid">${mermaid.render("m" + num++, text)}</div>`;
        }
        return this.origin.code.apply(this, arguments);
      },
    },
  },
};
```
