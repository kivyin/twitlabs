import { Navigate, Outlet, Route, Routes, useLocation, useParams } from "react-router-dom";
import AppShell from "./components/AppShell";
import ErrorBoundary from "./components/ErrorBoundary";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { BrandingProvider } from "./context/BrandingContext";
import { BrowseStackProvider } from "./context/BrowseStackContext";
import { FavoritesProvider } from "./context/FavoritesContext";
import { ThemeProvider } from "./context/ThemeContext";
import AdminPage from "./pages/AdminPage";
import AdminApplicationsPage from "./pages/admin/AdminApplicationsPage";
import AdminDeletesPage from "./pages/admin/AdminDeletesPage";
import AdminLogsPage from "./pages/admin/AdminLogsPage";
import AdminFieldsPage from "./pages/admin/AdminFieldsPage";
import AdminNavigationPage from "./pages/admin/AdminNavigationPage";
import AdminTablesPage from "./pages/admin/AdminTablesPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminZeroBootPage from "./pages/admin/AdminZeroBootPage";
import AppNavigatorPage from "./pages/AppNavigatorPage";
import AccountRegisterPage from "./pages/AccountRegisterPage";
import AppIdePage from "./pages/AppIdePage";
import AppHomeRouter from "./pages/AppHomeRouter";
import BudgetHomePage from "./pages/BudgetHomePage";
import ErrorPage from "./pages/ErrorPage";
import LoginPage from "./pages/LoginPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import ReportCenterPage from "./pages/ReportCenterPage";
import ReportDetailPage from "./pages/ReportDetailPage";
import TableFormRouter from "./pages/TableFormRouter";
import TableListPage from "./pages/TableListPage";
import TransferFormPage from "./pages/TransferFormPage";
import TaskBoardPage from "./pages/tasks/TaskBoardPage";
import TaskDetailPage from "./pages/tasks/TaskDetailPage";
import TaskProjectsPage from "./pages/tasks/TaskProjectsPage";
import TasksListPage from "./pages/tasks/TasksListPage";
import PomodoroPage from "./pages/tasks/PomodoroPage";
import TasksAppGuard from "./pages/tasks/TasksAppGuard";
import NotesAppGuard from "./pages/notes/NotesAppGuard";
import NotesWorkspacePage from "./pages/notes/NotesWorkspacePage";
import NotesRecentPage from "./pages/notes/NotesRecentPage";
import DocsHomePage from "./pages/docs/DocsHomePage";
import DocsAppPage from "./pages/docs/DocsAppPage";
import DocsTopicPage from "./pages/docs/DocsTopicPage";

// Guards access to /app/:appName/* routes based on role
function AppAccessGuard() {
  const { appName } = useParams();
  const { canAccessApp } = useAuth();
  if (!canAccessApp(appName)) return <Navigate to="/" replace />;
  return <Outlet />;
}

// Guards the hardcoded /budget/* routes
function BudgetGuard() {
  const { canAccessApp } = useAuth();
  if (!canAccessApp("budget")) return <Navigate to="/" replace />;
  return <Outlet />;
}

function ProtectedLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}${location.hash}` }}
      />
    );
  }
  if (user.must_change_password) return <ChangePasswordPage />;

  return (
    <AppShell>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<AppNavigatorPage />} />

          <Route path="/docs" element={<DocsHomePage />} />
          <Route path="/docs/:appName" element={<DocsAppPage />} />
          <Route path="/docs/:appName/:topic" element={<DocsTopicPage />} />

          {/* Hardcoded /budget/* — guarded for budget role */}
          <Route element={<BudgetGuard />}>
            <Route path="/budget" element={<BudgetHomePage />} />
            <Route path="/budget/reports" element={<ReportCenterPage />} />
            <Route path="/budget/reports/:reportKey" element={<ReportDetailPage />} />
            <Route path="/budget/accounts/:accountId/register" element={<AccountRegisterPage />} />
            <Route path="/budget/transfers/new" element={<TransferFormPage />} />
            <Route path="/budget/transfers/:recordId/edit" element={<TransferFormPage />} />
            <Route path="/budget/:table" element={<TableListPage />} />
            <Route path="/budget/:table/new" element={<TableFormRouter />} />
            <Route path="/budget/:table/:recordId/edit" element={<TableFormRouter />} />
          </Route>

          {/* Dynamic /app/:appName/* — guarded per app */}
          <Route path="/app/:appName" element={<AppAccessGuard />}>
            <Route index element={<AppHomeRouter />} />
            <Route path="board" element={<TasksAppGuard><TaskBoardPage /></TasksAppGuard>} />
            <Route path="list" element={<TasksAppGuard><TasksListPage /></TasksAppGuard>} />
            <Route path="list/:view" element={<TasksAppGuard><TasksListPage /></TasksAppGuard>} />
            <Route path="focus" element={<TasksAppGuard><PomodoroPage /></TasksAppGuard>} />
            <Route path="projects" element={<TasksAppGuard><TaskProjectsPage /></TasksAppGuard>} />
            <Route path="task/new" element={<TasksAppGuard><TaskDetailPage /></TasksAppGuard>} />
            <Route path="task/:taskId" element={<TasksAppGuard><TaskDetailPage /></TasksAppGuard>} />
            <Route path="browse" element={<NotesAppGuard><NotesWorkspacePage /></NotesAppGuard>} />
            <Route path="recent" element={<NotesAppGuard><NotesRecentPage /></NotesAppGuard>} />
            <Route path="reports" element={<ReportCenterPage />} />
            <Route path="reports/:reportKey" element={<ReportDetailPage />} />
            <Route path="accounts/:accountId/register" element={<AccountRegisterPage />} />
            <Route path="transfers/new" element={<TransferFormPage />} />
            <Route path="transfers/:recordId/edit" element={<TransferFormPage />} />
            <Route path=":table" element={<TableListPage />} />
            <Route path=":table/new" element={<TableFormRouter />} />
            <Route path=":table/:recordId/edit" element={<TableFormRouter />} />
          </Route>

          {/* /ide backward-compat redirect */}
          <Route path="/ide" element={<Navigate to="/admin/ide" replace />} />

          {/* Admin section — guarded inside AdminPage itself */}
          <Route path="/admin" element={<AdminPage />}>
            <Route index element={<Navigate to="applications" replace />} />
            <Route path="ide" element={<AppIdePage embedded />} />
            <Route path="applications" element={<AdminApplicationsPage />} />
            <Route path="tables" element={<AdminTablesPage />} />
            <Route path="fields" element={<AdminFieldsPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="deletes" element={<AdminDeletesPage />} />
            <Route path="logs" element={<AdminLogsPage />} />
            <Route path="navigation" element={<AdminNavigationPage />} />
            <Route path="zero-boot" element={<AdminZeroBootPage />} />
          </Route>

          <Route
            path="*"
            element={
              <ErrorPage
                status="404"
                title="Page not found"
                message="That route does not exist. Check the URL or return home."
                showHomeLink
              />
            }
          />
        </Routes>
      </ErrorBoundary>
    </AppShell>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrandingProvider>
          <FavoritesProvider>
            <BrowseStackProvider>
              <ErrorBoundary showHomeLink={false}>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/*" element={<ProtectedLayout />} />
                </Routes>
              </ErrorBoundary>
            </BrowseStackProvider>
          </FavoritesProvider>
        </BrandingProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
