import { useMemo, useState } from "react";
import { calcRabGrandTotal, useAppStore } from "../store/appStore";
import type { ProjectStatus } from "../store/appStore";
import { Link } from "react-router-dom";

function formatIdr(value: number) {
  return value.toLocaleString("id-ID");
}

function clampPct(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function ProjectsPage() {
  const { state, actions } = useAppStore();
  const projects = state.projects;

  const [filters, setFilters] = useState<{
    status: "" | ProjectStatus;
    search: string;
  }>({ status: "", search: "" });

  const filtered = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return projects
      .filter((p) => (filters.status ? p.status === filters.status : true))
      .filter((p) => {
        if (!search) return true;
        const hay = `${p.code} ${p.name} ${p.owner}`.toLowerCase();
        return hay.includes(search);
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [filters, projects]);

  const computedRows = useMemo(() => {
    return filtered.map((p) => {
      const rab = state.rabsByProjectId[p.id];
      const budgetTotal = rab ? calcRabGrandTotal(rab) : p.budgetPlanTotal;
      const budgetUsed = state.transactions
        .filter((t) => t.projectId === p.id && t.type === "OUT" && t.approvalStatus === "APPROVED")
        .reduce((sum, t) => sum + t.amount, 0);
      return { ...p, budgetTotal, budgetUsed };
    });
  }, [filtered, state.rabsByProjectId, state.transactions]);

  const overall = useMemo(() => {
    const weightSum = computedRows.reduce((sum, p) => sum + (p.budgetTotal || 1), 0);
    const pct =
      weightSum > 0
        ? Math.round(computedRows.reduce((sum, p) => sum + p.progressPct * (p.budgetTotal || 1), 0) / weightSum)
        : 0;
    return { pct, count: computedRows.length };
  }, [computedRows]);

  const [draft, setDraft] = useState<{
    code: string;
    name: string;
    owner: string;
    startDate: string;
    endDate: string;
    budgetTotal: string;
  }>({
    code: "",
    name: "",
    owner: "",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "",
    budgetTotal: "0",
  });

  const canCreate = useMemo(() => {
    const budget = Number(draft.budgetTotal);
    return Boolean(draft.code.trim()) && Boolean(draft.name.trim()) && Boolean(draft.owner.trim()) && budget >= 0;
  }, [draft.budgetTotal, draft.code, draft.name, draft.owner]);

  const addProject = () => {
    if (!canCreate) return;
    const budgetPlanTotal = Number(draft.budgetTotal) || 0;
    actions.createProject({
      code: draft.code,
      name: draft.name,
      owner: draft.owner,
      startDate: draft.startDate,
      endDate: draft.endDate || "",
      budgetPlanTotal,
    });
    setDraft((prev) => ({ ...prev, code: "", name: "", owner: "", budgetTotal: "0" }));
  };

  const updateProjectProgress = (id: string, progressPct: number) => {
    actions.updateProject(id, { progressPct: clampPct(progressPct) });
  };

  const updateProjectStatus = (id: string, status: ProjectStatus) => {
    actions.updateProject(id, { status });
  };

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>Project</h2>
          <div className="muted">Template manajemen project dan progress.</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="label">Overall progress (filter)</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{overall.pct}%</div>
        </div>
      </div>

      <div className="progress" style={{ marginTop: 10 }}>
        <div className="progressFill" style={{ width: `${overall.pct}%` }} />
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="label">Tambah Project (template)</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 12, marginTop: 10 }}>
          <div style={{ gridColumn: "span 2" }}>
            <div className="label">Kode</div>
            <input className="input" value={draft.code} onChange={(e) => setDraft((p) => ({ ...p, code: e.target.value }))} />
          </div>
          <div style={{ gridColumn: "span 4" }}>
            <div className="label">Nama</div>
            <input className="input" value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} />
          </div>
          <div style={{ gridColumn: "span 2" }}>
            <div className="label">Owner</div>
            <input className="input" value={draft.owner} onChange={(e) => setDraft((p) => ({ ...p, owner: e.target.value }))} />
          </div>
          <div style={{ gridColumn: "span 2" }}>
            <div className="label">Mulai</div>
            <input className="input" type="date" value={draft.startDate} onChange={(e) => setDraft((p) => ({ ...p, startDate: e.target.value }))} />
          </div>
          <div style={{ gridColumn: "span 2" }}>
            <div className="label">Selesai</div>
            <input className="input" type="date" value={draft.endDate} onChange={(e) => setDraft((p) => ({ ...p, endDate: e.target.value }))} />
          </div>
          <div style={{ gridColumn: "span 3" }}>
            <div className="label">Budget Total</div>
            <input
              className="input"
              value={draft.budgetTotal}
              onChange={(e) => setDraft((p) => ({ ...p, budgetTotal: e.target.value }))}
            />
          </div>
          <div style={{ gridColumn: "span 9", display: "flex", justifyContent: "flex-end", alignItems: "end" }}>
            <button className="btn primary" disabled={!canCreate} onClick={addProject}>
              Tambah
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="label">Filter</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 12, marginTop: 10 }}>
          <div style={{ gridColumn: "span 3" }}>
            <div className="label">Status</div>
            <select
              className="input"
              value={filters.status}
              onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value as "" | ProjectStatus }))}
            >
              <option value="">Semua</option>
              <option value="PLANNING">PLANNING</option>
              <option value="RUNNING">RUNNING</option>
              <option value="DONE">DONE</option>
              <option value="ON_HOLD">ON_HOLD</option>
            </select>
          </div>
          <div style={{ gridColumn: "span 9" }}>
            <div className="label">Cari</div>
            <input
              className="input"
              value={filters.search}
              onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
              placeholder="kode / nama / owner"
            />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div className="label">Daftar Project (template)</div>
          <div className="muted" style={{ fontSize: 12 }}>
            {overall.count} project (filter aktif)
          </div>
        </div>

        <div className="table" style={{ marginTop: 10 }}>
          <div className="tableRow tableHeader" style={{ gridTemplateColumns: "1.6fr 0.8fr 0.8fr 1fr 0.8fr" }}>
            <div>Project</div>
            <div>Status</div>
            <div style={{ textAlign: "right" }}>Progress</div>
            <div style={{ textAlign: "right" }}>Budget</div>
            <div style={{ textAlign: "right" }}>Update</div>
          </div>
          {computedRows.map((p) => {
            const usedPct = p.budgetTotal > 0 ? Math.round((p.budgetUsed / p.budgetTotal) * 100) : 0;
            return (
              <div key={p.id} className="tableRow" style={{ gridTemplateColumns: "1.6fr 0.8fr 0.8fr 1fr 0.8fr" }}>
                <div>
                  <div style={{ fontWeight: 700 }}>
                    <Link to={`/projects/${p.id}`}>{p.code} — {p.name}</Link>
                  </div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                    Owner: {p.owner} • {p.startDate}
                    {p.endDate ? ` → ${p.endDate}` : ""}
                  </div>
                </div>

                <div>
                  <select className="input" value={p.status} onChange={(e) => updateProjectStatus(p.id, e.target.value as ProjectStatus)}>
                    <option value="PLANNING">PLANNING</option>
                    <option value="RUNNING">RUNNING</option>
                    <option value="DONE">DONE</option>
                    <option value="ON_HOLD">ON_HOLD</option>
                  </select>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 700 }}>{p.progressPct}%</div>
                  <div className="progress" style={{ marginTop: 8 }}>
                    <div className="progressFill" style={{ width: `${p.progressPct}%` }} />
                  </div>
                  <input
                    className="input"
                    style={{ marginTop: 10, textAlign: "right" }}
                    value={String(p.progressPct)}
                    onChange={(e) => updateProjectProgress(p.id, Number(e.target.value))}
                  />
                </div>

                <div style={{ textAlign: "right" }}>
                  <div>{formatIdr(p.budgetTotal)}</div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                    Terpakai {formatIdr(p.budgetUsed)} ({usedPct}%)
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div className="muted">{p.updatedAt}</div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 ? (
            <div className="tableRow" style={{ gridTemplateColumns: "1fr" }}>
              <div className="muted">Tidak ada project (sesuai filter)</div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
