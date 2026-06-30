function AdminDictionaryForm({
  form,
  collections,
  applications,
  validationErrors,
  saving,
  hideType = false,
  onFormChange,
  onSubmit,
}) {
  return (
    <form className="form" onSubmit={onSubmit}>
      <div className="row">
        {!hideType && (
          <label>
            Type
            <select
              value={form.type}
              onChange={(event) =>
                onFormChange({
                  ...form,
                  type: event.target.value,
                  table:
                    event.target.value === "field" ? form.table || collections[0]?.name || "" : "",
                  application:
                    event.target.value === "field"
                      ? collections.find((entry) => entry.name === (form.table || collections[0]?.name))
                          ?.application ?? ""
                      : form.application || applications[0]?.name || "budget",
                  application_id:
                    event.target.value === "field"
                      ? collections.find((entry) => entry.name === (form.table || collections[0]?.name))
                          ?.application_id ?? null
                      : form.application_id ?? applications[0]?.id ?? null,
                })
              }
            >
              <option value="collection">collection</option>
              <option value="field">field</option>
            </select>
          </label>
        )}

        {form.type === "field" && (
          <label>
            table
            <select
              value={form.table}
              onChange={(event) =>
                onFormChange({
                  ...form,
                  table: event.target.value,
                  application:
                    collections.find((entry) => entry.name === event.target.value)?.application ??
                    "",
                  application_id:
                    collections.find((entry) => entry.name === event.target.value)?.application_id ??
                    null,
                })
              }
            >
              {collections.map((table) => (
                <option key={table.name} value={table.name}>
                  {table.name}
                </option>
              ))}
            </select>
            {validationErrors.table && <span className="field-error">{validationErrors.table}</span>}
          </label>
        )}

        <label>
          name
          <input
            value={form.name}
            onChange={(event) => onFormChange({ ...form, name: event.target.value })}
          />
          {validationErrors.name && <span className="field-error">{validationErrors.name}</span>}
        </label>

        <label>
          label
          <input
            value={form.label}
            onChange={(event) => onFormChange({ ...form, label: event.target.value })}
          />
          {validationErrors.label && <span className="field-error">{validationErrors.label}</span>}
        </label>
      </div>

      <div className="row">
        <label>
          application
          <select
            value={String(form.application_id ?? "")}
            disabled={form.type === "field"}
            onChange={(event) => {
              const selectedId = Number(event.target.value) || null;
              const selectedApp = applications.find((entry) => entry.id === selectedId);
              onFormChange({
                ...form,
                application_id: selectedId,
                application: selectedApp?.name ?? "",
              });
            }}
          >
            <option value="">Select application</option>
            {applications.map((application) => (
              <option key={application.id} value={application.id}>
                {application.title}
              </option>
            ))}
          </select>
          {validationErrors.application && (
            <span className="field-error">{validationErrors.application}</span>
          )}
        </label>
        <label>
          data_type
          <input
            value={form.data_type}
            onChange={(event) => onFormChange({ ...form, data_type: event.target.value })}
          />
        </label>
        <label>
          ref_table
          <input
            value={form.ref_table}
            onChange={(event) => onFormChange({ ...form, ref_table: event.target.value })}
          />
        </label>
        <label>
          required
          <select
            value={String(form.required)}
            onChange={(event) => onFormChange({ ...form, required: Number(event.target.value) })}
          >
            <option value="0">0</option>
            <option value="1">1</option>
          </select>
          {validationErrors.required && (
            <span className="field-error">{validationErrors.required}</span>
          )}
        </label>
        <label>
          sort_order
          <input
            type="number"
            value={form.sort_order}
            onChange={(event) =>
              onFormChange({ ...form, sort_order: Number(event.target.value || 0) })
            }
          />
          {validationErrors.sort_order && (
            <span className="field-error">{validationErrors.sort_order}</span>
          )}
        </label>
      </div>

      <button type="submit" disabled={saving}>
        {form.id ? "Update Entry" : "Create Entry"}
      </button>
    </form>
  );
}

export default AdminDictionaryForm;
