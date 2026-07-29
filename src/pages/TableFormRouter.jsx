import { Navigate, useParams } from "react-router-dom";
import { SITE_TRACKER_APP } from "../utils/accounts";
import GoalFormPage from "./GoalFormPage";
import RecurringFormPage from "./RecurringFormPage";
import TableFormPage from "./TableFormPage";
import TransactionFormPage from "./TransactionFormPage";

function TableFormRouter() {
  const { appName = "budget", table } = useParams();
  if (appName === SITE_TRACKER_APP && table !== "accounts") {
    return <Navigate to={`/app/${SITE_TRACKER_APP}/accounts`} replace />;
  }
  if (table === "transactions") {
    return <TransactionFormPage />;
  }
  if (table === "recurring_transactions") {
    return <RecurringFormPage />;
  }
  if (table === "goals") {
    return <GoalFormPage />;
  }
  return <TableFormPage />;
}

export default TableFormRouter;
