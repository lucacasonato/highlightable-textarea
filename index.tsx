import { LocalHighlightRegistry } from "@nic/local-highlight-registry";
import { type MutableRef, useEffect, useRef } from "preact/hooks";
import type { HTMLAttributes, JSX, RefObject } from "preact";

/**
 * A semantic highlight range over the current editor value.
 *
 * `start` and `end` are character offsets into the plain-text value.
 * `label` maps to CSS Custom Highlight selectors like `::highlight(label)`.
 * `priority` controls ordering when highlights overlap.
 */
export interface HighlightToken {
  start: number;
  end: number;
  label: string;
  priority: number;
}

/**
 * Props for {@link HighlightableTextarea}.
 *
 * This extends standard `<div>` attributes (with content/value-related fields
 * omitted), and adds controlled text + highlight generation hooks.
 */
export interface HighlightableTextareaProps extends
  Omit<
    HTMLAttributes<HTMLDivElement>,
    | "textContent"
    | "dangerouslySetInnerHTML"
    | "children"
    | "role"
    | "contenteditable"
    | "contentEditable"
  > {
  value: string;
  highlight?(value: string): Iterable<HighlightToken>;
}

function doHighlight(
  highlight: HighlightableTextareaProps["highlight"],
  ref: RefObject<HTMLDivElement>,
  localHighlightRegistry: MutableRef<LocalHighlightRegistry>,
) {
  const textarea = ref.current;
  if (!textarea) return;
  localHighlightRegistry.current.clear();
  const value = textarea.textContent || "";
  if (highlight) {
    const highlights = highlight(value);
    for (const token of locationizeTokens(textarea, highlights)) {
      const range = document.createRange();
      range.setStart(token.start.node, token.start.offset);
      range.setEnd(token.end.node, token.end.offset);
      localHighlightRegistry.current.add(token.label, range, token.priority);
    }
  }
}

/**
 * A controlled, textarea-like editor surface backed by
 * `contenteditable="plaintext-only"`.
 *
 * The `value` prop is rendered as plain text, `onInput` is forwarded so callers
 * can update state, and `highlight` can provide semantic ranges that are mapped
 * to named CSS Custom Highlights (for example `::highlight(token)`).
 *
 * The rendered element includes a `data-highlightable-textarea` attribute for
 * base editor styling.
 */
export function HighlightableTextarea(
  props: HighlightableTextareaProps,
): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const localHighlightRegistry = useRef(new LocalHighlightRegistry());
  const { value, highlight, ...rest } = props;
  useEffect(() => {
    doHighlight(highlight, ref, localHighlightRegistry);
  }, [highlight, ref.current]);
  useEffect(() => {
    if (ref.current) ref.current.textContent = value;
  }, [ref]);
  return (
    <div
      data-highlightable-textarea
      contenteditable="plaintext-only"
      ref={ref}
      role="textbox"
      onInput={(e) => {
        props.onInput?.(e);
        doHighlight(highlight, ref, localHighlightRegistry);
      }}
      // deno-lint-ignore jsx-no-children-prop
      children={"document" in globalThis ? undefined : value}
      {...rest}
    />
  );
}

interface HighlightTokenInternal {
  start: InternalLocation;
  end: InternalLocation;
  label: string;
  priority: number;
}

interface InternalLocation {
  node: Text;
  offset: number;
}

function* locationizeTokens(
  div: HTMLDivElement,
  tokens: Iterable<HighlightToken>,
): Iterable<HighlightTokenInternal> {
  let node: Text = div.firstChild as Text;
  let offset = 0;
  let lastIndex = 0;

  const advance = (index: number, preferStart: boolean): InternalLocation => {
    if (index < lastIndex) {
      node = div.firstChild as Text;
      offset = 0;
      lastIndex = 0;
    }

    let delta = index - lastIndex;
    let remaining: number;
    while (
      remaining = node.textContent!.length - offset,
        preferStart && node.nextSibling ? remaining <= delta : remaining < delta
    ) {
      delta -= remaining;
      node = node.nextSibling as Text;
      offset = 0;
    }
    offset += delta;
    lastIndex = index;

    return { node, offset };
  };

  for (const token of tokens) {
    const { label, start, end, priority } = token;

    if (start === end) {
      const error = new Error("Zero-length token", { cause: token });
      const event = new ErrorEvent("error", { error });
      div.dispatchEvent(event);
      if (!event.defaultPrevented) reportError(error);
      continue;
    }

    yield {
      start: advance(start, true),
      end: advance(end, false),
      label,
      priority,
    };
  }
}
