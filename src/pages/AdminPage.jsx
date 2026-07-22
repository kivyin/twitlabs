import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/PageHeader";

function AdminPage() {
  const { isAdmin } = useAuth();

  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Administration" }]}
        title="Administration"
        subtitle="Manage applications, tables, fields, users, navigation, deleted records, error logs, zero boot, and run queries."
      />
      <section className="panel">
        <Outlet />
      </section>
    </>
  );
}

export default AdminPage;
