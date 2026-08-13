import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/PageHeader";

function AdminPage() {
  const { isAdmin } = useAuth();
  const location = useLocation();

  if (!isAdmin) {
    return (
      <Navigate
        to="/access-denied"
        replace
        state={{
          from: `${location.pathname}${location.search}${location.hash}`,
          message: "Administration requires the System Admin role.",
        }}
      />
    );
  }

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
