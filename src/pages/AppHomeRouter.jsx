import { useParams } from "react-router-dom";
import BudgetHomePage from "./BudgetHomePage";
import DecisionPickerPage from "./decisions/DecisionPickerPage";
import NotesHomePage from "./notes/NotesHomePage";
import TasksHomePage from "./tasks/TasksHomePage";

function AppHomeRouter() {
  const { appName = "budget" } = useParams();
  if (appName === "tasks") {
    return <TasksHomePage />;
  }
  if (appName === "notes") {
    return <NotesHomePage />;
  }
  if (appName === "decisions") {
    return <DecisionPickerPage />;
  }
  return <BudgetHomePage />;
}

export default AppHomeRouter;
