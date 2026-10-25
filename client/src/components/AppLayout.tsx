import { useMemo, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAppStore } from "../store/appStore";

export function AppLayout() {
  const { state, actions } = useAppStore();
  const role = state.currentUser.role;
  const canSeeSdm = role === "FINANCE" || role === "ADMIN";

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const pendingApprovalsCount = useMemo(() => {
    return state.transactions.filter((t) => t.type === "OUT" && t.approvalStatus === "PENDING").length;
  }, [state.transactions]);

  const lowStockCount = useMemo(() => {
    return state.inventoryItems.filter((i) => i.currentStock <= i.minStock).length;
  }, [state.inventoryItems]);

  const handleReset = () => {
    actions.resetStoreToDefault();
    setShowResetConfirm(false);
  };

  return (
    <div>
      <header className="topbar">
        <div
          className="container"
          style={{
            display: "flex",
            gap: 16,
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            paddingTop: 10,
            paddingBottom: 10,
          }}
        >
          {/* Logo & Navigation */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, overflowX: "auto" }}>
            <NavLink to="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
              <div
                style={{
                  background: "var(--primary)",
                  color: "#ffffff",
                  fontWeight: 800,
                  fontSize: 16,
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  letterSpacing: "-0.04em",
                }}
              >
                Fx
              </div>
              <div style={{ fontWeight: 800, fontSize: 18, color: "var(--text)", letterSpacing: "-0.02em" }}>
                Fluxo
              </div>
            </NavLink>

            <nav className="nav-links">
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
                {pendingApprovalsCount > 0 ? (
                  <span
                    className="badge badge-warning"
                    style={{ marginLeft: 5, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}
                  >
                    {pendingApprovalsCount}
                  </span>
                ) : null}
              </NavLink>
              <NavLink to="/budgets" className={({ isActive }) => (isActive ? "nav active" : "nav")}>
                RAB
              </NavLink>
              <NavLink to="/reports" className={({ isActive }) => (isActive ? "nav active" : "nav")}>
                Laporan
              </NavLink>
              {canSeeSdm ? (
                <NavLink to="/sdm" className={({ isActive }) => (isActive ? "nav active" : "nav")}>
                  SDM & Upah
                </NavLink>
              ) : null}
              <NavLink to="/inventory" className={({ isActive }) => (isActive ? "nav active" : "nav")}>
                Inventory
                {lowStockCount > 0 ? (
                  <span
                    className="badge badge-danger"
                    style={{ marginLeft: 5, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}
                  >
                    {lowStockCount}
                  </span>
                ) : null}
              </NavLink>
              <NavLink to="/equipment" className={({ isActive }) => (isActive ? "nav active" : "nav")}>
                Peralatan
              </NavLink>
            </nav>
          </div>

          {/* User Role Switcher & Utilities */}
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              className="btn"
              style={{ fontSize: 11, padding: "5px 9px", color: "var(--muted)" }}
              type="button"
              title="Reset data lokal ke nilai awal default"
              onClick={() => setShowResetConfirm(true)}
            >
              ↺ Reset Demo
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f1f5f9", padding: "4px 8px", borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500 }}>
                Role:
              </div>
              <select
                className="input"
                style={{
                  width: 120,
                  padding: "4px 8px",
                  fontSize: 12,
                  fontWeight: 600,
                  background: "#ffffff",
                  height: 28,
                }}
                value={role}
                onChange={(e) => actions.setCurrentUser({ name: state.currentUser.name, role: e.target.value as typeof role })}
              >
                <option value="ADMIN">ADMIN</option>
                <option value="FINANCE">FINANCE</option>
                <option value="VIEWER">VIEW ONLY</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      {/* Confirmation Modal for Reset Demo */}
      {showResetConfirm && (
        <div className="modal-backdrop" onClick={() => setShowResetConfirm(false)}>
          <div className="modal-card" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 8px" }}>Reset Data Demo?</h3>
            <p className="muted" style={{ margin: "0 0 16px", fontSize: 13.5, lineHeight: 1.5 }}>
              Tindakan ini akan mengembalikan seluruh data proyek, transaksi, pembayaran upah, inventaris material, dan status peralatan ke data bawaan awal.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button className="btn" type="button" onClick={() => setShowResetConfirm(false)}>
                Batal
              </button>
              <button className="btn danger" type="button" onClick={handleReset}>
                Ya, Reset Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
