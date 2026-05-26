# md test-case — render with: md markdown/test-case.md

# Heading 1 (plain)

## Heading 2 with **bold** and _italic_

### Heading 3 with `inline code` after and before

#### Heading 4 (`file.txt`) restores heading color after code

##### Heading 5 **bold** then `code` then plain tail

###### Heading 6 _italic_ **bold** `code` mixed

---

Paragraph with **bold**, _italic_, `inline code`, and plain text on one line.

Multi-line paragraph continues here on a second line without a blank line between.

Another paragraph after a blank line.

_italic with `code` inside_ and **bold with _nested italic_ text**.

---

- Unordered item one
- Item with **bold** and `code`
- Item three

* Alternate bullet marker

- Plus marker list

1. Ordered first
2. Ordered second with `path/to/file.ts`
3. Ordered third

| Feature  | Supported | Notes                      |
| -------- | --------- | -------------------------- |
| Headings | yes       | Levels 1-6                 |
| Inline   | partial   | `code`, **bold**, _italic_ |
| Tables   | yes       | Pipe syntax                |

| Column | Supported |
| -----: | :-------: |
|      a |     a     |
|     aa |    aa     |
|    aaa |    aaa    |

Plain fenced code block (no command line):

```
const x = 1;
console.log(x);
```

Command fence (triple-backtick + !cmd opener) — ghost command row, then body lines:

```!echo hello from opener

```

Embedded command line (! cmd as first line inside fence):

```
! echo hello from embedded line
line two of output
line three
```

Matching opener and embedded command (deduped):

```!git status
! git status
On branch main
nothing to commit
```

---

### CI checks (`checks.txt`)

```js
console.log("hello world");
```

---

Horizontal rules variants:

---

---

---

Edge cases:

### Only `code` in heading

### Text `a` and `b` multiple code spans in heading (parens)

Paragraph with pipe characters that is not a table (no separator row).

Empty code fence:

```

```
