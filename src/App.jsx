import { Navigate, Outlet, Route, Routes, useParams } from "react-router-dom";
import "./App.css";
import TopNav from "./components/TopNav";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AdminPage from "./pages/AdminPage";
import AdminApplicationsPage from "./pages/admin/AdminApplicationsPage";
import AdminFieldsPage from "./pages/admin/AdminFieldsPage";
import AdminTablesPage from "./pages/admin/AdminTablesPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AppNavigatorPage from "./pages/AppNavigatorPage";
import AppIdePage from "./pages/AppIdePage";
import BudgetHomePage from "./pages/BudgetHomePage";
import LoginPage from "./pages/LoginPage";
import TableFormPage from "./pages/TableFormPage";
import TableListPage from "./pages/TableListPage";

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
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <>
      <TopNav />
      <Routes>
        <Route path="/" element={<AppNavigatorPage />} />

        {/* Hardcoded /budget/* — guarded for budget role */}
        <Route element={<BudgetGuard />}>
          <Route path="/budget" element={<BudgetHomePage />} />
          <Route path="/budget/:table" element={<TableListPage />} />
          <Route path="/budget/:table/new" element={<TableFormPage />} />
          <Route path="/budget/:table/:recordId/edit" element={<TableFormPage />} />
        </Route>

        {/* Dynamic /app/:appName/* — guarded per app */}
        <Route path="/app/:appName" element={<AppAccessGuard />}>
          <Route index element={<BudgetHomePage />} />
          <Route path=":table" element={<TableListPage />} />
          <Route path=":table/new" element={<TableFormPage />} />
          <Route path=":table/:recordId/edit" element={<TableFormPage />} />
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
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <main className="app">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={<ProtectedLayout />} />
        </Routes>
      </main>
    </AuthProvider>
  );
}

export default App;
