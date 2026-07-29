import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { insertRow, runQuery, selectRows, updateRows } from "../api/dbApi";
import FormActions from "../components/FormActions";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";
import { useBrowseReturn } from "../hooks/useBrowseReturn";
import { buildForeignKeyOptionLabel } from "../utils/tableForm";
import { buildUserOptions } from "../utils/userReferences";
import { getMoneyFieldHint, getSignedAmountClass, validateCategorySignedAmount } from "../utils/money";

const FREQUENCY_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

function RecurringFormPage() {
  const { appName = "budget", recordId } = useParams();
  const { goBack } = useBrowseReturn(`/app/${appName}/recurring_transactions`);
  const { user } = useAuth();
  const isEdit = Boolean(recordId);
  const [formData, setFormData] = useState({
    user_id: "",
    account_id: "",
    payee_id: "",
    category_id: "",
    amount: "",
    description: "",
    frequency: "monthly",
    day_of_month: "",
    start_date: new Date().toISOString().slice(0, 10),
    end_date: "",
    next_due_date: new Date().toISOString().slice(0, 10),
    is_active: true,
  });
  const [accountOptions, setAccountOptions] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [payeeOptions, setPayeeOptions] = useState([]);
  const [categoryTypeById, setCategoryTypeById] = useState({});
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
        const [accountsResult, categoriesResult, payeesResult, usersResult] = await Promise.all([
          runQuery({
            sql: `
              SELECT a.id, a.name
              FROM accounts a
              JOIN account_types at ON at.id = a.account_type_id
              WHERE at.name != 'Site account'
              ORDER BY a.name
            `,
          }),
          runQuery({
            sql: `
              SELECT c.id, c.name, ct.name AS category_type
              FROM categories c
              JOIN category_types ct ON ct.id = c.type_id
              ORDER BY c.name
            `,
          }),
          selectRows({ table: "payees", limit: 500 }),
          selectRows({ table: "users", limit: 500 }),
        ]);

        if (!active) return;

        setAccountOptions(
          (accountsResult.rows ?? []).map((row) => ({
            value: String(row.id),
            label: buildForeignKeyOptionLabel(row, "id", "accounts"),
          }))
        );
        setCategoryOptions(
          (categoriesResult.rows ?? []).map((row) => ({
            value: String(row.id),
            label: buildForeignKeyOptionLabel(row, "id", "categories"),
          }))
        );
        setCategoryTypeById(
          Object.fromEntries((categoriesResult.rows ?? []).map((row) => [String(row.id), row.category_type]))
        );
        setPayeeOptions(
          (payeesResult.rows ?? []).map((row) => ({
            value: String(row.id),
            label: row.name,
          }))
        );
        setUserOptions(buildUserOptions(usersResult.rows ?? []));

        if (isEdit) {
          const result = await selectRows({
            table: "recurring_transactions",
            where: "id = ?",
            whereParams: [recordId],
            limit: 1,
          });
          const row = result.rows?.[0];
          if (!row) {
            throw new Error("Recurring bill not found.");
          }

          setFormData({
            user_id: row.user_id ? String(row.user_id) : "",
            account_id: row.account_id ? String(row.account_id) : "",
            payee_id: row.payee_id ? String(row.payee_id) : "",
            category_id: row.category_id ? String(row.category_id) : "",
            amount: row.amount === null ? "" : String(row.amount),
            description: row.description ?? "",
            frequency: row.frequency ?? "monthly",
            day_of_month: row.day_of_month ? String(row.day_of_month) : "",
            start_date: row.start_date ?? "",
            end_date: row.end_date ?? "",
            next_due_date: row.next_due_date ?? "",
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

  const selectedCategoryType = categoryTypeById[formData.category_id] ?? "";
  const amountHint = getMoneyFieldHint("transactions", "amount", { categoryType: selectedCategoryType });
  const amountClassName = getSignedAmountClass(formData.amount);

  const payload = useMemo(() => ({
    user_id: Number(formData.user_id),
    account_id: Number(formData.account_id),
    payee_id: formData.payee_id ? Number(formData.payee_id) : null,
    category_id: Number(formData.category_id),
    amount: Number(formData.amount),
    description: formData.description.trim() || null,
    frequency: formData.frequency,
    day_of_month: formData.day_of_month ? Number(formData.day_of_month) : null,
    start_date: formData.start_date,
    end_date: formData.end_date.trim() || null,
    next_due_date: formData.next_due_date || formData.start_date,
    is_active: formData.is_active ? 1 : 0,
  }), [formData]);

  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setStatus("");

    try {
      const amount = validateCategorySignedAmount(formData.amount, selectedCategoryType);
      const savePayload = { ...payload, amount };

      if (isEdit) {
        await updateRows({
          table: "recurring_transactions",
          data: savePayload,
          where: "id = ?",
          whereParams: [recordId],
        });
        setStatus("Recurring bill updated.");
      } else {
        await insertRow({ table: "recurring_transactions", data: savePayload });
        setStatus("Recurring bill saved.");
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
          { label: "Recurring Bills", to: `/app/${appName}/recurring_transactions` },
          { label: isEdit ? "Edit" : "New" },
        ]}
        title={isEdit ? "Edit recurring bill" : "New recurring bill"}
        subtitle="Schedule repeating income or expenses and post them when due."
      />

      <section className="panel">
        {loading && <p className="subtext">Loading form...</p>}
        {!loading && (
          <form className="form form-shell" onSubmit={handleSubmit}>
            <FormActions
              saving={saving}
              submitLabel={isEdit ? "Update recurring bill" : "Save recurring bill"}
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
              Account
              <select value={formData.account_id} onChange={(event) => handleChange("account_id", event.target.value)} required>
                <option value="">Select account</option>
                {accountOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Payee
              <select value={formData.payee_id} onChange={(event) => handleChange("payee_id", event.target.value)}>
                <option value="">Optional payee</option>
                {payeeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Category
              <select value={formData.category_id} onChange={(event) => handleChange("category_id", event.target.value)} required>
                <option value="">Select category</option>
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Amount
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(event) => handleChange("amount", event.target.value)}
                className={amountClassName || undefined}
                required
              />
              {amountHint && <span className="field-hint">{amountHint}</span>}
            </label>

            <label>
              Frequency
              <select value={formData.frequency} onChange={(event) => handleChange("frequency", event.target.value)} required>
                {FREQUENCY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field-full">
              Description
              <input
                value={formData.description}
                onChange={(event) => handleChange("description", event.target.value)}
                placeholder="Rent, Netflix, paycheck, etc."
              />
            </label>

            {formData.frequency === "monthly" && (
              <label>
                Day of month
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.day_of_month}
                  onChange={(event) => handleChange("day_of_month", event.target.value)}
                  placeholder="Optional, e.g. 1 for the 1st"
                />
              </label>
            )}

            <label>
              Start date
              <input
                type="date"
                value={formData.start_date}
                onChange={(event) => handleChange("start_date", event.target.value)}
                required
              />
            </label>

            <label>
              Next due date
              <input
                type="date"
                value={formData.next_due_date}
                onChange={(event) => handleChange("next_due_date", event.target.value)}
                required
              />
            </label>

            <label className="form-field-full">
              End date
              <input type="date" value={formData.end_date} onChange={(event) => handleChange("end_date", event.target.value)} />
              <span className="field-hint">Optional. The schedule stops after this date.</span>
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

export default RecurringFormPage;
