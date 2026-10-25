import { useMemo } from "react";
import { Link } from "react-router-dom";
import { calcRabGrandTotal, useAppStore } from "../store/appStore";
import { CashflowTrendChart } from "../components/charts/CashflowTrendChart";
import { BudgetVsActualBarChart } from "../components/charts/BudgetVsActualBarChart";
import { ExpenseDonutChart } from "../components/charts/ExpenseDonutChart";

function formatIdr(value: number) {
  return value.toLocaleString("id-ID");
}

export function DashboardPage() {
  const { state } = useAppStore();

  const stats = useMemo(() => {
    const approved = state.transactions.filter((t) => t.approvalStatus === "APPROVED");
    const totalIn = approved.filter((t) => t.type === "IN").reduce((sum, t) => sum + t.amount, 0);
    const totalOut = approved.filter((t) => t.type === "OUT").reduce((sum, t) => sum + t.amount, 0);

    const pendingApprovals = state.transactions.filter((t) => t.type === "OUT" && t.approvalStatus === "PENDING").length;
    const activeProjects = state.projects.filter((p) => p.status === "RUNNING").length;

    const projectRows = state.projects.map((p) => {
      const rab = state.rabsByProjectId[p.id];
      const budgetTotal = rab ? calcRabGrandTotal(rab) : p.budgetPlanTotal;
      const budgetUsed = state.transactions
        .filter((t) => t.projectId === p.id && t.type === "OUT" && t.approvalStatus === "APPROVED")
        .reduce((sum, t) => sum + t.amount, 0);
      return {
        id: p.id,
        code: p.code,
        name: p.name,
        progressPct: p.progressPct,
        budgetTotal,
        budgetUsed,
        updatedAt: p.updatedAt,
      };
    });

    const totalWeight = projectRows.reduce((sum, p) => sum + (p.budgetTotal || 1), 0);
    const overallProgress =
      totalWeight > 0
        ? Math.round(projectRows.reduce((sum, p) => sum + p.progressPct * (p.budgetTotal || 1), 0) / totalWeight)
        : 0;

    return {
      totalIn,
      totalOut,
      net: totalIn - totalOut,
      pendingApprovals,
      activeProjects,
      projectRows,
      overallProgress,
    };
  }, [state.projects, state.rabsByProjectId, state.transactions]);

  return (
    <div className="container">
      {/* Dashboard Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <div>
          <h2 style={{ margin: "0 0 4px" }}>Dashboard Eksekutif</h2>
          <div className="muted" style={{ fontSize: 13 }}>
            Visualisasi real-time performa kas masuk, arus pengeluaran, serapan RAB, dan progres fisik proyek.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="badge badge-success">Sistem Aktif (Live Sync)</span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid">
        <div className="card" style={{ gridColumn: "span 3" }}>
          <div className="label">Kas Masuk (IN)</div>
          <div className="stat-value" style={{ color: "#16a34a" }}>
            Rp {formatIdr(stats.totalIn)}
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            Total penerimaan termin / DP disetujui
          </div>
        </div>

        <div className="card" style={{ gridColumn: "span 3" }}>
          <div className="label">Kas Keluar (OUT)</div>
          <div className="stat-value" style={{ color: "var(--primary)" }}>
            Rp {formatIdr(stats.totalOut)}
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            Total biaya riil disetujui
          </div>
        </div>

        <div className="card" style={{ gridColumn: "span 3" }}>
          <div className="label">Net Cashflow</div>
          <div
            className="stat-value"
            style={{ color: stats.net >= 0 ? "#16a34a" : "var(--danger)" }}
          >
            Rp {formatIdr(stats.net)}
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            {stats.net >= 0 ? "Surplus kas berjalan" : "Defisit kas operasional"}
          </div>
        </div>

        <div className="card" style={{ gridColumn: "span 3" }}>
          <div className="label">Antrean Persetujuan</div>
          <div className="stat-value" style={{ color: stats.pendingApprovals > 0 ? "var(--warning)" : "var(--muted)" }}>
            {stats.pendingApprovals} Transaksi
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            {stats.pendingApprovals > 0 ? (
              <Link to="/approvals" style={{ color: "var(--warning)", fontWeight: 600 }}>
                Menunggu otorisasi Admin →
              </Link>
            ) : (
              "Semua pengeluaran telah diproses"
            )}
          </div>
        </div>
      </div>

      {/* D3 Charts Section: Row 1 */}
      <div className="grid" style={{ marginTop: 18 }}>
        {/* Chart 1: Cashflow Trend Area Chart (D3) */}
        <div className="card" style={{ gridColumn: "span 7" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
            <div>
              <div className="label">Visualisasi D3.js</div>
              <h3 style={{ margin: "2px 0 0", fontSize: 16 }}>Tren Arus Kas (Inflow vs Outflow)</h3>
            </div>
            <div style={{ display: "flex", gap: 12, fontSize: 12 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#16a34a" }} />
                Kas Masuk
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#2563eb" }} />
                Kas Keluar
              </span>
            </div>
          </div>
          <CashflowTrendChart transactions={state.transactions} height={250} />
        </div>

        {/* Chart 2: Expense Distribution Donut Chart (D3) */}
        <div className="card" style={{ gridColumn: "span 5" }}>
          <div style={{ marginBottom: 14 }}>
            <div className="label">Visualisasi D3.js</div>
            <h3 style={{ margin: "2px 0 0", fontSize: 16 }}>Distribusi Pengeluaran Riil</h3>
          </div>
          <ExpenseDonutChart transactions={state.transactions} size={220} />
        </div>
      </div>

      {/* D3 Charts Section: Row 2 */}
      <div className="grid" style={{ marginTop: 18 }}>
        {/* Chart 3: Budget vs Actual Bar Chart (D3) */}
        <div className="card" style={{ gridColumn: "span 12" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
            <div>
              <div className="label">Visualisasi D3.js</div>
              <h3 style={{ margin: "2px 0 0", fontSize: 16 }}>Evaluasi Serapan: Pagu Anggaran (RAB) vs Realisasi Pengeluaran</h3>
            </div>
            <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 14, height: 10, borderRadius: 2, background: "#94a3b8" }} />
                Pagu Anggaran Total (RAB)
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 14, height: 10, borderRadius: 2, background: "#2563eb" }} />
                Realisasi Kas Keluar
              </span>
            </div>
          </div>
          <BudgetVsActualBarChart data={stats.projectRows} />
        </div>
      </div>

      {/* Project Progress Tracking Table */}
      <div className="card" style={{ marginTop: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
          <div>
            <div className="label">Progress Pelaksanaan Fisik</div>
            <h3 style={{ margin: "4px 0 0", fontSize: 16 }}>Status Proyek Berjalan & Alokasi Anggaran</h3>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="label">Overall Progress (Weighted by Budget)</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--primary)" }}>{stats.overallProgress}%</div>
          </div>
        </div>

        <div className="progress" style={{ marginTop: 12 }}>
          <div className="progressFill" style={{ width: `${stats.overallProgress}%` }} />
        </div>

        <div className="table" style={{ marginTop: 16 }}>
          <div className="tableRow tableHeader" style={{ gridTemplateColumns: "2fr 1fr 1fr 0.8fr 0.8fr" }}>
            <div>Kode & Nama Proyek</div>
            <div style={{ textAlign: "right" }}>Progress Fisik</div>
            <div style={{ textAlign: "right" }}>Pagu Anggaran (RAB)</div>
            <div style={{ textAlign: "right" }}>Kas Keluar</div>
            <div style={{ textAlign: "right" }}>Aksi Detail</div>
          </div>
          {stats.projectRows.map((p) => {
            const usedPct = p.budgetTotal > 0 ? Math.round((p.budgetUsed / p.budgetTotal) * 100) : 0;
            const isOver = p.budgetUsed > p.budgetTotal && p.budgetTotal > 0;
            return (
              <div key={p.id} className="tableRow" style={{ gridTemplateColumns: "2fr 1fr 1fr 0.8fr 0.8fr" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>
                    <Link to={`/projects/${p.id}`} style={{ color: "var(--primary)" }}>
                      {p.code} — {p.name}
                    </Link>
                  </div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                    Update terakhir: {p.updatedAt}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 700 }}>{p.progressPct}%</div>
                  <div className="progress" style={{ marginTop: 6 }}>
                    <div className="progressFill" style={{ width: `${p.progressPct}%` }} />
                  </div>
                </div>
                <div style={{ textAlign: "right", fontWeight: 600 }}>
                  Rp {formatIdr(p.budgetTotal)}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 600, color: isOver ? "var(--danger)" : "var(--text)" }}>
                    Rp {formatIdr(p.budgetUsed)}
                  </div>
                  <div className="muted" style={{ fontSize: 11 }}>
                    {usedPct}% pagu
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <Link to={`/projects/${p.id}`} className="btn" style={{ padding: "4px 10px", fontSize: 12 }}>
                    Detail →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
