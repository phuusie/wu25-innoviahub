import type {ReactNode} from "react";

// Gör om **fetstil** till <strong>. Bygger React-element, så ingen HTML från AI:n körs.
function renderInline(text: string): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter((part) => part !== "")
    .map((part, index) =>
      part.startsWith("**") && part.endsWith("**")
        ? <strong key={index} className="font-semibold">{part.slice(2, -2)}</strong>
        : part
    );
}

// Visar AI:ns svar med stöd för stycken, punktlistor ("- ") och fetstil
export default function MessageText({text}: { text: string }) {
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];

  function flushList() {
    if (listItems.length === 0) return;

    blocks.push(
      <ul key={`list-${blocks.length}`} className="space-y-0.5 pl-1">
        {listItems.map((item, index) => (
          <li key={index} className="flex gap-2">
            <span aria-hidden="true" className="text-muted">•</span>
            <span>{renderInline(item)}</span>
          </li>
        ))}
      </ul>
    );
    listItems = [];
  }

  for (const line of text.split("\n")) {
    const trimmed = line.trim();

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      listItems.push(trimmed.slice(2));
      continue;
    }

    flushList();

    if (trimmed !== "") {
      blocks.push(<p key={`p-${blocks.length}`}>{renderInline(trimmed)}</p>);
    }
  }

  flushList();

  return <div className="space-y-2">{blocks}</div>;
}
