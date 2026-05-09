import { LocalHighlightRegistry } from "@nic/local-highlight-registry";
import { useEffect, useRef, useState } from "preact/hooks";
import type { InputEventHandler } from "preact";

export interface HighlightToken {
  start: number;
  end: number;
  label: string;
  priority: number;
}

interface HighlightableTextareaProps {
  value: string;
  onInput?: InputEventHandler<HTMLDivElement>;
  highlights: HighlightToken[];
}

export function HighlightableTextarea(props: HighlightableTextareaProps) {
  const ref = useRef<HTMLDivElement>(null);
  const localHighlightRegistry = useRef(new LocalHighlightRegistry());
  const [isInteracting, setIsInteracting] = useState(false);
  useEffect(() => {
    const textarea = ref.current;
    if (!textarea) return;
    const highlights = localHighlightRegistry.current;
    highlights.clear();
    for (const token of locationizeTokens(textarea, props.highlights)) {
      const range = document.createRange();
      range.setStart(token.start.node, token.start.offset);
      range.setEnd(token.end.node, token.end.offset);
      highlights.add(token.label, range, token.priority);
    }
  }, [props.highlights, ref.current]);
  return (
    <div
      contenteditable="plaintext-only"
      ref={ref}
      role="textbox"
      onInput={(e) => {
        props.onInput?.(e);
        if (!e.defaultPrevented) setIsInteracting(true);
      }}
      onFocusOut={() => setIsInteracting(false)}
      onClick={() => setIsInteracting(true)}
      onKeyDown={(e) => {
        if (e.key === "Escape") e.currentTarget.blur();
        if (
          e.key === "ArrowUp" || e.key === "ArrowDown" ||
          e.key === "ArrowLeft" || e.key === "ArrowRight"
        ) setIsInteracting(true);
      }}
    >
    </div>
  );
}

export interface HighlightTokenInternal {
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
