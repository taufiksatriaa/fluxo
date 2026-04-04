export function DashboardPage() {
  const kpis = {
    totalIn: 12500000,
    totalOut: 8400000,
    net: 4100000,
    pendingApprovals: 3,
    activeProjects: 2,
  };

  const projects = [
    {
      id: "prj-1",
      code: "PRJ-001",
      name: "Renovasi Kantor",
      progressPct: 68,
      budgetTotal: 25000000,
      budgetUsed: 17300000,
      updatedAt: "2026-04-04",
    },
    {
      id: "prj-2",
      code: "PRJ-002",
      name: "Pembangunan Gudang",
      progressPct: 34,
      budgetTotal: 80000000,
      budgetUsed: 22100000,
      updatedAt: "2026-04-03",
    },
    {
      id: "prj-3",
      code: "PRJ-003",
      name: "Implementasi Sistem",
      progressPct: 90,
      budgetTotal: 15000000,
      budgetUsed: 14000000,
      updatedAt: "2026-04-02",
    },
  ];

  const totalWeight = projects.reduce((sum, p) => sum + (p.budgetTotal || 1), 0);
  const overallProgress =
    totalWeight > 0
      ? Math.round(projects.reduce((sum, p) => sum + p.progressPct * (p.budgetTotal || 1), 0) / totalWeight)
      : 0;

  const formatIdr = (value: number) => value.toLocaleString("id-ID");

  return (
    <div className="container">
      <h2 style={{ marginTop: 0 }}>Dashboard</h2>
      <div className="grid">
        <div className="card">
          <div className="label">Kas Masuk (contoh)</div>
          <div style={{ marginTop: 8, fontSize: 24 }}>{kpis.totalIn.toLocaleString("id-ID")}</div>
          <div className="muted" style={{ fontSize: 12 }}>
            Total transaksi IN (approved)
          </div>
        </div>
        <div className="card">
          <div className="label">Kas Keluar (contoh)</div>
          <div style={{ marginTop: 8, fontSize: 24 }}>{kpis.totalOut.toLocaleString("id-ID")}</div>
          <div className="muted" style={{ fontSize: 12 }}>
            Total transaksi OUT (approved)
          </div>
        </div>
        <div className="card">
          <div className="label">Net Cashflow (contoh)</div>
          <div style={{ marginTop: 8, fontSize: 24 }}>{kpis.net.toLocaleString("id-ID")}</div>
          <div className="muted" style={{ fontSize: 12 }}>
            IN - OUT
          </div>
        </div>
        <div className="card">
          <div className="label">Approval Pending (contoh)</div>
          <div style={{ marginTop: 8, fontSize: 24 }}>{kpis.pendingApprovals}</div>
          <div className="muted" style={{ fontSize: 12 }}>
            Menunggu approve pengeluaran
          </div>
        </div>
        <div className="card">
          <div className="label">Project Aktif (contoh)</div>
          <div style={{ marginTop: 8, fontSize: 24 }}>{kpis.activeProjects}</div>
          <div className="muted" style={{ fontSize: 12 }}>
            Jumlah project yang sedang berjalan
          </div>
        </div>
      </div>
      <div style={{ marginTop: 12 }} className="card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
          <div>
            <div className="label">Progress Project (contoh)</div>
            <h3 style={{ margin: "6px 0 0" }}>Tracking progress tiap project</h3>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="label">Overall</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{overallProgress}%</div>
          </div>
        </div>

        <div className="progress" style={{ marginTop: 10 }}>
          <div className="progressFill" style={{ width: `${overallProgress}%` }} />
        </div>

        <div className="table" style={{ marginTop: 14 }}>
          <div className="tableRow tableHeader">
            <div>Project</div>
            <div style={{ textAlign: "right" }}>Progress</div>
            <div style={{ textAlign: "right" }}>Budget</div>
            <div style={{ textAlign: "right" }}>Update</div>
          </div>
          {projects.map((p) => {
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
