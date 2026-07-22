import { useParams } from "react-router-dom";
import GoalFormPage from "./GoalFormPage";
import RecurringFormPage from "./RecurringFormPage";
import TableFormPage from "./TableFormPage";
import TransactionFormPage from "./TransactionFormPage";

function TableFormRouter() {
  const { table } = useParams();
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
