import { render } from "preact";
import { HighlightableTextarea, HighlightToken } from "./index.tsx";
import { useEffect, useState } from "preact/hooks";

const regexp = /\{\{([^}]+)\}\}/g;

function App() {
  const [highlights, setHighlights] = useState<HighlightToken[]>([]);
  const [value, setValue] = useState("");
  useEffect(() => {
    const matches = value.matchAll(regexp);
    if (!matches) return;
    const newHighlights: HighlightToken[] = [];
    for (const match of matches) {
      const start = match.index!;
      const end = start + match[0].length;
      newHighlights.push({ start, end, label: "red", priority: 0 });
    }
    console.log(newHighlights)
    setHighlights(newHighlights);
  }, [value]);

  return (
    <HighlightableTextarea
      value={value}
      highlights={highlights}
      onInput={(e) => setValue(e.currentTarget.textContent)}
    />
  );
}

render(
  <App />,
  document.body,
);
