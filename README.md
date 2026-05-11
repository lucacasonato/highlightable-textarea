# highlightable-textarea

A lightweight Preact component for building a textarea-like editable surface
with semantic text highlights layered on top.

## What it does

`HighlightableTextarea` renders a `contenteditable="plaintext-only"` element
that behaves like a controlled text input and applies named highlight ranges
over the current text content.

It is designed for cases where you want the editing experience of a textarea,
but need to decorate parts of the text as the user types.

## Installation

This repository is set up for Deno and Preact.

```ts
import { HighlightableTextarea } from "./index.tsx";
```

If you are using the package from another project, point the import at the
published entrypoint you expose in your build or export map.

## Basic Usage

```tsx
import { useState } from "preact/hooks";
import { HighlightableTextarea, type HighlightToken } from "./index.tsx";

const tokenPattern = /\{\{([^}]+)\}\}/g;

export function Editor() {
  const [value, setValue] = useState("");

  return (
    <HighlightableTextarea
      value={value}
      onInput={(event) => setValue(event.currentTarget.textContent ?? "")}
      highlight={(text) => {
        const highlights: HighlightToken[] = [];
        for (const match of text.matchAll(tokenPattern)) {
          const start = match.index!;
          const end = start + match[0].length;
          highlights.push({ start, end, label: "token", priority: 0 });
        }
        return highlights;
      }}
    />
  );
}
```

## API

### `HighlightableTextarea`

Props:

- `value: string` - The current text value to display.
- `highlight?(value: string): Iterable<HighlightToken>` - Returns highlight
  ranges for the current text.
- All other props are forwarded to the underlying `<div>` except `children`,
  `role`, and contenteditable-specific props.

Behavior notes:

- The element is rendered as `contenteditable="plaintext-only"`.
- Highlight ranges are recalculated on input and after the highlight function
  changes.
- A zero-length highlight token is treated as an error.
- In non-DOM environments, the initial `value` is rendered as children so the
  component can still be pre-rendered.

### `HighlightToken`

```ts
interface HighlightToken {
  start: number;
  end: number;
  label: string;
  priority: number;
}
```

`start` and `end` are character offsets into the current text value. `label`
names the highlight, and `priority` controls ordering when multiple highlights
overlap.

## Styling

`HighlightableTextarea` renders a single `<div>` with the
`data-highlightable-textarea` attribute. Style it as an editor surface with a
normal CSS selector, then style semantic highlight labels with
`::highlight(label)`.

```css
/* Editor surface */
[data-highlightable-textarea] {
  font: 400 14px/1.45 ui-monospace, "SFMono-Regular", Menlo, monospace;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  min-height: 6lh;
  min-width: 32ch;
  padding: 0.625rem 0.75rem;
  border: 1px solid #c6c8cf;
  border-radius: 8px;
  background: #ffffff;
  color: #17181c;
  outline: none;
}

[data-highlightable-textarea]:focus {
  border-color: #5a6ff0;
  box-shadow: 0 0 0 3px color-mix(in srgb, #5a6ff0 20%, transparent);
}

/* Highlight labels from token.label */
::highlight(token) {
  color: #1f3fb0;
  background: #dbe7ff;
}

::highlight(error) {
  color: #a10f2b;
  background: #ffdfe5;
}
```

If your highlighter returns `{ label: "token" }`, the browser applies
`::highlight(token)`. Use distinct labels to create multiple visual categories
without changing your editor markup.

## Demo

Build the demo bundle with:

```sh
deno task demo
```

The demo shows a simple `{{token}}` highlighter in the browser.

## License

MIT. See [LICENSE](LICENSE).
