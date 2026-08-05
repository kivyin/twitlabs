import { useParams } from "react-router-dom";
import BudgetHomePage from "./BudgetHomePage";
import CalendarAppGuard from "./calendar/CalendarAppGuard";
import CalendarPage from "./calendar/CalendarPage";
import DecisionPickerPage from "./decisions/DecisionPickerPage";
import NotesHomePage from "./notes/NotesHomePage";
import SiteTrackerHomePage from "./site-tracker/SiteTrackerHomePage";
import TasksHomePage from "./tasks/TasksHomePage";
import TrainingAppGuard from "./training/TrainingAppGuard";
import TrainingHomePage from "./training/TrainingHomePage";

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
  if (appName === "training") {
    return (
      <TrainingAppGuard>
        <TrainingHomePage />
      </TrainingAppGuard>
    );
  }
  if (appName === "calendar") {
    return (
      <CalendarAppGuard>
        <CalendarPage />
      </CalendarAppGuard>
    );
  }
  return <BudgetHomePage />;
}

export default AppHomeRouter;
