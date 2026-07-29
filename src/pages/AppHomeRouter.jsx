import { useParams } from "react-router-dom";
import BudgetHomePage from "./BudgetHomePage";
import DecisionPickerPage from "./decisions/DecisionPickerPage";
import NotesHomePage from "./notes/NotesHomePage";
import SiteTrackerHomePage from "./site-tracker/SiteTrackerHomePage";
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
  if (appName === "site-tracker") {
    return <SiteTrackerHomePage />;
  }
  return <BudgetHomePage />;
}

export default AppHomeRouter;
