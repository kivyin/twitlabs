import { useState } from "react";
import { useParams } from "react-router-dom";
import { syncAccountBalance } from "../api/budgetApi";
import AccountRegisterTable from "../components/AccountRegisterTable";
import BrowseLink from "../components/BrowseLink";
import CashFlowSankeyChart from "../components/CashFlowSankeyChart";
import PageHeader from "../components/PageHeader";
import { useAccountRegister } from "../hooks/useAccountRegister";
import { formatCurrency } from "../utils/format";
import { getAvailableCredit, getSignedAmountClass, isLiabilityAccountType } from "../utils/money";
import { TABLE_PAGE_SIZE } from "../utils/tableList";

function AccountRegisterPage() {
  const { appName = "budget", accountId } = useParams();
  const register = useAccountRegister({ accountId, pageSize: TABLE_PAGE_SIZE });
  const { account, initialLoading, error, setError, reload } = register;
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState("");

  const handleSyncBalance = async () => {
    setSyncing(true);
    setError("");
    setStatus("");

    try {
      const result = await syncAccountBalance(accountId);
      await reload();
      setStatus(`Account balance updated to ${formatCurrency(result.balance)}.`);
    } catch (syncError) {
      setError(syncError.message);
    } finally {
      setSyncing(false);
    }
  };

  const balanceDifference =
    account ? Number(account.ledger_balance) - Number(account.balance) : 0;
  const isLiability = isLiabilityAccountType(account?.account_type_name);
  const availableCredit =
    account?.available_credit ?? getAvailableCredit(account?.ledger_balance, account?.credit_limit);

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: appName, to: `/app/${appName}` },
          { label: "Accounts", to: `/app/${appName}/accounts` },
          { label: account?.name ?? "Register" },
        ]}
        title={account ? `${account.name} register` : "Account register"}
        subtitle="Review transactions, running balances, and reconciliation."
      />

      <section className="panel">
        {initialLoading && <p className="subtext">Loading register...</p>}
        {error && <p className="error">{error}</p>}
        {status && <p className="status">{status}</p>}

        {account && (
          <>
            <div className="register-summary">
              <div>
                <span className="register-summary-label">Account type</span>
                <strong>{account.account_type_name}</strong>
              </div>
              <div>
                <span className="register-summary-label">
                  {isLiability ? "Amount owed" : "Stored balance"}
                </span>
                <strong className={getSignedAmountClass(account.balance)}>
                  {formatCurrency(account.balance)}
                </strong>
              </div>
              <div>
                <span className="register-summary-label">
                  {isLiability ? "Ledger amount owed" : "Ledger balance"}
                </span>
                <strong className={getSignedAmountClass(account.ledger_balance)}>
                  {formatCurrency(account.ledger_balance)}
                </strong>
              </div>
              {isLiability && availableCredit !== null && (
                <div>
                  <span className="register-summary-label">Available credit</span>
                  <strong className="money-positive">{formatCurrency(availableCredit)}</strong>
                </div>
              )}
              <div>
                <span className="register-summary-label">Cleared balance</span>
                <strong className={getSignedAmountClass(account.cleared_balance)}>
                  {formatCurrency(account.cleared_balance)}
                </strong>
              </div>
              <div>
                <span className="register-summary-label">Uncleared items</span>
                <strong>{account.uncleared_count}</strong>
              </div>
            </div>

            <div className="register-actions">
              {Math.abs(balanceDifference) > 0.005 && (
                <p className="subtext">
                  Stored balance differs from ledger by{" "}
                  <span className={getSignedAmountClass(balanceDifference)}>
                    {formatCurrency(balanceDifference)}
                  </span>
                  .
                </p>
              )}
              <button
                type="button"
                className="button-primary"
                onClick={handleSyncBalance}
                disabled={syncing}
              >
                {syncing ? "Syncing..." : "Sync stored balance to ledger"}
              </button>
            </div>

            <div className="account-sankey-panel">
              <h2>Cash flow</h2>
              <p className="subtext">Income and spending for this account by category.</p>
              <CashFlowSankeyChart accountId={accountId} compact />
            </div>

            <div className="register-transactions">
              <div className="register-transactions-head">
                <div>
                  <h2>Transactions</h2>
                  <p className="subtext">
                    Sorted by {register.sort.column?.replace(/_/g, " ") ?? "transaction date"} (
                    {register.sort.direction})
                    {register.totalCount > 0 ? ` · ${register.totalCount} total` : ""}
                  </p>
                </div>
                <div className="related-records-actions">
                  <BrowseLink
                    className="button"
                    to={`/app/${appName}/transfers/new`}
                    state={{ fromAccountId: String(accountId), accountId: String(accountId) }}
                  >
                    Transfer
                  </BrowseLink>
                  <BrowseLink
                    className="button-primary"
                    to={`/app/${appName}/transactions/new`}
                    state={{ accountId: String(accountId) }}
                  >
                    + New transaction
                  </BrowseLink>
                </div>
              </div>

              <AccountRegisterTable
                appName={appName}
                register={register}
                pageSize={TABLE_PAGE_SIZE}
                emptyMessage="No transactions for this account yet."
              />
            </div>
          </>
        )}
      </section>
    </>
  );
}

export default AccountRegisterPage;
