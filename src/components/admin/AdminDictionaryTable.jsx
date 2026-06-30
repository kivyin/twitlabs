function AdminDictionaryTable({ entries, onEdit, onDeleteRequest }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>id</th>
            <th>application</th>
            <th>table</th>
            <th>name</th>
            <th>label</th>
            <th>type</th>
            <th>sort_order</th>
            <th>action</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td>{entry.id}</td>
              <td>{entry.application_name ?? entry.application ?? ""}</td>
              <td>{entry.table ?? ""}</td>
              <td>{entry.name}</td>
              <td>{entry.label}</td>
              <td>{entry.type}</td>
              <td>{entry.sort_order ?? 0}</td>
              <td>
                <button type="button" onClick={() => onEdit(entry)}>
                  Edit
                </button>
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => onDeleteRequest(entry)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminDictionaryTable;
