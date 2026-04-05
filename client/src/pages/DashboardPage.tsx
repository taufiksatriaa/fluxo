import { useMemo } from "react";
import { calcRabGrandTotal, useAppStore } from "../store/appStore";

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
      <h2 style={{ marginTop: 0 }}>Dashboard</h2>
      <div className="grid">
        <div className="card">
          <div className="label">Kas Masuk</div>
          <div style={{ marginTop: 8, fontSize: 24 }}>{formatIdr(stats.totalIn)}</div>
          <div className="muted" style={{ fontSize: 12 }}>
            Total transaksi IN (approved)
          </div>
        </div>
        <div className="card">
          <div className="label">Kas Keluar</div>
          <div style={{ marginTop: 8, fontSize: 24 }}>{formatIdr(stats.totalOut)}</div>
          <div className="muted" style={{ fontSize: 12 }}>
            Total transaksi OUT (approved)
          </div>
        </div>
        <div className="card">
          <div className="label">Net Cashflow</div>
          <div style={{ marginTop: 8, fontSize: 24 }}>{formatIdr(stats.net)}</div>
          <div className="muted" style={{ fontSize: 12 }}>
            IN - OUT
          </div>
        </div>
        <div className="card">
          <div className="label">Approval Pending</div>
          <div style={{ marginTop: 8, fontSize: 24 }}>{stats.pendingApprovals}</div>
          <div className="muted" style={{ fontSize: 12 }}>
            Menunggu approve pengeluaran
          </div>
        </div>
        <div className="card">
          <div className="label">Project Aktif</div>
          <div style={{ marginTop: 8, fontSize: 24 }}>{stats.activeProjects}</div>
          <div className="muted" style={{ fontSize: 12 }}>
            Jumlah project yang sedang berjalan
          </div>
        </div>
      </div>
      <div style={{ marginTop: 12 }} className="card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
          <div>
            <div className="label">Progress Project</div>
            <h3 style={{ margin: "6px 0 0" }}>Tracking progress tiap project</h3>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="label">Overall</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{stats.overallProgress}%</div>
          </div>
        </div>

        <div className="progress" style={{ marginTop: 10 }}>
          <div className="progressFill" style={{ width: `${stats.overallProgress}%` }} />
        </div>

        <div className="table" style={{ marginTop: 14 }}>
          <div className="tableRow tableHeader">
            <div>Project</div>
            <div style={{ textAlign: "right" }}>Progress</div>
            <div style={{ textAlign: "right" }}>Budget</div>
            <div style={{ textAlign: "right" }}>Update</div>
          </div>
          {stats.projectRows.map((p) => {
            const usedPct = p.budgetTotal > 0 ? Math.round((p.budgetUsed / p.budgetTotal) * 100) : 0;
            return (
              <div key={p.id} className="tableRow">
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {p.code} — {p.name}
                  </div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                    Budget terpakai {formatIdr(p.budgetUsed)} / {formatIdr(p.budgetTotal)} ({usedPct}%)
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 700 }}>{p.progressPct}%</div>
                  <div className="progress" style={{ marginTop: 8 }}>
                    <div className="progressFill" style={{ width: `${p.progressPct}%` }} />
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div>{formatIdr(p.budgetTotal)}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="muted">{p.updatedAt}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
