import { useMemo, useState } from "react";

const healthSections = [
  { key: "duplicates", title: "Duplicate keys" },
  { key: "missingLabels", title: "Missing labels" },
  { key: "fieldsMissingTable", title: "Field rows missing table" },
  { key: "fieldsWithUnknownTable", title: "Field rows with unknown table" },
  { key: "unknownRefTables", title: "Field rows with unknown ref_table" },
];

function DictionaryHealthPanel({ health, onJumpToEntry }) {
  const [expanded, setExpanded] = useState(null);

  const uniqueRows = useMemo(() => {
    const map = {};
    for (const section of healthSections) {
      const rows = health[section.key] ?? [];
      map[section.key] = Array.from(new Map(rows.map((row) => [row.id, row])).values());
    }
    return map;
  }, [health]);

  return (
    <section className="panel health-panel">
      <h2>Dictionary Health</h2>
      <ul>
        {healthSections.map((section) => {
          const count = uniqueRows[section.key].length;
          return (
            <li key={section.key}>
              {section.title}: {count}{" "}
              {count > 0 && (
                <button
                  type="button"
                  className="linkish-button"
                  onClick={() => setExpanded((prev) => (prev === section.key ? null : section.key))}
                >
                  {expanded === section.key ? "Hide" : "View"}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {expanded && uniqueRows[expanded].length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>id</th>
                <th>table</th>
                <th>name</th>
                <th>label</th>
                <th>type</th>
                <th>action</th>
              </tr>
            </thead>
            <tbody>
              {uniqueRows[expanded].map((entry) => (
                <tr key={`${expanded}-${entry.id}`}>
                  <td>{entry.id}</td>
                  <td>{entry.table ?? ""}</td>
                  <td>{entry.name}</td>
                  <td>{entry.label}</td>
                  <td>{entry.type}</td>
                  <td>
                    <button type="button" onClick={() => onJumpToEntry(entry)}>
                      Jump to Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default DictionaryHealthPanel;
