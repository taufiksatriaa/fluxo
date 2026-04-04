import { NavLink, Outlet } from "react-router-dom";

export function AppLayout() {
  return (
    <div>
      <div className="topbar">
        <div className="container" style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ fontWeight: 700 }}>Fluxo</div>
          <nav style={{ display: "flex", gap: 8, marginLeft: 12 }}>
            <NavLink to="/" end className={({ isActive }) => (isActive ? "nav active" : "nav")}>
              Dashboard
            </NavLink>
            <NavLink to="/projects" className={({ isActive }) => (isActive ? "nav active" : "nav")}>
              Project
            </NavLink>
            <NavLink to="/transactions" className={({ isActive }) => (isActive ? "nav active" : "nav")}>
              Transaksi
            </NavLink>
            <NavLink to="/approvals" className={({ isActive }) => (isActive ? "nav active" : "nav")}>
              Approval
            </NavLink>
            <NavLink to="/budgets" className={({ isActive }) => (isActive ? "nav active" : "nav")}>
              RAB
            </NavLink>
            <NavLink to="/reports" className={({ isActive }) => (isActive ? "nav active" : "nav")}>
              Laporan
            </NavLink>
          </nav>
          <div style={{ marginLeft: "auto" }} className="muted">
            Template UI
          </div>
        </div>
      </div>
      <Outlet />
    </div>
  );
}
