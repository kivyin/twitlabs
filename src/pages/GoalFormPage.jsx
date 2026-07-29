import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { insertRow, runQuery, selectRows, updateRows } from "../api/dbApi";
import FormActions from "../components/FormActions";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";
import { useBrowseReturn } from "../hooks/useBrowseReturn";
import { buildForeignKeyOptionLabel } from "../utils/tableForm";
import { buildUserOptions } from "../utils/userReferences";
import { validateBudgetAmount } from "../utils/money";

function GoalFormPage() {
  const { appName = "budget", recordId } = useParams();
  const { goBack } = useBrowseReturn(`/app/${appName}/goals`);
  const { user } = useAuth();
  const isEdit = Boolean(recordId);
  const [formData, setFormData] = useState({
    user_id: "",
    name: "",
    target_amount: "",
    current_amount: "0",
    target_date: "",
    account_id: "",
    notes: "",
    is_active: true,
  });
  const [accountOptions, setAccountOptions] = useState([]);
  const [userOptions, setUserOptions] = useState([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const [accountsResult, usersResult] = await Promise.all([
          runQuery({
            sql: `
              SELECT a.id, a.name, at.name AS account_type_name
              FROM accounts a
              JOIN account_types at ON at.id = a.account_type_id
              WHERE at.name != 'Site account'
              ORDER BY a.name
            `,
          }),
          selectRows({ table: "users", limit: 500 }),
        ]);

        if (!active) return;

        setAccountOptions(
          (accountsResult.rows ?? []).map((row) => ({
            value: String(row.id),
            label: buildForeignKeyOptionLabel(row, "id", "accounts"),
          }))
        );
        setUserOptions(buildUserOptions(usersResult.rows ?? []));

        if (isEdit) {
          const result = await selectRows({
            table: "goals",
            where: "id = ?",
            whereParams: [recordId],
            limit: 1,
          });
          const row = result.rows?.[0];
          if (!row) {
            throw new Error("Goal not found.");
          }

          setFormData({
            user_id: row.user_id ? String(row.user_id) : "",
            name: row.name ?? "",
            target_amount: row.target_amount === null ? "" : String(row.target_amount),
            current_amount: row.current_amount === null ? "0" : String(row.current_amount),
            target_date: row.target_date ?? "",
            account_id: row.account_id ? String(row.account_id) : "",
            notes: row.notes ?? "",
            is_active: Number(row.is_active) !== 0,
          });
        } else if (user?.id) {
          setFormData((prev) => ({ ...prev, user_id: String(user.id) }));
        }
      } catch (loadError) {
        if (active) setError(loadError.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [isEdit, recordId, user?.id]);

  const linkedAccountHint = useMemo(() => {
    if (!formData.account_id) {
      return "Optional. Link a savings account to track progress from its balance.";
    }
    return "When linked, use Sync from account on the dashboard to refresh progress.";
  }, [formData.account_id]);

  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setStatus("");

    try {
      const payload = {
        user_id: Number(formData.user_id),
        name: formData.name.trim(),
        target_amount: validateBudgetAmount(formData.target_amount),
        current_amount: Number(formData.current_amount) || 0,
        target_date: formData.target_date.trim() || null,
        account_id: formData.account_id ? Number(formData.account_id) : null,
        notes: formData.notes.trim() || null,
        is_active: formData.is_active ? 1 : 0,
      };

      if (!payload.name) {
        throw new Error("Goal name is required.");
      }

      if (isEdit) {
        await updateRows({
          table: "goals",
          data: payload,
          where: "id = ?",
          whereParams: [recordId],
        });
        setStatus("Goal updated.");
      } else {
        await insertRow({ table: "goals", data: payload });
        setStatus("Goal saved.");
      }

      setTimeout(() => goBack(), 250);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: appName, to: `/app/${appName}` },
          { label: "Savings Goals", to: `/app/${appName}/goals` },
          { label: isEdit ? "Edit" : "New" },
        ]}
        title={isEdit ? "Edit savings goal" : "New savings goal"}
        subtitle="Track progress toward a savings target."
      />

      <section className="panel">
        {loading && <p className="subtext">Loading form...</p>}
        {!loading && (
          <form className="form form-shell" onSubmit={handleSubmit}>
            <FormActions
              saving={saving}
              submitLabel={isEdit ? "Update goal" : "Save goal"}
              onCancel={() => goBack()}
            >
            <div className="form-grid two-col">
              <label>
                User
                <select value={formData.user_id} onChange={(event) => handleChange("user_id", event.target.value)} required>
                  <option value="">Select user</option>
                  {userOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Goal name
                <input value={formData.name} onChange={(event) => handleChange("name", event.target.value)} required />
              </label>

              <label>
                Target amount
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={formData.target_amount}
                  onChange={(event) => handleChange("target_amount", event.target.value)}
                  required
                />
              </label>

              <label>
                Current amount
                <input
                  type="number"
                  step="0.01"
                  value={formData.current_amount}
                  onChange={(event) => handleChange("current_amount", event.target.value)}
                  disabled={Boolean(formData.account_id)}
                />
                <span className="field-hint">
                  {formData.account_id
                    ? "Progress comes from the linked account balance when synced."
                    : "Enter saved progress manually, or link an account below."}
                </span>
              </label>

              <label>
                Linked account
                <select value={formData.account_id} onChange={(event) => handleChange("account_id", event.target.value)}>
                  <option value="">No linked account</option>
                  {accountOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span className="field-hint">{linkedAccountHint}</span>
              </label>

              <label>
                Target date
                <input type="date" value={formData.target_date} onChange={(event) => handleChange("target_date", event.target.value)} />
              </label>

              <label className="form-field-full">
                Notes
                <textarea rows={3} value={formData.notes} onChange={(event) => handleChange("notes", event.target.value)} />
              </label>

              <label className="checkbox-field form-field-full">
                <span className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(event) => handleChange("is_active", event.target.checked)}
                  />
                  <span>Active</span>
                </span>
              </label>
            </div>
            </FormActions>
          </form>
        )}
        {status && <p className="status">{status}</p>}
        {error && <p className="error">{error}</p>}
      </section>
    </>
  );
}

export default GoalFormPage;
