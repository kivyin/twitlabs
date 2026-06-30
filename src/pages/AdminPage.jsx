import { Navigate, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function AdminPage() {
  const { isAdmin } = useAuth();

  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <section className="panel">
      <h1>Admin</h1>
      <div className="tabs" style={{ marginBottom: "1.25rem" }}>
        <NavLink
          to="/admin/ide"
          className={({ isActive }) => `tab-button${isActive ? " active" : ""}`}
        >
          IDE
        </NavLink>
        <NavLink
          to="/admin/applications"
          className={({ isActive }) => `tab-button${isActive ? " active" : ""}`}
        >
          Applications
        </NavLink>
        <NavLink
          to="/admin/tables"
          className={({ isActive }) => `tab-button${isActive ? " active" : ""}`}
        >
          Tables
        </NavLink>
        <NavLink
          to="/admin/fields"
          className={({ isActive }) => `tab-button${isActive ? " active" : ""}`}
        >
          Fields
        </NavLink>
        <NavLink
          to="/admin/users"
          className={({ isActive }) => `tab-button${isActive ? " active" : ""}`}
        >
          Users
        </NavLink>
      </div>
      <Outlet />
    </section>
  );
}

export default AdminPage;
