import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getAccountJointUsers, setAccountJointUsers, syncAccountBalance } from "../api/budgetApi";
import { deleteRows, insertRow, runQuery, selectRows, updateRows } from "../api/dbApi";
import { getCollectionDefinition, getFieldDefinitions } from "../api/dictionaryApi";
import AccountImageUpload from "../components/AccountImageUpload";
import AccountBalanceTrendChart from "../components/AccountBalanceTrendChart";
import AccountTransactionsPanel from "../components/AccountTransactionsPanel";
import SpendingByCategoryPieChart from "../components/SpendingByCategoryPieChart";
import TableFormFields from "../components/TableFormFields";
import ConfirmModal from "../components/common/ConfirmModal";
import FormActions from "../components/FormActions";
import PageHeader from "../components/PageHeader";
import { useBrowseReturn } from "../hooks/useBrowseReturn";
import { useAccountEditTab } from "../hooks/useAccountEditTab";
import { getRecordLabel, normalizeValue } from "../utils/tableForm";
import {
  getMoneyFieldHint,
  getSignedAmountClass,
  isLiabilityAccountType,
  isLoanAccountType,
  isMoneyField,
  normalizeBudgetMoneyField,
} from "../utils/money";
import {
  filterAccountFormColumns,
  filterVisibleAccountFormColumns,
  getAccountOpeningBalanceLabel,
  getHiddenAccountFieldDefaults,
  isSiteAccountType,
  shouldShowSpendingByCategoryChart,
  sortAccountFormColumns,
} from "../utils/accounts";
import { formatCurrency } from "../utils/format";
import { filterEditableColumns, isAuditField } from "../utils/auditFields";
import {
  loadForeignKeyResources,
  resolveReferenceLabel,
} from "../utils/foreignKeyLabels";
import {
  formatUserReferenceValue,
  isUsersRefField,
} from "../utils/userReferences";
import { useAuth } from "../context/AuthContext";
import { useUserLabelMap } from "../hooks/useUserLabelMap";

function TableFormPage() {
  const { appName = "budget", table, recordId } = useParams();
  const { goBack } = useBrowseReturn(`/app/${appName}/${table}`);
  const isEdit = Boolean(recordId);
  const [columns, setColumns] = useState([]);
  const [pkColumn, setPkColumn] = useState("id");
  const [tableLabel, setTableLabel] = useState(table);
  const [columnLabels, setColumnLabels] = useState({});
  const [foreignKeys, setForeignKeys] = useState({});
  const [fkOptions, setFkOptions] = useState({});
  const [formData, setFormData] = useState({});
  const [labelMaps, setLabelMaps] = useState({});
  const [jointUserIds, setJointUserIds] = useState([]);
  const [userOptions, setUserOptions] = useState([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [refTableByColumn, setRefTableByColumn] = useState({});
  const [relatedReady, setRelatedReady] = useState(false);
  const userLabelMap = useUserLabelMap();
  const { user, isAdmin } = useAuth();
  const accountTypeName = resolveReferenceLabel(
    formData.account_type_id,
    labelMaps.account_types ?? {}
  );

  useEffect(() => {
    setRelatedReady(false);
  }, [appName, recordId, table]);

  useEffect(() => {
    if (loading || !isEdit || table !== "accounts") {
      return undefined;
    }

    // Defer related data until after the main form has painted.
    const frameId = window.requestAnimationFrame(() => {
      setRelatedReady(true);
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [isEdit, loading, table]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");

      try {
        const [tableDefinition, fieldDefinitions] = await Promise.all([
          getCollectionDefinition(table, appName),
          getFieldDefinitions(table, appName),
        ]);
        setTableLabel(tableDefinition?.label ?? table);
        setColumnLabels(
          Object.fromEntries(fieldDefinitions.map((field) => [field.name, field.label]))
        );

        const info = await runQuery({
          table,
          sql: `PRAGMA table_info(${table})`,
        });
        const tableColumns = info.rows ?? [];
        setColumns(tableColumns);

        const primaryColumn =
          tableColumns.find((column) => Number(column.pk) === 1)?.name ??
          tableColumns[0]?.name ??
          "id";
        setPkColumn(primaryColumn);

        const fkInfo = await runQuery({
          table,
          sql: `PRAGMA foreign_key_list(${table})`,
        });
        const fkRows = fkInfo.rows ?? [];

        const {
          refMetaByColumn,
          refTableByColumn: nextRefTableByColumn,
          labelMaps: nextLabelMaps,
          optionsByColumn,
        } = await loadForeignKeyResources({
          table,
          fieldDefinitions,
          pragmaForeignKeys: fkRows,
          columns: tableColumns,
        });

        setForeignKeys(refMetaByColumn);
        setRefTableByColumn(nextRefTableByColumn);
        setLabelMaps(nextLabelMaps);
        setFkOptions(optionsByColumn);
        setUserOptions(optionsByColumn.owner_user_id ?? optionsByColumn.user_id ?? []);

        if (table !== "accounts") {
          setJointUserIds([]);
        }

        if (isEdit) {
          const result = await selectRows({
            table,
            where: `${primaryColumn} = ?`,
            whereParams: [recordId],
            limit: 1,
          });
          const row = result.rows[0];
          if (!row) {
            throw new Error("Record not found.");
          }
          setFormData(
            Object.fromEntries(
              tableColumns.map((column) => [
                column.name,
                row[column.name] === null ? "" : String(row[column.name]),
              ])
            )
          );
          if (table === "accounts") {
            const joint = await getAccountJointUsers(recordId);
            setJointUserIds((joint.user_ids ?? []).map(String));
          }
        } else {
          setFormData(
            Object.fromEntries(
              tableColumns.map((column) => {
                if (table === "categories" && column.name === "tax_deductible") {
                  return [column.name, "0"];
                }
                if (table === "accounts" && column.name === "is_joint") {
                  return [column.name, "0"];
                }
                if (table === "accounts" && column.name === "owner_user_id" && user?.id) {
                  return [column.name, String(user.id)];
                }
                return [column.name, ""];
              })
            )
          );
          setJointUserIds([]);
        }
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [appName, isEdit, recordId, table, user?.id]);

  const editableColumns = useMemo(() => {
    const baseColumns = filterEditableColumns(
      columns.filter((column) => {
        const isPrimaryKey = Number(column.pk) === 1;
        const isIdColumn = column.name.toLowerCase() === "id";
        const isPkColumn = column.name === pkColumn;
        return !isPrimaryKey && !isIdColumn && !isPkColumn;
      })
    );

    if (table !== "accounts") {
      return baseColumns;
    }

    return filterVisibleAccountFormColumns(
      sortAccountFormColumns(filterAccountFormColumns(baseColumns)),
      accountTypeName
    );
  }, [accountTypeName, columns, pkColumn, table]);

  const readOnlyColumns = useMemo(() => {
    if (!isEdit) {
      return [];
    }

    return columns.filter((column) => isAuditField(column.name));
  }, [columns, isEdit]);

  const fieldInputTypes = useMemo(() => {
    const types = {};

    for (const column of editableColumns) {
      if (isMoneyField(table, column.name)) {
        types[column.name] = "number";
      }
    }

    if (table === "accounts") {
      types.login_url = "url";
      types.site_password = "password";
      types.notes = "textarea";
      types.is_joint = "yesno";
    }

    if (table === "categories") {
      types.tax_deductible = "yesno";
    }

    return types;
  }, [editableColumns, table]);

  const fieldHints = useMemo(() => {
    const hints = {};

    for (const column of editableColumns) {
      hints[column.name] = getMoneyFieldHint(table, column.name, { accountTypeName });
    }

    if (table === "categories") {
      hints.tax_deductible =
        "Choose Yes to include this category in the Tax category summary report. Use No for everything else.";
    }

    if (table === "accounts") {
      hints.owner_user_id =
        "The person whose name is on the account (for example the cardholder). This is separate from who added the account in the app.";
      hints.is_joint =
        "Yes if more than one person is on the account. You can then select additional joint users.";
    }

    return hints;
  }, [accountTypeName, editableColumns, table]);

  const moneyInputProps = useMemo(() => {
    const props = {};

    for (const column of editableColumns) {
      if (!isMoneyField(table, column.name)) {
        continue;
      }

      props[column.name] = {
        step: "0.01",
      };

      if (table === "budgets" && column.name === "amount") {
        props[column.name].min = "0.01";
      }
    }

    return props;
  }, [editableColumns, table]);

  const handleChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (table === "accounts" && name === "is_joint" && String(value) !== "1") {
      setJointUserIds([]);
    }

    if (table === "accounts" && name === "owner_user_id") {
      setJointUserIds((prev) => prev.filter((id) => id !== String(value)));
    }
  };

  const toggleJointUser = (userId, checked) => {
    const id = String(userId);
    setJointUserIds((prev) => {
      if (checked) {
        return prev.includes(id) ? prev : [...prev, id];
      }
      return prev.filter((value) => value !== id);
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setStatus("");

    try {
      const data = {};

      for (const column of editableColumns) {
        if (isMoneyField(table, column.name)) {
          data[column.name] = normalizeBudgetMoneyField(table, column.name, formData[column.name] ?? "", {
            accountTypeName,
          });
        } else {
          data[column.name] = normalizeValue(formData[column.name] ?? "", column.type, {
            fieldName: column.name,
          });
        }
      }

      if (table === "accounts") {
        const hiddenDefaults = getHiddenAccountFieldDefaults(accountTypeName, formData);
        for (const [fieldName, value] of Object.entries(hiddenDefaults)) {
          if (isMoneyField(table, fieldName)) {
            data[fieldName] = normalizeBudgetMoneyField(table, fieldName, value ?? "", {
              accountTypeName,
            });
          } else {
            data[fieldName] = value;
          }
        }

        if (!isEdit && user?.id && !data.user_id) {
          data.user_id = Number(user.id);
        }

        if (data.owner_user_id === "" || data.owner_user_id == null) {
          data.owner_user_id = user?.id ? Number(user.id) : null;
        }

        data.is_joint = Number(data.is_joint) === 1 ? 1 : 0;
      }

      let savedAccountId = isEdit ? Number(recordId) : null;

      if (isEdit) {
        await updateRows({
          table,
          data,
          where: `${pkColumn} = ?`,
          whereParams: [recordId],
        });
        setStatus("Record updated.");
      } else {
        const insertResult = await insertRow({ table, data });
        savedAccountId = Number(insertResult.lastID) || null;
        setStatus("Record created.");
      }

      if (table === "accounts" && savedAccountId) {
        await setAccountJointUsers(
          savedAccountId,
          Number(data.is_joint) === 1 ? jointUserIds.map(Number) : []
        );
        // Keep cached balance = opening_balance + transactions (so loan principal shows immediately).
        await syncAccountBalance(savedAccountId);
      }

      setTimeout(() => goBack(), 250);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    setError("");
    setStatus("");

    try {
      await deleteRows({
        table,
        where: `${pkColumn} = ?`,
        whereParams: [recordId],
      });
      goBack();
    } catch (deleteError) {
      setError(deleteError.message);
      setSaving(false);
      setShowDeleteConfirm(false);
    }
  };

  const readOnlyDisplayValues = useMemo(() => {
    const values = {};

    for (const column of readOnlyColumns) {
      const rawValue = formData[column.name];
      if (isUsersRefField(column.name, refTableByColumn[column.name])) {
        values[column.name] = formatUserReferenceValue(
          column.name,
          rawValue,
          userLabelMap,
          refTableByColumn
        );
      }
    }

    return values;
  }, [formData, readOnlyColumns, refTableByColumn, userLabelMap]);

  const recordSummary = getRecordLabel(formData, pkColumn, table);
  const isAccountEdit = table === "accounts" && isEdit;
  const showAccountTransactions = isAccountEdit && relatedReady;
  const { activeTab: accountTab, setActiveTab: setAccountTab } = useAccountEditTab();
  const accountIsLiability = isLiabilityAccountType(accountTypeName);
  const accountIsLoan = isLoanAccountType(accountTypeName);
  const accountIsSite = isSiteAccountType(accountTypeName);

  const accountOwnershipColumns = useMemo(() => {
    if (table !== "accounts") {
      return { beforeJoint: editableColumns, afterJoint: [] };
    }

    const jointIndex = editableColumns.findIndex((column) => column.name === "is_joint");
    if (jointIndex < 0) {
      return { beforeJoint: editableColumns, afterJoint: [] };
    }

    return {
      beforeJoint: editableColumns.slice(0, jointIndex + 1),
      afterJoint: editableColumns.slice(jointIndex + 1),
    };
  }, [editableColumns, table]);

  const accountColumnLabels = {
    ...columnLabels,
    owner_user_id: columnLabels.owner_user_id ?? "Owner",
    is_joint: columnLabels.is_joint ?? "Joint account",
    opening_balance: getAccountOpeningBalanceLabel(accountTypeName),
  };

  const jointUserChoices = userOptions.filter(
    (option) => option.value !== String(formData.owner_user_id ?? "")
  );

  const jointUsersField =
    table === "accounts" && Number(formData.is_joint) === 1 ? (
      <fieldset className="account-joint-users">
        <legend>Joint users</legend>
        <p className="subtext">
          Select other people on this account. The Owner above is already included and does not need
          to be listed again.
        </p>
        <div className="account-joint-user-list">
          {jointUserChoices.map((option) => (
            <label key={option.value} className="checkbox-field">
              <span className="checkbox-row">
                <input
                  type="checkbox"
                  checked={jointUserIds.includes(option.value)}
                  onChange={(event) => toggleJointUser(option.value, event.target.checked)}
                />
                <span>{option.label}</span>
              </span>
            </label>
          ))}
          {jointUserChoices.length === 0 && (
            <p className="subtext">
              Add another user in Administration before assigning joint owners.
            </p>
          )}
        </div>
      </fieldset>
    ) : null;

  const accountFormFields = (
    <>
      {isAccountEdit && (
        <AccountImageUpload
          accountId={recordId}
          hasImage={Boolean(formData.image_path)}
          onChanged={(hasImage) =>
            setFormData((prev) => ({ ...prev, image_path: hasImage ? "1" : "" }))
          }
        />
      )}
      <TableFormFields
        columns={accountOwnershipColumns.beforeJoint}
        foreignKeys={foreignKeys}
        fkOptions={fkOptions}
        formData={formData}
        columnLabels={accountColumnLabels}
        inputTypes={fieldInputTypes}
        fieldHints={fieldHints}
        inputProps={moneyInputProps}
        onChange={handleChange}
        canRevealSecrets={isAdmin}
      />
      {jointUsersField}
      {accountOwnershipColumns.afterJoint.length > 0 && (
        <TableFormFields
          columns={accountOwnershipColumns.afterJoint}
          foreignKeys={foreignKeys}
          fkOptions={fkOptions}
          formData={formData}
          columnLabels={accountColumnLabels}
          inputTypes={fieldInputTypes}
          fieldHints={fieldHints}
          inputProps={moneyInputProps}
          onChange={handleChange}
          canRevealSecrets={isAdmin}
        />
      )}
      {readOnlyColumns.length > 0 && (
        <TableFormFields
          columns={readOnlyColumns}
          foreignKeys={foreignKeys}
          fkOptions={fkOptions}
          formData={formData}
          columnLabels={columnLabels}
          displayValues={readOnlyDisplayValues}
          readOnly
        />
      )}
    </>
  );

  const formActionProps = {
    saving,
    submitLabel: isEdit ? "Update record" : "Create record",
    onCancel: () => goBack(),
    onDelete: isEdit ? () => setShowDeleteConfirm(true) : undefined,
    deleteLabel: "Delete record",
  };

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: appName, to: `/app/${appName}` },
          { label: tableLabel, to: `/app/${appName}/${table}` },
          { label: isEdit ? "Edit" : "New" },
        ]}
        title={
          isAccountEdit
            ? formData.name || `Edit ${tableLabel}`
            : isEdit
              ? `Edit ${tableLabel}`
              : `New ${tableLabel} record`
        }
        subtitle={
          isAccountEdit
            ? "Review charts, edit account details, or manage transactions."
            : isEdit
              ? "Update the fields below and save your changes."
              : "Fill in the fields below to create a record."
        }
        meta={
          isAccountEdit && !loading ? (
            <>
              <div className="page-header-meta-item">
                <span className="register-summary-label">Account type</span>
                <strong>{accountTypeName || "—"}</strong>
              </div>
              {!accountIsSite && !accountIsLiability && (
                <div className="page-header-meta-item">
                  <span className="register-summary-label">Opening balance</span>
                  <strong>{formatCurrency(formData.opening_balance)}</strong>
                </div>
              )}
              {accountIsLiability && (
                <div className="page-header-meta-item">
                  <span className="register-summary-label">Starting amount owed</span>
                  <strong>{formatCurrency(formData.opening_balance)}</strong>
                </div>
              )}
              {!accountIsSite && (
                <div className="page-header-meta-item">
                  <span className="register-summary-label">
                    {accountIsLiability ? "Amount owed" : "Current balance"}
                  </span>
                  <strong className={getSignedAmountClass(formData.balance)}>
                    {formatCurrency(formData.balance)}
                  </strong>
                </div>
              )}
            </>
          ) : null
        }
      />

      {isAccountEdit && !loading && (
        <section className="panel account-edit-overview">
          {(status || error) && (
            <div className="account-edit-messages">
              {status && <p className="status">{status}</p>}
              {error && <p className="error">{error}</p>}
            </div>
          )}

          <div className="account-edit-tabs" role="tablist" aria-label="Account sections">
            {[
              { id: "charts", label: "Charts" },
              { id: "details", label: "Details" },
              { id: "transactions", label: "Transactions" },
            ].map((tab) => {
              const selected = accountTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`account-edit-tab-${tab.id}`}
                  aria-selected={selected}
                  aria-controls={`account-edit-panel-${tab.id}`}
                  className={`account-edit-tab${selected ? " active" : ""}`}
                  onClick={() => setAccountTab(tab.id)}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {accountTab === "charts" && (
            <div
              className="account-edit-tab-panel"
              role="tabpanel"
              id="account-edit-panel-charts"
              aria-labelledby="account-edit-tab-charts"
            >
              <div className="account-edit-charts">
                <AccountBalanceTrendChart
                  accountId={recordId}
                  accountTypeName={accountTypeName}
                  openingBalance={formData.opening_balance}
                />
                {shouldShowSpendingByCategoryChart(accountTypeName) && (
                  <SpendingByCategoryPieChart
                    accountId={recordId}
                    accountTypeName={accountTypeName}
                    title="Spending by category"
                  />
                )}
              </div>
            </div>
          )}

          {accountTab === "details" && (
            <div
              className="account-edit-tab-panel"
              role="tabpanel"
              id="account-edit-panel-details"
              aria-labelledby="account-edit-tab-details"
            >
              {!accountIsLoan &&
                accountIsLiability &&
                formData.credit_limit !== "" &&
                formData.credit_limit != null && (
                  <div className="account-edit-summary">
                    <div>
                      <span className="register-summary-label">Credit limit</span>
                      <strong>{formatCurrency(formData.credit_limit)}</strong>
                    </div>
                  </div>
                )}
              <form className="form account-edit-details-form form-shell" onSubmit={handleSubmit}>
                <FormActions
                  {...formActionProps}
                  variant="section-head"
                  heading="Account details"
                  subtitle="Update the fields below and save your changes."
                  submitLabel="Update account"
                >
                  {accountFormFields}
                </FormActions>
              </form>
            </div>
          )}

          {accountTab === "transactions" && (
            <div
              className="account-edit-tab-panel"
              role="tabpanel"
              id="account-edit-panel-transactions"
              aria-labelledby="account-edit-tab-transactions"
            >
              {showAccountTransactions ? (
                <AccountTransactionsPanel
                  accountId={recordId}
                  appName={appName}
                  embedded
                />
              ) : (
                <p className="subtext">Loading transactions...</p>
              )}
            </div>
          )}
        </section>
      )}

      {(loading || !isAccountEdit) && (
        <section className="panel">
          {loading && <p className="subtext">Loading form...</p>}
          {!loading && !isAccountEdit && (
            <form className="form form-shell" onSubmit={handleSubmit}>
              <FormActions {...formActionProps}>{accountFormFields}</FormActions>
            </form>
          )}
          {status && <p className="status">{status}</p>}
          {error && <p className="error">{error}</p>}
        </section>
      )}

      {showDeleteConfirm && (
        <ConfirmModal
          title={`Delete ${tableLabel.toLowerCase()}?`}
          message={`This will remove "${recordSummary}" from ${tableLabel}. You can restore it from Administration > Deleted Records.`}
          confirmLabel="Delete record"
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
        />
      )}
    </>
  );
}

export default TableFormPage;
