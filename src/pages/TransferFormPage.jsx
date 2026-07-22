import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, ArrowRight } from "lucide-react";
import { useLocation, useParams, useSearchParams } from "react-router-dom";
import { runQuery, selectRows } from "../api/dbApi";
import {
  createTransfer,
  deleteTransaction,
  getTransfer,
  updateTransfer,
} from "../api/transactionApi";
import ConfirmModal from "../components/common/ConfirmModal";
import FormActions from "../components/FormActions";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";
import { useBrowseReturn } from "../hooks/useBrowseReturn";
import { formatCurrency } from "../utils/format";
import {
  buildTransferLegAmounts,
  formatTransferPreview,
  getTransferKindLabel,
} from "../utils/money";
import { buildForeignKeyOptionLabel } from "../utils/tableForm";
import { buildUserOptions } from "../utils/userReferences";

function TransferFormPage() {
  const { appName = "budget", recordId } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { goBack } = useBrowseReturn(`/app/${appName}/transactions`);
  const { user } = useAuth();
  const isEdit = Boolean(recordId);

  const prefillFrom =
    !isEdit &&
    (searchParams.get("from") ||
      (location.state?.fromAccountId != null ? String(location.state.fromAccountId) : "") ||
      (location.state?.accountId != null ? String(location.state.accountId) : "") ||
      "");

  const [formData, setFormData] = useState({
    user_id: "",
    from_account_id: prefillFrom || "",
    to_account_id: "",
    category_id: "",
    amount: "",
    description: "",
    transaction_date: new Date().toISOString().slice(0, 10),
  });
  const [accountOptions, setAccountOptions] = useState([]);
  const [accountTypeById, setAccountTypeById] = useState({});
  const [accountNameById, setAccountNameById] = useState({});
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [userOptions, setUserOptions] = useState([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const [accountsResult, categoriesResult, usersResult] = await Promise.all([
          runQuery({
            sql: `
              SELECT a.id, a.name, at.name AS account_type_name
              FROM accounts a
              JOIN account_types at ON at.id = a.account_type_id
              ORDER BY a.name
            `,
          }),
          runQuery({
            sql: `
              SELECT c.id, c.name, ct.name AS category_type
              FROM categories c
              JOIN category_types ct ON ct.id = c.type_id
              ORDER BY
                CASE WHEN LOWER(ct.name) = 'transfer' THEN 0 ELSE 1 END,
                c.name
            `,
          }),
          selectRows({ table: "users", limit: 500 }),
        ]);

        if (!active) return;

        const accounts = accountsResult.rows ?? [];
        const categories = categoriesResult.rows ?? [];
        const users = usersResult.rows ?? [];

        setUserOptions(buildUserOptions(users));
        setAccountOptions(
          accounts.map((row) => ({
            value: String(row.id),
            label: buildForeignKeyOptionLabel(row, "id", "accounts"),
          }))
        );
        setAccountTypeById(
          Object.fromEntries(accounts.map((row) => [String(row.id), row.account_type_name]))
        );
        setAccountNameById(
          Object.fromEntries(accounts.map((row) => [String(row.id), row.name]))
        );
        setCategoryOptions(
          categories.map((row) => ({
            value: String(row.id),
            label: buildForeignKeyOptionLabel(row, "id", "categories"),
          }))
        );

        if (isEdit) {
          const result = await getTransfer(recordId);
          const transfer = result.transaction;
          if (!transfer) {
            throw new Error("Transfer not found.");
          }
          if (transfer.transaction_kind !== "transfer" && !transfer.from_account_id) {
            throw new Error("This record is not a transfer.");
          }

          setFormData({
            user_id: transfer.user_id ? String(transfer.user_id) : "",
            from_account_id: transfer.from_account_id ? String(transfer.from_account_id) : "",
            to_account_id: transfer.to_account_id ? String(transfer.to_account_id) : "",
            category_id: transfer.category_id ? String(transfer.category_id) : "",
            amount:
              transfer.amount === null || transfer.amount === undefined
                ? ""
                : String(Math.abs(Number(transfer.amount))),
            description: transfer.description ?? "",
            transaction_date: transfer.transaction_date ?? "",
          });
        } else {
          setFormData((prev) => ({
            ...prev,
            user_id: user?.id ? String(user.id) : prev.user_id,
            from_account_id: prev.from_account_id || prefillFrom || "",
          }));
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
  }, [isEdit, prefillFrom, recordId, user?.id]);

  const transferPreview = useMemo(() => {
    const abs = Math.abs(Number(formData.amount));
    if (
      !formData.from_account_id ||
      !formData.to_account_id ||
      formData.from_account_id === formData.to_account_id ||
      !Number.isFinite(abs) ||
      abs === 0
    ) {
      return null;
    }

    try {
      const legs = buildTransferLegAmounts(
        accountTypeById[formData.from_account_id],
        accountTypeById[formData.to_account_id],
        abs
      );
      return {
        ...legs,
        label: formatTransferPreview({
          fromName: accountNameById[formData.from_account_id],
          toName: accountNameById[formData.to_account_id],
          fromAmount: legs.fromAmount,
          toAmount: legs.toAmount,
          kind: legs.kind,
          formatCurrency,
        }),
        kindLabel: getTransferKindLabel(legs.kind),
      };
    } catch {
      return null;
    }
  }, [
    accountNameById,
    accountTypeById,
    formData.amount,
    formData.from_account_id,
    formData.to_account_id,
  ]);

  const toAccountOptions = useMemo(
    () => accountOptions.filter((option) => option.value !== formData.from_account_id),
    [accountOptions, formData.from_account_id]
  );

  const fromAccountOptions = useMemo(
    () => accountOptions.filter((option) => option.value !== formData.to_account_id),
    [accountOptions, formData.to_account_id]
  );

  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSwap = () => {
    setFormData((prev) => ({
      ...prev,
      from_account_id: prev.to_account_id,
      to_account_id: prev.from_account_id,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setStatus("");

    try {
      const abs = Math.abs(Number(formData.amount));
      if (!formData.from_account_id || !formData.to_account_id) {
        throw new Error("Choose both From and To accounts.");
      }
      if (formData.from_account_id === formData.to_account_id) {
        throw new Error("From and To accounts must be different.");
      }
      if (!Number.isFinite(abs) || abs <= 0) {
        throw new Error("Enter a positive transfer amount.");
      }
      if (!formData.category_id) {
        throw new Error("Category is required.");
      }

      const payload = {
        from_account_id: formData.from_account_id,
        to_account_id: formData.to_account_id,
        amount: abs,
        category_id: formData.category_id,
        user_id: formData.user_id,
        transaction_date: formData.transaction_date,
        description: formData.description,
      };

      if (isEdit) {
        await updateTransfer(recordId, payload);
        setStatus("Transfer updated.");
      } else {
        await createTransfer(payload);
        setStatus("Transfer saved.");
      }

      setTimeout(() => goBack(), 250);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isEdit) return;

    setSaving(true);
    setError("");
    setShowDeleteConfirm(false);

    try {
      await deleteTransaction(recordId);
      goBack();
    } catch (deleteError) {
      setError(deleteError.message);
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: appName, to: `/app/${appName}` },
          { label: "Transactions", to: `/app/${appName}/transactions` },
          { label: isEdit ? "Edit transfer" : "New transfer" },
        ]}
        title={isEdit ? "Edit transfer" : "New transfer"}
        subtitle="Move money From one account To another. Enter a positive amount — the app applies the correct signs."
      />

      <section className="panel">
        {loading && <p className="subtext">Loading form...</p>}
        {!loading && (
          <form className="form transfer-form" onSubmit={handleSubmit}>
            <FormActions
              saving={saving}
              submitLabel={isEdit ? "Update transfer" : "Save transfer"}
              onCancel={() => goBack()}
              onDelete={isEdit ? () => setShowDeleteConfirm(true) : undefined}
            >
              {error && <p className="error">{error}</p>}
              {status && <p className="status">{status}</p>}

              <div className="transfer-flow">
              <label className="transfer-account-field">
                From account
                <select
                  value={formData.from_account_id}
                  onChange={(event) => handleChange("from_account_id", event.target.value)}
                  required
                >
                  <option value="">Select account</option>
                  {fromAccountOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="transfer-flow-controls">
                <ArrowRight className="transfer-flow-arrow" size={22} aria-hidden="true" />
                <button
                  type="button"
                  className="transfer-swap-button"
                  onClick={handleSwap}
                  disabled={!formData.from_account_id && !formData.to_account_id}
                  title="Swap From and To"
                  aria-label="Swap From and To accounts"
                >
                  <ArrowLeftRight size={18} aria-hidden="true" />
                  Swap
                </button>
              </div>

              <label className="transfer-account-field">
                To account
                <select
                  value={formData.to_account_id}
                  onChange={(event) => handleChange("to_account_id", event.target.value)}
                  required
                >
                  <option value="">Select account</option>
                  {toAccountOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="form-grid two-col">
              <label>
                Amount
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.amount}
                  onChange={(event) => handleChange("amount", event.target.value)}
                  required
                />
                <span className="field-hint">Always enter a positive amount.</span>
              </label>

              <label>
                Date
                <input
                  type="date"
                  value={formData.transaction_date}
                  onChange={(event) => handleChange("transaction_date", event.target.value)}
                  required
                />
              </label>

              <label>
                Category
                <select
                  value={formData.category_id}
                  onChange={(event) => handleChange("category_id", event.target.value)}
                  required
                >
                  <option value="">Select category</option>
                  {categoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                User
                <select
                  value={formData.user_id}
                  onChange={(event) => handleChange("user_id", event.target.value)}
                  required
                >
                  <option value="">Select user</option>
                  {userOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label>
              Memo / description
              <input
                value={formData.description}
                onChange={(event) => handleChange("description", event.target.value)}
                placeholder="Savings transfer, credit card payment, etc."
              />
            </label>

            {transferPreview && (
              <div className="transfer-preview" role="status">
                <strong>Preview</strong>
                <p>{transferPreview.label}</p>
                <span className="field-hint">
                  This will post as a {transferPreview.kindLabel} with linked entries on both
                  accounts.
                </span>
              </div>
            )}
            </FormActions>
          </form>
        )}
      </section>

      {showDeleteConfirm && (
        <ConfirmModal
          title="Delete transfer?"
          message="This archives both linked transfer entries."
          confirmLabel={saving ? "Deleting..." : "Delete"}
          onCancel={() => !saving && setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
        />
      )}
    </>
  );
}

export default TransferFormPage;
