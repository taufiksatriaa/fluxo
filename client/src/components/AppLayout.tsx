import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAppStore } from "../store/appStore";

export function AppLayout() {
  const { state, actions } = useAppStore();
  const location = useLocation();
  const role = state.currentUser.role;
  const canSeeSdm = role === "FINANCE" || role === "ADMIN";

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile drawer whenever route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Handle ESC key to close drawer or modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
        setShowResetConfirm(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const pendingApprovalsCount = useMemo(() => {
    return state.transactions.filter((t) => t.type === "OUT" && t.approvalStatus === "PENDING").length;
  }, [state.transactions]);

  const lowStockCount = useMemo(() => {
    return state.inventoryItems.filter((i) => i.currentStock <= i.minStock).length;
  }, [state.inventoryItems]);

  const handleReset = () => {
    actions.resetStoreToDefault();
    setShowResetConfirm(false);
    setMobileMenuOpen(false);
  };

  return (
    <div>
      {/* Top Header */}
      <header className="topbar">
        <div
          className="container"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 10,
            paddingBottom: 10,
          }}
        >
          {/* Logo Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <NavLink to="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
              <div
                style={{
                  background: "var(--primary)",
                  color: "#ffffff",
                  fontWeight: 800,
                  fontSize: 16,
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  letterSpacing: "-0.04em",
                  boxShadow: "0 2px 8px rgba(37,99,235,0.25)",
                }}
              >
                Fx
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontWeight: 800, fontSize: 18, color: "var(--text)", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
                  Fluxo
                </span>
                <span className="mobile-only muted" style={{ fontSize: 9.5, fontWeight: 600 }}>
                  Role: {role}
                </span>
              </div>
            </NavLink>

            {/* Desktop Navigation Links */}
            <nav className="nav-links desktop-only">
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

          {/* Desktop Right Utilities (Role + Reset) */}
          <div className="desktop-only" style={{ gap: 10, alignItems: "center" }}>
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

          {/* Mobile Right Menu Button */}
          <div className="mobile-only" style={{ alignItems: "center", gap: 8 }}>
            {pendingApprovalsCount > 0 && (
              <NavLink
                to="/approvals"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                  color: "#92400e",
                  textDecoration: "none",
                  fontWeight: 700,
                  fontSize: 12,
                }}
                title={`${pendingApprovalsCount} approval tertunda`}
              >
                🔔 {pendingApprovalsCount}
              </NavLink>
            )}

            <button
              type="button"
              className="btn"
              style={{
                width: 44,
                height: 44,
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 10,
              }}
              aria-label="Buka Menu Navigasi"
              onClick={() => setMobileMenuOpen(true)}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" x2="20" y1="12" y2="12" />
                <line x1="4" x2="20" y1="6" y2="6" />
                <line x1="4" x2="20" y1="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="has-mobile-bottom-bar">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation Bar (Fixed 5-item thumb menu) */}
      <nav className="mobile-bottom-bar mobile-only" aria-label="Navigasi Utama Mobile">
        <NavLink to="/" end className={({ isActive }) => (isActive ? "mobile-nav-item active" : "mobile-nav-item")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span>Dashboard</span>
        </NavLink>

        <NavLink to="/projects" className={({ isActive }) => (isActive ? "mobile-nav-item active" : "mobile-nav-item")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
          </svg>
          <span>Proyek</span>
        </NavLink>

        <NavLink to="/transactions" className={({ isActive }) => (isActive ? "mobile-nav-item active" : "mobile-nav-item")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="20" height="14" x="2" y="5" rx="2" />
            <line x1="2" x2="22" y1="10" y2="10" />
          </svg>
          <span>Transaksi</span>
        </NavLink>

        <NavLink to="/approvals" className={({ isActive }) => (isActive ? "mobile-nav-item active" : "mobile-nav-item")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          <span>Approval</span>
          {pendingApprovalsCount > 0 && <span className="mobile-nav-badge">{pendingApprovalsCount}</span>}
        </NavLink>

        <button
          type="button"
          className="mobile-nav-item"
          onClick={() => setMobileMenuOpen(true)}
          style={{ position: "relative" }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="7" height="7" x="3" y="3" rx="1" />
            <rect width="7" height="7" x="14" y="3" rx="1" />
            <rect width="7" height="7" x="14" y="14" rx="1" />
            <rect width="7" height="7" x="3" y="14" rx="1" />
          </svg>
          <span>Menu</span>
          {lowStockCount > 0 && <span className="mobile-nav-badge" style={{ background: "var(--warning)" }}>!</span>}
        </button>
      </nav>

      {/* Mobile Drawer (Slide-Over Menu) */}
      {mobileMenuOpen && (
        <>
          <div className="drawer-backdrop" onClick={() => setMobileMenuOpen(false)} />
          <aside className="mobile-drawer" aria-label="Menu Lengkap Fluxo">
            {/* Drawer Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 18px",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    background: "var(--primary)",
                    color: "#ffffff",
                    fontWeight: 800,
                    fontSize: 14,
                    width: 28,
                    height: 28,
                    borderRadius: 7,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  Fx
                </div>
                <span style={{ fontWeight: 800, fontSize: 16 }}>Navigasi Fluxo</span>
              </div>
              <button
                type="button"
                className="btn"
                style={{ width: 36, height: 36, padding: 0, borderRadius: 8 }}
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Tutup Menu"
              >
                ✕
              </button>
            </div>

            {/* Role Switcher in Drawer */}
            <div style={{ padding: "14px 18px", background: "#f8fafc", borderBottom: "1px solid var(--border)" }}>
              <div className="label" style={{ marginBottom: 6 }}>
                Simulasi Peran Akses (RBAC)
              </div>
              <select
                className="input"
                style={{ fontWeight: 600, background: "#ffffff" }}
                value={role}
                onChange={(e) => actions.setCurrentUser({ name: state.currentUser.name, role: e.target.value as typeof role })}
              >
                <option value="ADMIN">ADMIN (Akses Penuh)</option>
                <option value="FINANCE">FINANCE (Operasional & Upah)</option>
                <option value="VIEWER">VIEW ONLY (Hanya Baca)</option>
              </select>
            </div>

            {/* Nav Links in Drawer */}
            <div style={{ flex: 1, overflowY: "auto", padding: "14px 12px" }}>
              <div className="label" style={{ paddingLeft: 8, marginBottom: 6, letterSpacing: "0.04em" }}>
                OPERASIONAL
              </div>
              <NavLink
                to="/"
                end
                className={({ isActive }) => (isActive ? "nav active" : "nav")}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 12px", minHeight: 44 }}
              >
                <span>📊 Dashboard Eksekutif</span>
              </NavLink>
              <NavLink
                to="/projects"
                className={({ isActive }) => (isActive ? "nav active" : "nav")}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 12px", minHeight: 44 }}
              >
                <span>📁 Manajemen Proyek</span>
              </NavLink>
              <NavLink
                to="/transactions"
                className={({ isActive }) => (isActive ? "nav active" : "nav")}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 12px", minHeight: 44 }}
              >
                <span>💳 Kas Masuk & Keluar</span>
              </NavLink>
              <NavLink
                to="/approvals"
                className={({ isActive }) => (isActive ? "nav active" : "nav")}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 12px", minHeight: 44 }}
              >
                <span>🛡️ Otorisasi Approval</span>
                {pendingApprovalsCount > 0 && <span className="badge badge-warning">{pendingApprovalsCount}</span>}
              </NavLink>

              <div className="label" style={{ paddingLeft: 8, marginTop: 16, marginBottom: 6, letterSpacing: "0.04em" }}>
                TEKNIS & KEUANGAN
              </div>
              <NavLink
                to="/budgets"
                className={({ isActive }) => (isActive ? "nav active" : "nav")}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 12px", minHeight: 44 }}
              >
                <span>📑 Dokumen RAB & BOQ</span>
              </NavLink>
              <NavLink
                to="/reports"
                className={({ isActive }) => (isActive ? "nav active" : "nav")}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 12px", minHeight: 44 }}
              >
                <span>📈 Laporan Arus Kas</span>
              </NavLink>
              {canSeeSdm && (
                <NavLink
                  to="/sdm"
                  className={({ isActive }) => (isActive ? "nav active" : "nav")}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 12px", minHeight: 44 }}
                >
                  <span>👷 SDM & Upah Harian</span>
                </NavLink>
              )}

              <div className="label" style={{ paddingLeft: 8, marginTop: 16, marginBottom: 6, letterSpacing: "0.04em" }}>
                LOGISTIK & ASSET
              </div>
              <NavLink
                to="/inventory"
                className={({ isActive }) => (isActive ? "nav active" : "nav")}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 12px", minHeight: 44 }}
              >
                <span>📦 Stok Material Gudang</span>
                {lowStockCount > 0 && <span className="badge badge-danger">{lowStockCount} Menipis</span>}
              </NavLink>
              <NavLink
                to="/equipment"
                className={({ isActive }) => (isActive ? "nav active" : "nav")}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 12px", minHeight: 44 }}
              >
                <span>🚜 Armada & Alat Berat</span>
              </NavLink>
            </div>

            {/* Drawer Footer */}
            <div style={{ padding: "16px 18px", borderTop: "1px solid var(--border)", background: "#f8fafc" }}>
              <button
                className="btn"
                style={{ width: "100%", justifyContent: "center", minHeight: 42, color: "var(--danger)", borderColor: "#fecaca" }}
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowResetConfirm(true);
                }}
              >
                ↺ Reset Data Demo
              </button>
              <div className="muted" style={{ fontSize: 10.5, textAlign: "center", marginTop: 8 }}>
                Fluxo v1.0.0 • Sistem Konstruksi Terintegrasi
              </div>
            </div>
          </aside>
        </>
      )}

      {/* Confirmation Modal for Reset Demo */}
      {showResetConfirm && (
        <div className="modal-backdrop" onClick={() => setShowResetConfirm(false)}>
          <div className="modal-card" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-drag-handle mobile-only" />
            <h3 style={{ margin: "0 0 8px" }}>Reset Data Demo?</h3>
            <p className="muted" style={{ margin: "0 0 16px", fontSize: 13.5, lineHeight: 1.5 }}>
              Tindakan ini akan mengembalikan seluruh data proyek, transaksi, pembayaran upah, inventaris material, dan status peralatan ke data bawaan awal.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
              <button className="btn" type="button" onClick={() => setShowResetConfirm(false)} style={{ flex: 1, minHeight: 42 }}>
                Batal
              </button>
              <button className="btn danger" type="button" onClick={handleReset} style={{ flex: 1, minHeight: 42 }}>
                Ya, Reset Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
