import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";
import { runQuery, selectRows } from "../api/dbApi";
import { matchPayeeRules } from "../api/budgetApi";
import {
  createTransaction,
  deleteTransaction,
  getTransaction,
  updateTransaction,
  uploadTransactionAttachment,
} from "../api/transactionApi";
import BrowseLink from "../components/BrowseLink";
import ConfirmModal from "../components/common/ConfirmModal";
import FormActions from "../components/FormActions";
import PageHeader from "../components/PageHeader";
import TransactionAttachmentsPanel from "../components/TransactionAttachmentsPanel";
import { useAuth } from "../context/AuthContext";
import { useBrowseReturn } from "../hooks/useBrowseReturn";
import { buildForeignKeyOptionLabel } from "../utils/tableForm";
import { buildUserOptions } from "../utils/userReferences";
import {
  getDefaultLiabilityEntryMode,
  getMoneyFieldHint,
  getSignedAmountClass,
  isLiabilityAccountType,
  isLoanAccountType,
  resolveLiabilityTransactionAmount,
  validateCategorySignedAmount,
} from "../utils/money";
function createEmptySplitLine() {
  return { category_id: "", amount: "" };
}

function buildPendingFromReceiptImage(receiptImage) {
  if (!receiptImage?.imageBase64) {
    return [];
  }

  return [
    {
      key: `receipt-${receiptImage.fileName || "receipt.jpg"}`,
      fileBase64: receiptImage.imageBase64,
      mimeType: receiptImage.mimeType || "image/jpeg",
      filename: receiptImage.fileName || "receipt.jpg",
      source: "receipt_scan",
      previewUrl: receiptImage.imageBase64,
    },
  ];
}

function TransactionFormPage() {
  const { appName = "budget", recordId } = useParams();
  const location = useLocation();
  const { goBack } = useBrowseReturn(`/app/${appName}/transactions`);
  const { user } = useAuth();
  const isEdit = Boolean(recordId);
  const receiptDraft = !isEdit ? location.state?.receiptDraft ?? null : null;
  const receiptImage = !isEdit ? location.state?.receiptImage ?? null : null;
  const prefillAccountId =
    !isEdit && location.state?.accountId != null && String(location.state.accountId) !== ""
      ? String(location.state.accountId)
      : "";
  const receiptDraftKey = receiptDraft ? JSON.stringify(receiptDraft) : "";
  const receiptDraftAppliedRef = useRef("");
  const receiptImageAppliedRef = useRef(false);
  const [formData, setFormData] = useState({
    user_id: "",
    account_id: prefillAccountId,
    payee_id: "",
    category_id: "",
    amount: "",
    description: "",
    transaction_date: new Date().toISOString().slice(0, 10),
  });
  const [useSplits, setUseSplits] = useState(false);
  const [splitLines, setSplitLines] = useState([createEmptySplitLine(), createEmptySplitLine()]);
  const [accountOptions, setAccountOptions] = useState([]);
  const [accountTypeById, setAccountTypeById] = useState({});
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [payeeOptions, setPayeeOptions] = useState([]);
  const [payeeDefaultCategoryById, setPayeeDefaultCategoryById] = useState({});
  const [payeeDescriptionById, setPayeeDescriptionById] = useState({});
  const [categoryTypeById, setCategoryTypeById] = useState({});
  const [userOptions, setUserOptions] = useState([]);
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [ruleHint, setRuleHint] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [redirectToTransferId, setRedirectToTransferId] = useState(null);
  const [receiptPrefillNotice, setReceiptPrefillNotice] = useState("");
  const [liabilityEntryMode, setLiabilityEntryMode] = useState("payment");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const [accountsResult, categoriesResult, payeesResult, usersResult] = await Promise.all([
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
              ORDER BY c.name
            `,
          }),
          selectRows({ table: "payees", limit: 500 }),
          selectRows({ table: "users", limit: 500 }),
        ]);

        if (!active) return;

        const accounts = accountsResult.rows ?? [];
        const categories = categoriesResult.rows ?? [];
        const payees = payeesResult.rows ?? [];
        const users = usersResult.rows ?? [];

        setUserOptions(buildUserOptions(users));
        setAccountOptions(
          accounts.map((row) => ({
            value: String(row.id),
            label: row.account_type_name
              ? `${buildForeignKeyOptionLabel(row, "id", "accounts")} (${row.account_type_name})`
              : buildForeignKeyOptionLabel(row, "id", "accounts"),
          }))
        );
        setAccountTypeById(
          Object.fromEntries(accounts.map((row) => [String(row.id), row.account_type_name]))
        );
        const accountTypes = Object.fromEntries(
          accounts.map((row) => [String(row.id), row.account_type_name])
        );
        setCategoryOptions(
          categories.map((row) => ({
            value: String(row.id),
            label: buildForeignKeyOptionLabel(row, "id", "categories"),
          }))
        );
        setCategoryTypeById(
          Object.fromEntries(categories.map((row) => [String(row.id), row.category_type]))
        );
        setPayeeOptions(
          payees.map((row) => ({
            value: String(row.id),
            label: row.name,
          }))
        );
        setPayeeDefaultCategoryById(
          Object.fromEntries(
            payees.map((row) => [String(row.id), row.default_category_id ? String(row.default_category_id) : ""])
          )
        );
        setPayeeDescriptionById(
          Object.fromEntries(
            payees.map((row) => [
              String(row.id),
              row.description ? String(row.description).trim() : "",
            ])
          )
        );

        if (isEdit) {
          const result = await getTransaction(recordId);
          const transaction = result.transaction;
          if (!transaction) {
            throw new Error("Transaction not found.");
          }

          if (
            transaction.transaction_kind === "transfer" ||
            (transaction.from_account_id && transaction.to_account_id)
          ) {
            setRedirectToTransferId(String(recordId));
            return;
          }

          setFormData({
            user_id: transaction.user_id ? String(transaction.user_id) : "",
            account_id: transaction.account_id ? String(transaction.account_id) : "",
            payee_id: transaction.payee_id ? String(transaction.payee_id) : "",
            category_id: transaction.category_id ? String(transaction.category_id) : "",
            amount:
              transaction.amount === null || transaction.amount === undefined
                ? ""
                : String(Math.abs(Number(transaction.amount))),
            description: transaction.description ?? "",
            transaction_date: transaction.transaction_date ?? "",
          });
          const accountTypeName = accountTypes[String(transaction.account_id)] ?? "";
          if (isLiabilityAccountType(accountTypeName)) {
            setLiabilityEntryMode(Number(transaction.amount) < 0 ? "payment" : "charge");
          }
          setReceiptPrefillNotice("");

          if (transaction.splits?.length > 0) {
            setUseSplits(true);
            setSplitLines(
              transaction.splits.map((split) => ({
                category_id: String(split.category_id),
                amount: String(split.amount),
              }))
            );
          }
        } else {
          const shouldApplyDraft =
            Boolean(receiptDraftKey) && receiptDraftAppliedRef.current !== receiptDraftKey;
          const draft = shouldApplyDraft ? receiptDraft : null;
          if (shouldApplyDraft) {
            receiptDraftAppliedRef.current = receiptDraftKey;
          }
          setFormData((prev) => ({
            ...prev,
            user_id: user?.id ? String(user.id) : prev.user_id,
            account_id: draft ? prefillAccountId || "" : prev.account_id || prefillAccountId,
            amount:
              draft?.amount !== undefined && draft?.amount !== null && draft?.amount !== ""
                ? String(draft.amount)
                : prev.amount,
            description: draft?.description ? String(draft.description) : prev.description,
            transaction_date: draft?.transaction_date
              ? String(draft.transaction_date)
              : prev.transaction_date,
            category_id: draft?.category_id ? String(draft.category_id) : prev.category_id,
          }));
          if (draft) {
            setReceiptPrefillNotice(
              prefillAccountId
                ? "Prefilled from receipt — review and save. The receipt photo will attach automatically."
                : "Prefilled from receipt — choose an account and save. The receipt photo will attach automatically."
            );
          } else {
            setReceiptPrefillNotice("");
          }

          const initialAccountId = draft ? prefillAccountId || "" : prefillAccountId;
          if (initialAccountId && isLiabilityAccountType(accountTypes[initialAccountId] ?? "")) {
            setLiabilityEntryMode(getDefaultLiabilityEntryMode(accountTypes[initialAccountId]));
          }
          if (!receiptImageAppliedRef.current && receiptImage?.imageBase64) {
            receiptImageAppliedRef.current = true;
            setPendingAttachments(buildPendingFromReceiptImage(receiptImage));
          }
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
  }, [isEdit, prefillAccountId, receiptDraft, receiptDraftKey, receiptImage, recordId, user?.id]);

  const selectedCategoryType = categoryTypeById[formData.category_id] ?? "";
  const selectedAccountType = accountTypeById[formData.account_id] ?? "";
  const selectedAccountIsLiability = isLiabilityAccountType(selectedAccountType);
  const selectedAccountIsLoan = isLoanAccountType(selectedAccountType);
  const amountHint = selectedAccountIsLiability
    ? liabilityEntryMode === "payment"
      ? "Enter the payment as a positive amount. This reduces amount owed."
      : selectedAccountIsLoan
        ? "Enter a fee or added charge as a positive amount. This increases amount owed."
        : "Enter the charge as a positive amount. This increases amount owed."
    : getMoneyFieldHint("transactions", "amount", {
        isTransfer: false,
        categoryType: selectedCategoryType,
        accountTypeName: selectedAccountType,
      });
  const previewNumeric = Number(formData.amount);
  const signedPreviewAmount =
    selectedAccountIsLiability && formData.amount !== "" && Number.isFinite(previewNumeric)
      ? (liabilityEntryMode === "payment" ? -1 : 1) * Math.abs(previewNumeric)
      : previewNumeric;
  const amountClassName = getSignedAmountClass(
    selectedAccountIsLiability ? signedPreviewAmount : formData.amount
  );
  const transferPath = `/app/${appName}/transfers/new`;
  const transferState = formData.account_id
    ? { fromAccountId: String(formData.account_id), accountId: String(formData.account_id) }
    : prefillAccountId
      ? { fromAccountId: prefillAccountId, accountId: prefillAccountId }
      : undefined;

  const splitTotal = useMemo(
    () =>
      splitLines.reduce((sum, line) => {
        const numeric = Number(line.amount);
        return Number.isFinite(numeric) ? sum + numeric : sum;
      }, 0),
    [splitLines]
  );

  const handleChange = (name, value) => {
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "account_id") {
        const nextType = accountTypeById[value] ?? "";
        if (isLiabilityAccountType(nextType)) {
          setLiabilityEntryMode(getDefaultLiabilityEntryMode(nextType));
        }
      }
      if (name === "payee_id" && value) {
        if (payeeDefaultCategoryById[value] && !prev.category_id) {
          next.category_id = payeeDefaultCategoryById[value];
        }

        const payeeDescription = payeeDescriptionById[value] || "";
        const previousPayeeDescription = prev.payee_id
          ? payeeDescriptionById[prev.payee_id] || ""
          : "";
        const descriptionIsEmpty = !String(prev.description || "").trim();
        const descriptionWasAutofilled =
          previousPayeeDescription &&
          String(prev.description || "").trim() === previousPayeeDescription;

        if (payeeDescription && (descriptionIsEmpty || descriptionWasAutofilled)) {
          next.description = payeeDescription;
        }
      }
      return next;
    });
  };

  const applyRuleMatch = async () => {
    if (!formData.description.trim()) {
      setRuleHint("");
      return;
    }

    try {
      const match = await matchPayeeRules(formData.description, formData.account_id || null);
      if (match?.category_id) {
        setFormData((prev) => ({
          ...prev,
          category_id: prev.category_id || String(match.category_id),
          payee_id: prev.payee_id || (match.payee_id ? String(match.payee_id) : prev.payee_id),
        }));
        setRuleHint("Matched a payee rule and suggested a category.");
      } else {
        setRuleHint("");
      }
    } catch {
      setRuleHint("");
    }
  };

  const buildPayload = () => {
    const amount = selectedAccountIsLiability
      ? resolveLiabilityTransactionAmount(formData.amount, liabilityEntryMode)
      : validateCategorySignedAmount(
          formData.amount,
          selectedCategoryType,
          selectedAccountType
        );

    const payload = {
      user_id: formData.user_id,
      account_id: formData.account_id,
      payee_id: formData.payee_id || null,
      category_id: formData.category_id,
      amount,
      description: formData.description,
      transaction_date: formData.transaction_date,
    };

    if (useSplits) {
      if (!splitLines[0]?.category_id) {
        throw new Error("Choose at least one split category.");
      }
      payload.category_id = splitLines[0].category_id;
      const sign = amount < 0 ? -1 : 1;
      payload.splits = splitLines.map((line) => ({
        category_id: line.category_id,
        amount: Math.abs(Number(line.amount)) * sign,
      }));
    }

    return payload;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setStatus("");

    try {
      if (useSplits) {
        if (splitLines.length < 2) {
          throw new Error("Split transactions need at least two lines.");
        }
        if (Math.abs(splitTotal - Number(formData.amount)) > 0.005) {
          throw new Error("Split lines must sum to the transaction amount.");
        }
      }

      const payload = buildPayload();
      if (isEdit) {
        await updateTransaction(recordId, payload);
        setStatus("Transaction updated.");
      } else {
        const result = await createTransaction(payload);
        const newId = result.id;
        const toAttach = [...pendingAttachments];
        if (newId && toAttach.length > 0) {
          for (const attachment of toAttach) {
            await uploadTransactionAttachment(newId, {
              fileBase64: attachment.fileBase64,
              mimeType: attachment.mimeType,
              filename: attachment.filename,
              source: attachment.source || "upload",
            });
          }
          setPendingAttachments([]);
        }
        setStatus(
          toAttach.length > 0 ? "Transaction saved with attachments." : "Transaction saved."
        );
      }

      setTimeout(() => goBack(), 250);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isEdit) {
      return;
    }

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

  const updateSplitLine = (index, field, value) => {
    setSplitLines((prev) =>
      prev.map((line, lineIndex) => (lineIndex === index ? { ...line, [field]: value } : line))
    );
  };

  const addSplitLine = () => {
    setSplitLines((prev) => [...prev, createEmptySplitLine()]);
  };

  const removeSplitLine = (index) => {
    setSplitLines((prev) => prev.filter((_, lineIndex) => lineIndex !== index));
  };

  if (redirectToTransferId) {
    return <Navigate to={`/app/${appName}/transfers/${redirectToTransferId}/edit`} replace />;
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: appName, to: `/app/${appName}` },
          { label: "Transactions", to: `/app/${appName}/transactions` },
          { label: isEdit ? "Edit" : "New" },
        ]}
        title={isEdit ? "Edit transaction" : "New transaction"}
        subtitle={
          useSplits
            ? "Split one purchase across multiple categories."
            : selectedAccountIsLiability
              ? selectedAccountIsLoan
                ? "Choose Payment to pay down the loan, or Fee / charge for interest and fees. Enter positive amounts."
                : "Choose Payment or Charge, then enter a positive amount."
              : "Use positive amounts for deposits and negative amounts for withdrawals."
        }
      />

      <section className="panel">
        {loading && <p className="subtext">Loading form...</p>}
        {!loading && (
          <form className="form checkbook-form" onSubmit={handleSubmit}>
            <FormActions
              saving={saving}
              submitLabel={isEdit ? "Update transaction" : "Save transaction"}
              onCancel={() => goBack()}
              onDelete={isEdit ? () => setShowDeleteConfirm(true) : undefined}
            >
              {receiptPrefillNotice && <p className="status">{receiptPrefillNotice}</p>}

              <div className="checkbook-layout">
              <aside className="checkbook-attachments">
                <TransactionAttachmentsPanel
                  transactionId={isEdit ? recordId : null}
                  pendingAttachments={isEdit ? [] : pendingAttachments}
                  onPendingAttachmentsChange={setPendingAttachments}
                  disabled={saving}
                />
              </aside>

              <div className="checkbook-main">
                <div className="checkbook-slip">
                  <div className="checkbook-slip-head">
                    <p className="checkbook-slip-title">Transaction</p>
                    <span className="subtext">{isEdit ? `Record #${recordId}` : "New entry"}</span>
                  </div>

                  <div className="checkbook-top-row">
                    <label>
                      Account
                      <select
                        value={formData.account_id}
                        onChange={(event) => handleChange("account_id", event.target.value)}
                        required
                      >
                        <option value="">Select account</option>
                        {accountOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <span className="field-hint">
                        {selectedAccountIsLiability
                          ? selectedAccountIsLoan
                            ? "Loans track amount owed. Use Payment to pay it down."
                            : "Credit cards track amount owed. Use Payment or Charge below."
                          : "The account this transaction applies to."}
                      </span>
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
                  </div>

                  {selectedAccountIsLiability ? (
                    <fieldset className="liability-entry-fieldset">
                      <legend>What kind of entry is this?</legend>
                      <div className="liability-entry-mode" role="group" aria-label="Entry type">
                        <button
                          type="button"
                          className={`liability-entry-mode-button${
                            liabilityEntryMode === "payment" ? " active" : ""
                          }`}
                          onClick={() => setLiabilityEntryMode("payment")}
                        >
                          Payment
                          <span>Reduces amount owed</span>
                        </button>
                        <button
                          type="button"
                          className={`liability-entry-mode-button${
                            liabilityEntryMode === "charge" ? " active" : ""
                          }`}
                          onClick={() => setLiabilityEntryMode("charge")}
                        >
                          {selectedAccountIsLoan ? "Fee / charge" : "Charge"}
                          <span>Increases amount owed</span>
                        </button>
                      </div>
                    </fieldset>
                  ) : formData.account_id ? (
                    <p className="field-hint liability-entry-hint">
                      Select a loan or credit card account above to choose Payment vs Charge.
                      To pay a loan from checking/savings, use{" "}
                      <BrowseLink to={`/app/${appName}/transfers/new`}>Transfer</BrowseLink> instead.
                    </p>
                  ) : null}

                  <div className="checkbook-pay-row">
                    <label>
                      Pay to the order of
                      <select
                        value={formData.payee_id}
                        onChange={(event) => handleChange("payee_id", event.target.value)}
                      >
                        <option value="">Optional payee</option>
                        {payeeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="checkbook-amount">
                      Amount
                      <input
                        type="number"
                        step="0.01"
                        min={selectedAccountIsLiability ? "0.01" : undefined}
                        value={formData.amount}
                        onChange={(event) => handleChange("amount", event.target.value)}
                        className={amountClassName || undefined}
                        required
                      />
                    </label>
                  </div>
                  {amountHint && <span className="field-hint">{amountHint}</span>}
                  {selectedAccountIsLiability && formData.amount !== "" && Number.isFinite(signedPreviewAmount) ? (
                    <span className="field-hint">
                      Will post as{" "}
                      <strong className={amountClassName || undefined}>
                        {signedPreviewAmount.toFixed(2)}
                      </strong>{" "}
                      ({liabilityEntryMode === "payment" ? "reduces" : "increases"} amount owed).
                    </span>
                  ) : null}

                  <label className="checkbook-memo">
                    Memo / description
                    <input
                      value={formData.description}
                      onChange={(event) => handleChange("description", event.target.value)}
                      onBlur={applyRuleMatch}
                      placeholder="Electric bill, credit card payment, etc."
                    />
                    {ruleHint && <span className="field-hint">{ruleHint}</span>}
                  </label>

                  <div className="checkbook-meta-row">
                    {!useSplits ? (
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
                    ) : (
                      <div />
                    )}

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

                  <div className="checkbook-options">
                    {!isEdit && (
                      <div className="transfer-instead-callout">
                        <p className="subtext">
                          {selectedAccountIsLiability
                            ? "Paying from a bank account? Use a transfer so cash and amount owed both update."
                            : "Moving money between accounts? Use the transfer form for From → To payments and advances."}
                        </p>
                        <BrowseLink className="button" to={transferPath} state={transferState}>
                          {selectedAccountIsLiability ? "Pay with a transfer" : "Make a transfer instead"}
                        </BrowseLink>
                      </div>
                    )}

                    <label className="checkbox-field">
                      <span className="checkbox-row">
                        <input
                          type="checkbox"
                          checked={useSplits}
                          onChange={(event) => {
                            setUseSplits(event.target.checked);
                            if (event.target.checked && splitLines.length < 2) {
                              setSplitLines([createEmptySplitLine(), createEmptySplitLine()]);
                            }
                          }}
                        />
                        <span>Split across categories</span>
                      </span>
                    </label>

                    {useSplits && (
                      <div className="split-lines-panel">
                        <div className="split-lines-head">
                          <strong>Split lines</strong>
                          <span className="stat-meta">
                            Total: {splitTotal.toFixed(2)} / {Number(formData.amount || 0).toFixed(2)}
                          </span>
                        </div>
                        {splitLines.map((line, index) => (
                          <div key={`split-${index}`} className="split-line-row">
                            <select
                              value={line.category_id}
                              onChange={(event) =>
                                updateSplitLine(index, "category_id", event.target.value)
                              }
                              required
                            >
                              <option value="">Category</option>
                              {categoryOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              step="0.01"
                              value={line.amount}
                              onChange={(event) => updateSplitLine(index, "amount", event.target.value)}
                              placeholder="Amount"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => removeSplitLine(index)}
                              disabled={splitLines.length <= 2}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                        <button type="button" onClick={addSplitLine}>
                          Add split line
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              </div>
            </FormActions>
          </form>
        )}
        {status && <p className="status">{status}</p>}
        {error && <p className="error">{error}</p>}
      </section>

      {showDeleteConfirm && (
        <ConfirmModal
          title="Delete transaction?"
          message="Remove this transaction? Linked payment entries will also be archived. You can restore them from Administration > Deleted Records."
          confirmLabel={saving ? "Deleting..." : "Delete"}
          busy={saving}
          onCancel={() => !saving && setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
        />
      )}
    </>
  );
}

export default TransactionFormPage;
