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
import HomeInventoryAppGuard from "./home-inventory/HomeInventoryAppGuard";
import HomeInventoryHomePage from "./home-inventory/HomeInventoryHomePage";
import TroubleHubAppGuard from "./troublehub/TroubleHubAppGuard";
import TroubleHubHomePage from "./troublehub/TroubleHubHomePage";

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
  if (appName === "home_inventory") {
    return (
      <HomeInventoryAppGuard>
        <HomeInventoryHomePage />
      </HomeInventoryAppGuard>
    );
  }
  if (appName === "troublehub") {
    return (
      <TroubleHubAppGuard>
        <TroubleHubHomePage />
      </TroubleHubAppGuard>
    );
  }
  return <BudgetHomePage />;
}

export default AppHomeRouter;
