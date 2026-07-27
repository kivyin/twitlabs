import { Link } from "react-router-dom";
import BrowseLink from "./BrowseLink";
import { useAccountRegister } from "../hooks/useAccountRegister";
import AccountRegisterTable from "./AccountRegisterTable";

const RELATED_PAGE_SIZE = 10;

/**
 * Related transactions list for an account form. Sorts by transaction date
 * by default, supports sorting by any column, and offers the same filter
 * builder used elsewhere in the app.
 */
function AccountTransactionsPanel({ accountId, appName = "budget", embedded = false }) {
  const register = useAccountRegister({ accountId, pageSize: RELATED_PAGE_SIZE });

  const registerPath = `/app/${appName}/accounts/${encodeURIComponent(String(accountId))}/register`;
  const newTransactionPath = `/app/${appName}/transactions/new`;
  const Wrapper = embedded ? "div" : "section";
  const className = embedded ? "account-edit-transactions" : "panel related-records-panel";

  return (
    <Wrapper className={className}>
      <div className="register-transactions-head">
        <div>
          <h2>Transactions</h2>
          <p className="subtext">
            Related transactions for this account
            {register.totalCount > 0 ? ` · ${register.totalCount} total` : ""}
          </p>
        </div>
        <div className="related-records-actions">
          <Link className="button" to={registerPath}>
            Open register
          </Link>
          <BrowseLink
            className="button"
            to={`/app/${appName}/transfers/new`}
            state={{ fromAccountId: String(accountId), accountId: String(accountId) }}
          >
            Transfer
          </BrowseLink>
          <BrowseLink
            className="button-primary"
            to={newTransactionPath}
            state={{ accountId: String(accountId) }}
          >
            + New transaction
          </BrowseLink>
        </div>
      </div>

      <AccountRegisterTable
        appName={appName}
        register={register}
        pageSize={RELATED_PAGE_SIZE}
        emptyMessage="No transactions for this account yet."
      />
    </Wrapper>
  );
}

export default AccountTransactionsPanel;
