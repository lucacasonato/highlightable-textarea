import { render } from "preact";
import { HighlightableTextarea, type HighlightToken } from "../index.tsx";
import { useState } from "preact/hooks";

const regexp = /\{\{([^}]+)\}\}/g;

function App() {
  const [value, setValue] = useState("");
  return (
    <HighlightableTextarea
      value={value}
      onInput={(e) => setValue(e.currentTarget.textContent)}
      highlight={(value) => {
        const matches = value.matchAll(regexp);
        if (!matches) return [];
        const newHighlights: HighlightToken[] = [];
        for (const match of matches) {
          const start = match.index!;
          const end = start + match[0].length;
          newHighlights.push({ start, end, label: "red", priority: 0 });
        }
        return newHighlights;
      }}
    />
  );
}

render(
  <App />,
  document.body,
);
