import { Link } from "react-router-dom";

function RecordTable({ columns, rows, linkColumn, getRowLink, columnLabels = {} }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{columnLabels[column] ?? column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id ?? index}>
              {columns.map((column) => {
                const value = row[column] === null ? "null" : String(row[column]);
                const key = `${row.id ?? index}-${column}`;

                if (column === linkColumn) {
                  return (
                    <td key={key}>
                      <Link to={getRowLink(row, index)} className="record-link">
                        {value}
                      </Link>
                    </td>
                  );
                }

                return <td key={key}>{value}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default RecordTable;
