import { useMemo, useState } from "react";
import DataTable from "../DataTable";

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
        <DataTable
          storageKey={`data-table:admin:dictionary-health:${expanded}`}
          columns={["id", "table", "name", "label", "type"]}
          rows={uniqueRows[expanded].map((entry) => ({
            ...entry,
            table: entry.table ?? "",
          }))}
          onRowClick={(entry) => onJumpToEntry(entry)}
        />
      )}
    </section>
  );
}

export default DictionaryHealthPanel;
